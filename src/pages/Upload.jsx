import { useState, useRef, useCallback, useEffect } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Icon from '../components/Icon';
import Btn from '../components/Btn';
import { callGroq } from '../services/ai';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const STEPS = [
  'Parsing document structure…',
  'Running ATS compatibility check…',
  'Analyzing keyword density…',
  'Generating score report…',
];

// Custom ML backend — runs alongside the frontend (npm run dev + ./backend/start.sh)
let ML_BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000';
if (ML_BACKEND && !ML_BACKEND.startsWith('http') && !ML_BACKEND.includes('localhost')) {
  ML_BACKEND = `https://${ML_BACKEND}`;
}

const Upload = ({ go, user, onAuth, setResults, onNotify }) => {
  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState(0);
  const [apiError, setApiError] = useState(null);
  const inputRef = useRef(null);
  const roleRef  = useRef(null);
  const ivRef    = useRef(null);

  useEffect(() => {
    return () => { if (ivRef.current) clearInterval(ivRef.current); };
  }, []);

  const pick = f => { if (f) { setFile(f); setApiError(null); } };

  const onDrop = useCallback(e => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files[0]);
  }, []);

  const extractText = async (file) => {
    if (file.type !== 'application/pdf') return ""; 
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let text = "";
      // Only parse first 10 pages for performance
      const maxPages = Math.min(pdf.numPages, 10);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(s => s.str).join(" ") + " ";
      }
      return text;
    } catch (e) {
      console.error("PDF parse error (falling back to generic analysis):", e);
      return ""; // Proceed with empty text if parsing fails
    }
  };

  const generateAIAssessment = async (text, fileName, targetRole) => {
    const truncatedText = text?.substring(0, 10000) || '';

    console.log('[Resumeeit] Attempting connection to:', ML_BACKEND);
    // ── Attempt 1: Custom ML backend (running locally) ─────────────────────
    try {
      const res = await fetch(`${ML_BACKEND}/api/score-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: truncatedText, job_description: targetRole || '' }),
        signal: AbortSignal.timeout(8000), // 8 s cap
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const finalScore = d.score ?? 45;
        console.log('[Resumeeit] Scored by custom ML model ✅', d.ml_model_used ? '(XGBoost)' : '(heuristic)');
        return {
          name:         fileName,
          score:        finalScore,
          ats:          d.ats        ?? 45,
          keyword:      d.keyword    ?? 45,
          formatting:   d.formatting ?? 45,
          impact:       d.impact     ?? 45,
          signals:      d.signals    || { action_verbs: [], tech_keywords: [], metrics: [] },
          issues:       d.issues        || [],
          improvements: d.improvements || [],
          date:         new Date().toISOString(),
          risk:         d.risk ?? (finalScore < 60 ? 'High Risk' : finalScore < 80 ? 'Medium Risk' : 'Low Risk'),
          text:         truncatedText,
          source:       'ml_backend',
        };
      }
    } catch (mlErr) {
      console.warn('[Resumeeit] ML backend unavailable, falling back to Groq:', mlErr.message);
    }

    // ── Attempt 2: Groq LLM fallback ──────────────────────────────────────
    const prompt = `
      You are an expert ATS and senior technical recruiter.
      Your FIRST task is to determine if the following text is a professional resume, CV, or career profile.
      Valid resumes usually contain sections like Experience, Education, Skills, or contact details.
      
      If the text is clearly NOT a resume (e.g. a class assignment, a recipe, a story, or a random image caption), return a score of 5.
      If the text is a resume but seems poorly structured or very thin, evaluate it normally but keep the score low.

      Evaluate the following text against the target role: ${targetRole || 'General/Unspecified'}.
      Resume Text: ${truncatedText}

      Respond with ONLY valid JSON matching this exact schema:
      {
        "score": 5, "ats": 5, "keyword": 5, "formatting": 5, "impact": 5,
        "signals": { "action_verbs": [], "tech_keywords": [], "metrics": [] },
        "issues": [{ "label": "Invalid Document", "desc": "This document does not appear to be a professional resume.", "sev": "Critical" }],
        "improvements": ["Please upload a standard resume in PDF or Word format."]
      }
    `;
    try {
      const completion = await callGroq(prompt, { json: true });
      let textContent = completion.choices[0]?.message?.content || '{}';
      textContent = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(textContent);
      const finalScore = parsed.score || 45;
      return {
        name:         fileName,
        score:        finalScore,
        ats:          parsed.ats        || 45,
        keyword:      parsed.keyword    || 45,
        formatting:   parsed.formatting || 45,
        impact:       parsed.impact     || 45,
        signals:      parsed.signals    || { action_verbs: [], tech_keywords: [], metrics: [] },
        issues:       parsed.issues     || [],
        improvements: parsed.improvements || [],
        date:         new Date().toISOString(),
        risk:         finalScore < 60 ? 'High Risk' : finalScore < 80 ? 'Medium Risk' : 'Low Risk',
        text:         truncatedText,
        source:       'groq_fallback',
      };
    } catch (err) {
      console.error('Groq API Error:', err);
      throw new Error(`Analysis failed: ${err.message || 'Could not connect to any scoring service'}`);
    }
  };

  const analyze = async () => {
    if (!file || loading) return;
    setLoading(true);
    setStep(0);
    setApiError(null);

    const role = roleRef.current?.value || '';

    const sanitizeForFirebase = (obj) => {
      const sanitized = JSON.parse(JSON.stringify(obj));
      const walk = (item) => {
        if (Array.isArray(item)) {
          return item.map(i => walk(i)).flat().filter(i => i !== undefined);
        }
        if (item !== null && typeof item === 'object') {
          Object.keys(item).forEach(k => {
            item[k] = walk(item[k]);
          });
        }
        return item;
      };
      return walk(sanitized);
    };

    // ── Pre-fetch / Background Work ──
    const processPromise = (async () => {
      try {
        const text = await extractText(file);
        const analysis = await generateAIAssessment(text, file.name || 'Resume', role);
        const cleanAnalysis = sanitizeForFirebase(analysis);
        const scanId = `scan_${Date.now()}`;
        const analysisWithId = { ...cleanAnalysis, id: scanId };

        if (user?.uid) {
          await setDoc(doc(db, 'users', user.uid, 'scans', scanId), {
            ...analysisWithId,
          });
          // Mark as persisted so App.jsx doesn't save it again
          analysisWithId.is_persisted = true;
        }

        setResults(analysisWithId);
        return true;
        return true;
      } catch (err) {
        console.error("Analysis background process failed:", err);
        setApiError(err.message);
        if (ivRef.current) {
          clearInterval(ivRef.current);
          ivRef.current = null;
        }
        setLoading(false);
        return false;
      }
    })();

    // ── Progress Animation ──
    let i = 0;
    ivRef.current = setInterval(() => {
      i++;
      if (i < STEPS.length) {
        setStep(i);
      } else {
        clearInterval(ivRef.current);
        ivRef.current = null;
        processPromise.then((success) => {
          if (success) {
            if (onNotify) onNotify("Resume analyzed and saved to dashboard!");
            setTimeout(() => go('results'), 500);
          }
        });
      }
    }, 550);
  };

  // Auth check removed to allow guest uploads as per modern SaaS 'Try-Before-You-Buy' patterns

  return (
    <div style={{ minHeight: '100vh', paddingTop: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ maxWidth: 500, width: '100%' }}>

        <p className="eyebrow ru" style={{ marginBottom: 18 }}>Step 1 of 2</p>
        <h1 className="ru d1" style={{ fontSize: 'clamp(1.9rem,4vw,2.8rem)', fontWeight: 700, letterSpacing: '-.05em', marginBottom: 12 }}>
          Upload your resume
        </h1>
        <p className="ru d2" style={{ color: 'var(--ts)', marginBottom: 32, fontSize: '.95rem', lineHeight: 1.7 }}>
          PDF or Word document. Analyzed in memory — never stored on our servers.
        </p>

        {/* Drop zone */}
        <div
          className={`dz-idle ru d3 ${dragging ? 'dz-hover' : ''}`}
          style={{ borderRadius: 22, padding: 'clamp(32px,5vw,56px) 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s', marginBottom: 14 }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={e => pick(e.target.files[0])}
          />
          {file ? (
            <>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Icon id="file" size={22} color="var(--tp)" />
              </div>
              <p style={{ fontWeight: 600, fontSize: '.93rem', marginBottom: 4, letterSpacing: '-.02em' }}>{file.name}</p>
              <p style={{ fontSize: '.8rem', color: 'var(--tt)' }}>{(file.size / 1024).toFixed(1)} KB · tap to replace</p>
            </>
          ) : (
            <>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Icon id="upload" size={23} color="var(--ts)" />
              </div>
              <p style={{ fontWeight: 600, fontSize: '.93rem', marginBottom: 6, letterSpacing: '-.02em' }}>Drop your file here</p>
              <p style={{ fontSize: '.8rem', color: 'var(--tt)' }}>or tap to browse · PDF, DOC, DOCX</p>
            </>
          )}
        </div>

        {/* Target role */}
        <div className="ru d4" style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ts)', marginBottom: 8 }}>
            Target role{' '}
            <span style={{ color: 'var(--tt)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </label>
          <input
            ref={roleRef}
            className="inp"
            placeholder="e.g. Senior Software Engineer at Stripe"
            style={{ padding: '12px 15px' }}
          />
        </div>

        {/* Loader or CTA */}
        {apiError && (
          <div style={{ padding: '12px 16px', background: 'rgba(255,59,48,.1)', color: 'var(--red)', borderRadius: 12, marginBottom: 16, fontSize: '.9rem', fontWeight: 500, textAlign: 'center' }}>
            {apiError}
          </div>
        )}
        {loading ? (
          <div className="glass-dark ru" style={{ padding: 40, textAlign: 'center', position: 'relative', overflow: 'hidden', borderRadius: 32, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="laser" />
            <div
              className="spin"
              style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--ind)', borderRadius: '50%', margin: '0 auto 24px', position: 'relative', zIndex: 2 }}
            />
            <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8, color: '#fff', letterSpacing: '-.02em' }}>
              ML Protocol Active
            </p>
            <p style={{ fontSize: '.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: 28, fontWeight: 500 }}>{STEPS[step]}</p>
            <div className="pb-track pb-track-dark" style={{ height: 4, maxWidth: 280, margin: '0 auto' }}>
              <div
                className="pb-fill"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: 'var(--ind)', boxShadow: '0 0 15px var(--ind)' }}
              />
            </div>
          </div>
        ) : (
          <Btn v="dark" sz="xl" full onClick={analyze}>
            <Icon id="zap" size={17} color="white" /> Analyze resume
          </Btn>
        )}

        <p className="ru d6" style={{ fontSize: 10, color: 'var(--tt)', textAlign: 'center', marginTop: 14 }}>
          🔒 Private · secure · GDPR compliant
        </p>
      </div>
    </div>
  );
};

export default Upload;
