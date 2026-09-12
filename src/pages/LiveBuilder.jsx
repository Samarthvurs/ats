import { useState, useEffect } from 'react';
import { callGroq, cleanJsonResponse } from '../services/ai';
import Icon from '../components/Icon';
import Btn from '../components/Btn';
import Badge from '../components/Badge';
import ProgressRow from '../components/ProgressRow';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, getDocs } from 'firebase/firestore';
import jsPDF from 'jspdf';

const LiveBuilder = ({ go, user, onDataChange }) => {
  const [data, setData] = useState(null);
  const [loadingExtract, setLoadingExtract] = useState(true);

  const [activeLayer, setActiveLayer] = useState('personal');
  const [viewMode, setViewMode] = useState('editor'); // 'editor' or 'preview'
  const [template, setTemplate] = useState('classic');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showATS, setShowATS] = useState(false);
  const [jdBuffer, setJdBuffer] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [lastAuditData, setLastAuditData] = useState('');

  // Sync data up to App.jsx whenever it changes so Portfolio Maker stays in sync
  useEffect(() => {
    if (data && onDataChange) onDataChange(data);
  }, [data]);

  useEffect(() => {
    if (!user) return;
    const fetchAndParse = async () => {
      try {
        const q = query(collection(db, 'users', user.uid, 'scans'), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        const blankGen = { name: '', title: '', email: '', location: '', linkedin: '', github: '', summary: '', skills: '', experience: [], projects: [], education: [] };
        
        if (snap.empty) {
          setData(blankGen);
          setLoadingExtract(false);
          return;
        }
        
        const latest = snap.docs[0].data();
        const rawText = latest.text;
        
        if (!rawText) {
          setData(blankGen);
          setLoadingExtract(false);
          return;
        }

        const prompt = `You are an expert ATS resume parser. I will provide raw text extracted from a PDF. Extract and format the user's details perfectly into the exact JSON structure below.
        Rewrite all experience bullet points to be highly professional, ATS-friendly, and impact-driven using strong verbs. Limit descriptions to 1-2 concise sentences per entry.

        JSON Schema:
        {
          "name": "Full Name",
          "title": "Professional Title (e.g. Frontend Engineer)",
          "email": "string",
          "location": "City, Country",
          "linkedin": "linkedin.com/in/...",
          "github": "github.com/...",
          "summary": "1-2 sentence professional summary...",
          "skills": "Skill1 | Skill2 | Skill3 (joined by pipes)",
          "experience": [
            { "id": 1, "role": "string", "company": "string", "period": "Month Year - Month Year", "desc": "Action-oriented bullet points" }
          ],
          "projects": [
            { "id": 1, "title": "string", "tech": "React, Node", "desc": "Project description" }
          ],
          "education": [
            { "id": 1, "school": "string", "degree": "string", "year": "YYYY", "grade": "string (e.g. 3.8 CGPA or 85%)" }
          ]
        }
        
        Raw Resume Text:
        """\n${rawText.substring(0, 4000)}\n"""
        
        Return ONLY valid JSON.`;

        const completion = await callGroq(prompt, { json: true });

        let parsed;
        const textContent = completion.choices[0]?.message?.content || "{}";
        parsed = cleanJsonResponse(textContent) || blankGen;
        
        setData({
          name: parsed.name || '',
          title: parsed.title || '',
          email: parsed.email || '',
          location: parsed.location || '',
          linkedin: parsed.linkedin || '',
          github: parsed.github || '',
          summary: parsed.summary || '',
          skills: parsed.skills || '',
          experience: Array.isArray(parsed.experience) ? parsed.experience.map((e,i) => ({...e, id: e.id || i+1})) : [],
          projects: Array.isArray(parsed.projects) ? parsed.projects.map((p,i) => ({...p, id: p.id || i+1})) : [],
          education: Array.isArray(parsed.education) ? parsed.education.map((e,i) => ({...e, id: e.id || i+1})) : []
        });
      } catch (err) {
        console.error("Extraction error:", err);
        setData({ name: '', title: '', email: '', location: '', linkedin: '', github: '', summary: '', skills: '', experience: [], projects: [], education: [] });
      }
      setLoadingExtract(false);
    };
    fetchAndParse();
  }, [user]);

  const update = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const updateItem = (listKey, id, key, val) => {
    setData(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(item => item.id === id ? { ...item, [key]: val } : item)
    }));
  };

  const addItem = (listKey, schema) => {
    const newItem = { id: Date.now(), ...schema };
    update(listKey, [...data[listKey], newItem]);
  };

  const removeItem = (listKey, id) => {
    update(listKey, data[listKey].filter(item => item.id !== id));
  };

  const moveItem = (listKey, index, direction) => {
    const newList = [...data[listKey]];
    const target = index + direction;
    if (target < 0 || target >= newList.length) return;
    [newList[index], newList[target]] = [newList[target], newList[index]];
    update(listKey, newList);
  };

  const improveBullet = async (type, id, currentText) => {
    if (!currentText.trim() || loadingAI) return;
    setLoadingAI(true);
    try {
      const prompt = `Rewrite the following resume textual bullet point to make it highly professional, impact-driven, and ATS-friendly. Use strong action verbs and metrics if possible. Limit to one sentence.
      Original Text: "${currentText}"`;
      const completion = await callGroq(prompt, { temperature: 0 });


      const improved = completion.choices[0]?.message?.content?.replace(/^"|"$|^\*|\*$/g, '').trim() || currentText;

      if (type === 'exp') {
        update('experience', data.experience.map(e => e.id === id ? { ...e, desc: improved } : e));
      } else if (type === 'proj') {
        update('projects', data.projects.map(p => p.id === id ? { ...p, desc: improved } : p));
      } else {
        update('summary', improved);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to Groq AI");
    }
    setLoadingAI(false);
  };

  const autoOptimize = async () => {
    if (!jdBuffer.trim() || loadingAI) return;
    setLoadingAI(true);
    try {
      const prompt = `Extract top 6 critical technical hard skills from this Job or Internship Description. Return them strictly as a comma-separated list. Nothing else.
      JD / Internship Description: "${jdBuffer}"`;
      const completion = await callGroq(prompt);

      const extracted = completion.choices[0]?.message?.content?.split(',').map(s => s.trim()) || [];
      if (extracted.length > 0) {
         const current = data.skills.split('|').map(s => s.trim());
         const missing = extracted.filter(s => !!s && !current.some(c => c.toLowerCase() === s.toLowerCase()));
         if (missing.length > 0) {
           update('skills', [...current, ...missing].join(' | '));
         }
      }
      setJdBuffer('');
    } catch (err) {
      console.error(err);
      alert("Failed to connect to Groq AI");
    }
    setLoadingAI(false);
  };

  const strategicOverhaul = async () => {
    if (!jdBuffer.trim() || loadingAI) return;
    setLoadingAI(true);
    try {
      const prompt = `You are a world-class career strategist. I will provide a user's current resume data and a target Job Description. 
      Your mission is to REWRITE and RESTRUCTURE the entire resume JSON to perfectly align with this specific role.
      
      CRITICAL INSTRUCTIONS:
      1. Every experience bullet point MUST be rewritten to highlight relevant skills from the JD using the STAR method.
      2. Include specific metrics and strong action verbs.
      3. The summary must be a high-impact "hook" for this role.
      4. Do NOT hallucinate data; only restructure and refine existing information.
      
      Current Resume JSON: ${JSON.stringify(data)}
      Target JD: "${jdBuffer}"
      
      Return ONLY the updated JSON in the EXACT same schema.`;
      
      const completion = await callGroq(prompt, { json: true, temperature: 0 });
      const overhauled = cleanJsonResponse(completion.choices[0]?.message?.content);
      
      if (overhauled) {
        setData(overhauled);
        alert("Strategic Alignment Complete! 🚀 Your resume has been overhauled for this role.");
        setJdBuffer('');
        setActiveLayer('experience');
      }
    } catch (err) {
      console.error(err);
      alert("Strategic Overhaul failed. Please try a shorter JD.");
    }
    setLoadingAI(false);
  };

  const runNeuralAudit = async () => {
    if (loadingAudit) return;
    const currentDataStr = JSON.stringify(data);
    if (currentDataStr === lastAuditData) return; // Skip if no changes

    setLoadingAudit(true);
    try {
      const auditPrompt = `Analyze this resume JSON for a high-priority ATS audit. 
      Provide accurate scores and categorical reasoning. 
      JSON Data: ${currentDataStr}
      
      Return JSON Schema:
      {
        "atsScore": 0-100,
        "impactScore": 0-100,
        "keywordScore": 0-100,
        "rejectionProb": 0-100,
        "reasoning": [
          {"type": "ATS Formatting", "score": 80, "note": "Reason..."},
          {"type": "Impact", "score": 70, "note": "Reason..."},
          {"type": "Keywords", "score": 60, "note": "Reason..."}
        ],
        "riskLevel": "Low | Moderate | High",
        "verdict": "Market Ready | Specific Fixes Needed | Structural Gap"
      }`;

      const completion = await callGroq(auditPrompt, { json: true, temperature: 0 });
      const result = cleanJsonResponse(completion.choices[0]?.message?.content);
      if (result) {
        setAuditData(result);
        setLastAuditData(currentDataStr);
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingAudit(false);
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      const checkPage = (h) => {
        if (y + h > 280) { doc.addPage(); y = 20; }
      };

      const sectionHeader = (txt) => {
        checkPage(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(txt.toUpperCase(), margin, y);
        y += 2;
        doc.setLineWidth(0.4);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
      };

      // Header Centered
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      const nameText = (data.name || "").toUpperCase();
      doc.text(nameText, pageWidth / 2, y, { align: 'center' });
      y += 10; // Separation from name to contact info
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90, 90, 90);
      
      const email = data.email || "";
      const linkedin = data.linkedin || "";
      const github = data.github || "";
      const loc = data.location || "";
      
      const parts = [
        { text: loc, type: 'text' },
        { text: email, type: 'link', url: `mailto:${email}` },
        { text: linkedin, type: 'link', url: linkedin.startsWith('http') ? linkedin : `https://${linkedin}` },
        { text: github, type: 'link', url: github.startsWith('http') ? github : `https://${github}` }
      ].filter(p => p.text);

      let currentX = pageWidth / 2 - (parts.map(p => doc.getTextWidth(p.text)).reduce((a,b) => a+b, 0) + (parts.length - 1) * 4) / 2;
      
      parts.forEach((p, i) => {
        const w = doc.getTextWidth(p.text);
        if (p.type === 'link') {
          doc.setTextColor(0, 102, 204); // subtle link blue
          doc.text(p.text, currentX, y);
          doc.link(currentX, y - 3, w, 5, { url: p.url });
        } else {
          doc.setTextColor(90, 90, 90);
          doc.text(p.text, currentX, y);
        }
        currentX += w;
        if (i < parts.length - 1) {
          doc.setTextColor(90, 90, 90);
          doc.text(' | ', currentX, y);
          currentX += doc.getTextWidth(' | ');
        }
      });

      doc.setTextColor(0, 0, 0);
      y += 14;

      // Education (At the top)
      if (data.education && data.education.length > 0) {
        sectionHeader("Education");
        data.education.forEach(edu => {
          checkPage(15);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          const schoolLines = doc.splitTextToSize(edu.school || "", pageWidth - (margin * 2) - 30);
          doc.text(edu.year || "", pageWidth - margin, y, { align: 'right' });
          schoolLines.forEach(line => {
            doc.text(line, margin, y);
            y += 4.5;
          });
          y += 0.5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          let degTxt = edu.degree || "";
          if (edu.grade) degTxt += ` | ${edu.grade}`;
          const degLines = doc.splitTextToSize(degTxt, pageWidth - (margin * 2));
          degLines.forEach(line => {
             doc.text(line, margin, y);
             y += 4.5;
          });
          y += 3.5;
        });
        y += 2;
      }

      // Summary
      if (data.summary) {
        sectionHeader("Summary");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        const sLines = doc.splitTextToSize(data.summary, pageWidth - (margin * 2));
        sLines.forEach(line => {
          checkPage(6);
          doc.text(line, margin, y);
          y += 4.5;
        });
        y += 6;
      }

      // Experience
      if (data.experience && data.experience.length > 0) {
        sectionHeader("Experience");
        data.experience.forEach(exp => {
          checkPage(20);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          const roleLines = doc.splitTextToSize(`${exp.company || ""} — ${exp.role || ""}`, pageWidth - (margin * 2) - 35);
          doc.text(exp.period || "", pageWidth - margin, y, { align: 'right' });
          roleLines.forEach(line => {
            doc.text(line, margin, y);
            y += 4.5;
          });
          y += 0.5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          const lines = doc.splitTextToSize(exp.desc || "", pageWidth - (margin * 2) - 4);
          lines.forEach(line => {
            checkPage(6);
            doc.text("• " + line, margin + 4, y);
            y += 4.5;
          });
          y += 4;
        });
      }

      // Projects
      if (data.projects && data.projects.length > 0) {
        sectionHeader("Projects");
        data.projects.forEach(p => {
          checkPage(15);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          const pHeadLines = doc.splitTextToSize(`${p.title || ""} | ${p.tech || ""}`, pageWidth - (margin * 2));
          pHeadLines.forEach(line => {
            checkPage(6);
            doc.text(line, margin, y);
            y += 4.5;
          });
          y += 0.5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          const pLines = doc.splitTextToSize(p.desc || "", pageWidth - (margin * 2) - 4);
          pLines.forEach(line => {
            checkPage(6);
            doc.text("• " + line, margin + 4, y);
            y += 4.5;
          });
          y += 4;
        });
      }

      // Skills
      if (data.skills) {
         sectionHeader("Skills");
         doc.setFont("helvetica", "normal");
         doc.setFontSize(9.5);
         const skLines = doc.splitTextToSize(data.skills, pageWidth - (margin * 2));
         skLines.forEach(line => {
           checkPage(6);
           doc.text(line, margin, y);
           y += 4.5;
         });
         y += 6;
      }

      doc.save(`${(data.name || "Resume").replace(/\s+/g, '_')}_Elite_Resume.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("Failed to export PDF.");
    }
  };

  if (loadingExtract || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--s1)', alignItems: 'center', justifyContent: 'center', paddingTop: 52 }}>
         <div className="spin" style={{ width: 40, height: 40, border: '3px solid var(--s2)', borderTopColor: 'var(--near-black)', borderRadius: '50%', marginBottom: 20 }} />
         <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-.03em', marginBottom: 6 }}>Booting Expert Builder</h2>
         <p style={{ color: 'var(--ts)', fontSize: '.9rem' }}>Groq AI is restructuring your latest upload to perfect ATS standards...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--s1)', paddingTop: 52 }}>
      
      {/* Mobile Tab Switcher */}
      <div className="hide-desktop" style={{ 
        display: 'flex', 
        background: 'var(--s0)', 
        borderBottom: '.5px solid var(--bl)', 
        padding: '8px 16px',
        gap: 12
      }}>
        <button 
          onClick={() => setViewMode('editor')}
          style={{ 
            flex: 1, 
            padding: '10px', 
            borderRadius: 12, 
            border: 'none',
            background: viewMode === 'editor' ? 'var(--near-black)' : 'var(--s1)',
            color: viewMode === 'editor' ? 'white' : 'var(--tp)',
            fontSize: '.85rem',
            fontWeight: 700,
            transition: 'all .2s'
          }}
        >
          Editor (Questionnaire)
        </button>
        <button 
          onClick={() => setViewMode('preview')}
          style={{ 
            flex: 1, 
            padding: '10px', 
            borderRadius: 12, 
            border: 'none',
            background: viewMode === 'preview' ? 'var(--near-black)' : 'var(--s1)',
            color: viewMode === 'preview' ? 'white' : 'var(--tp)',
            fontSize: '.85rem',
            fontWeight: 700,
            transition: 'all .2s'
          }}
        >
          View Resume
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 1. Left Editor Side */}
        <div className={viewMode === 'preview' ? 'hide-mobile' : ''} style={{ 
          width: window.innerWidth > 860 ? '42%' : '100%', 
          borderRight: '.5px solid var(--bl)', 
          background: 'var(--s0)', 
          overflowY: 'auto', 
          padding: window.innerWidth > 860 ? '32px 40px' : '24px 20px' 
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
           <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.04em' }}>Elite Editor</h1>
           <Btn v="ghost" sz="sm" pill onClick={() => go('dashboard')}>Exit</Btn>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 32, overflowX: 'auto', paddingBottom: 10 }}>
           {['personal', 'experience', 'projects', 'skills', 'education', 'review'].map(l => (
             <Btn key={l} v={activeLayer === l ? 'dark' : 'ghost'} sz="xs" pill onClick={() => setActiveLayer(l)} style={{ whiteSpace: 'nowrap' }}>
               {l.charAt(0).toUpperCase() + l.slice(1)}
             </Btn>
           ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
           {activeLayer === 'personal' && (
             <div className="rf">
               <div className="rb-form-full" style={{ marginBottom: 24 }}>
                  <label className="rb-label">Neural Alignment (Job / Internship Description)</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <textarea className="inp" value={jdBuffer} onChange={e => setJdBuffer(e.target.value)} placeholder="Paste Job or Internship Description here..." style={{ height: 60, fontSize: '.8rem' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <Btn v="ind" sz="xs" pill onClick={autoOptimize} disabled={!jdBuffer.trim() || loadingAI}><Icon id="zap" size={10} color="white" /> Add Skills</Btn>
                      <Btn v="dark" sz="xs" pill onClick={strategicOverhaul} disabled={!jdBuffer.trim() || loadingAI}><Icon id="target" size={10} color="white" /> Strategic Overhaul</Btn>
                    </div>
                  </div>
               </div>
               <div className="rb-form-row">
                 <input className="inp" placeholder="Full Name" value={data.name} onChange={e => update('name', e.target.value)} />
                 <input className="inp" placeholder="Target Role / Internship" value={data.title} onChange={e => update('title', e.target.value)} />
               </div>
               <div className="rb-form-row">
                 <input className="inp" placeholder="Email" value={data.email} onChange={e => update('email', e.target.value)} />
                 <input className="inp" placeholder="Location" value={data.location} onChange={e => update('location', e.target.value)} />
               </div>
               <div className="rb-form-row" style={{ marginTop: 12 }}>
                 <input className="inp" placeholder="LinkedIn URL (linkedin.com/in/...)" value={data.linkedin || ''} onChange={e => update('linkedin', e.target.value)} />
                 <input className="inp" placeholder="GitHub URL (github.com/...)" value={data.github || ''} onChange={e => update('github', e.target.value)} />
               </div>
               <div className="rb-form-full" style={{ marginTop: 12 }}>
                  <label className="rb-label">Executive Summary</label>
                  <div style={{ position: 'relative' }}>
                    <textarea className="inp" style={{ height: 100, lineHeight: 1.6, paddingRight: 40 }} value={data.summary} onChange={e => update('summary', e.target.value)} />
                    <button onClick={() => improveBullet('summary', 0, data.summary)} style={{ position: 'absolute', bottom: 10, right: 10, background: 'var(--ind)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon id="zap" size={12} color="white" /></button>
                  </div>
               </div>
             </div>
           )}

           {activeLayer === 'experience' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <p style={{ fontSize: '.84rem', color: 'var(--ts)' }}>Use the ⚡ button on each entry to AI-rewrite for ATS impact.</p>
                    <Btn v="ind" sz="xs" pill onClick={async () => {
                      if (loadingAI || data.experience.length === 0) return;
                      setLoadingAI(true);
                      try {
                        const improved = await Promise.all(data.experience.map(async (exp) => {
                          if (!exp.desc) return exp;
                          const c = await callGroq(`Rewrite this resume bullet as a single impact-driven, ATS-optimized sentence using strong action verbs and metrics. Original: "${exp.desc}"`);
                          return { ...exp, desc: c.choices[0]?.message?.content?.replace(/^"|"$|^\*|\*$/g, '').trim() || exp.desc };
                        }));
                        update('experience', improved);
                      } catch(e) { console.error(e); }
                      setLoadingAI(false);
                    }} disabled={loadingAI}>
                    {loadingAI ? '...' : <><Icon id="zap" size={10} color="white" /> Optimize All</>}
                  </Btn>
                </div>
                {data.experience.map((exp, i) => (
                  <div key={exp.id ?? i} className="rb-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                       <Badge type="amber">Position #{i+1}</Badge>
                       <div onClick={() => removeItem('experience', exp.id)} style={{ cursor: 'pointer', color: 'var(--red)' }}><Icon id="x" size={12} /></div>
                    </div>
                    <div className="rb-form-row">
                       <input className="inp" placeholder="Role / Title" value={exp.role || ''} onChange={e => updateItem('experience', exp.id, 'role', e.target.value)} />
                       <input className="inp" placeholder="Company" value={exp.company || ''} onChange={e => updateItem('experience', exp.id, 'company', e.target.value)} />
                    </div>
                    <div className="rb-form-row" style={{ marginTop: 12 }}>
                       <input className="inp" placeholder="Period (e.g. Jan 2022 – Present)" value={exp.period || ''} onChange={e => updateItem('experience', exp.id, 'period', e.target.value)} />
                    </div>
                    <div style={{ position: 'relative', marginTop: 12 }}>
                       <textarea className="inp" placeholder="Impact-driven description..." style={{ height: 100, fontSize: '.84rem', lineHeight: 1.6, paddingRight: 40 }} value={exp.desc || ''} onChange={e => updateItem('experience', exp.id, 'desc', e.target.value)} />
                       <button onClick={() => improveBullet('exp', exp.id, exp.desc || '')} style={{ position: 'absolute', bottom: 10, right: 10, background: loadingAI ? 'var(--s2)' : 'var(--ind)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon id="zap" size={12} color="white" /></button>
                    </div>
                    {(exp.desc || '').length > 10 && !(exp.desc || '').match(/\d+/) && (
                      <div className="rf" style={{ fontSize: '.72rem', color: 'var(--amber)', fontWeight: 700, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><Icon id="star" size={10} /> Pro-tip: Add a metric (e.g. 40%) to lift your ATS Impact score.</div>
                    )}
                  </div>
                ))}
                <Btn v="ghost" sz="sm" pill onClick={() => addItem('experience', { role: '', company: '', period: '', desc: '' })}>+ Add Experience</Btn>
             </div>
           )}

           {activeLayer === 'projects' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {data.projects.map((p, i) => (
                  <div key={p.id} className="rb-card" style={{ padding: 20 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Badge type="green">Project #{i+1}</Badge>
                        <div onClick={() => removeItem('projects', p.id)} style={{ cursor: 'pointer', color: 'var(--red)' }}><Icon id="x" size={12} /></div>
                     </div>
                     <div className="rb-form-row">
                       <input className="inp" placeholder="Name" value={p.title} onChange={e => updateItem('projects', p.id, 'title', e.target.value)} />
                       <input className="inp" placeholder="Stack" value={p.tech} onChange={e => updateItem('projects', p.id, 'tech', e.target.value)} />
                     </div>
                     <div style={{ position: 'relative', marginTop: 12 }}>
                        <textarea className="inp" placeholder="Project impact..." style={{ height: 80, fontSize: '.8rem', paddingRight: 40 }} value={p.desc} onChange={e => updateItem('projects', p.id, 'desc', e.target.value)} />
                        <button onClick={() => improveBullet('proj', p.id, p.desc)} style={{ position: 'absolute', bottom: 10, right: 10, background: 'var(--ind)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon id="zap" size={12} color="white" /></button>
                     </div>
                  </div>
                ))}
                <Btn v="ghost" sz="sm" pill onClick={() => addItem('projects', { title: '', tech: '', desc: '' })}>+ Add Project</Btn>
             </div>
           )}

           {activeLayer === 'skills' && (
             <div className="rb-card" style={{ padding: 20 }}>
                <textarea className="inp" placeholder="React | Node | Python..." style={{ height: 120 }} value={data.skills} onChange={e => update('skills', e.target.value)} />
             </div>
           )}

           {activeLayer === 'education' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                 {data.education.map((edu, i) => (
                   <div key={edu.id} className="rb-card" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                         <Badge type="dim">Education #{i+1}</Badge>
                         <div onClick={() => removeItem('education', edu.id)} style={{ cursor: 'pointer', color: 'var(--red)' }}><Icon id="x" size={12} /></div>
                      </div>
                      <div className="rb-form-row">
                        <input className="inp" placeholder="School/University" value={edu.school} onChange={e => updateItem('education', edu.id, 'school', e.target.value)} />
                      </div>
                      <div className="rb-form-row" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                         <label style={{ fontSize: 10, color: 'var(--ts)', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                           Start Date
                           <input type="month" className="inp" style={{ width: '100%' }} value={edu.startDate || ''} onChange={e => {
                             const s = e.target.value;
                             const eD = edu.endDate || '';
                             const curr = edu.current || false;
                             const formatMY = v => { if (!v) return ''; const [y, m] = v.split('-'); return new Date(y, parseInt(m)-1).toLocaleDateString('en-US', {month: 'short', year: 'numeric'}); };
                             const str = (formatMY(s) + (formatMY(s) && (curr || formatMY(eD)) ? ' - ' : '') + (curr ? 'Present' : formatMY(eD)));
                             const newEdu = [...data.education]; const x = newEdu.find(a => a.id === edu.id); 
                             if (x) { x.startDate = s; x.year = str; update('education', newEdu); }
                           }} />
                         </label>
                         <label style={{ fontSize: 10, color: 'var(--ts)', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                           End Date
                           <input type="month" className="inp" style={{ width: '100%', opacity: edu.current ? 0.3 : 1 }} disabled={edu.current} value={edu.endDate || ''} onChange={e => {
                             const s = edu.startDate || '';
                             const eD = e.target.value;
                             const curr = edu.current || false;
                             const formatMY = v => { if (!v) return ''; const [y, m] = v.split('-'); return new Date(y, parseInt(m)-1).toLocaleDateString('en-US', {month: 'short', year: 'numeric'}); };
                             const str = (formatMY(s) + (formatMY(s) && (curr || formatMY(eD)) ? ' - ' : '') + (curr ? 'Present' : formatMY(eD)));
                             const newEdu = [...data.education]; const x = newEdu.find(a => a.id === edu.id); 
                             if (x) { x.endDate = eD; x.year = str; update('education', newEdu); }
                           }} />
                         </label>
                         <label style={{ fontSize: 10, color: 'var(--ts)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}>
                           <input type="checkbox" checked={edu.current || false} onChange={e => {
                             const s = edu.startDate || '';
                             const eD = edu.endDate || '';
                             const curr = e.target.checked;
                             const formatMY = v => { if (!v) return ''; const [y, m] = v.split('-'); return new Date(y, parseInt(m)-1).toLocaleDateString('en-US', {month: 'short', year: 'numeric'}); };
                             const str = (formatMY(s) + (formatMY(s) && (curr || formatMY(eD)) ? ' - ' : '') + (curr ? 'Present' : formatMY(eD)));
                             const newEdu = [...data.education]; const x = newEdu.find(a => a.id === edu.id); 
                             if (x) { x.current = curr; x.year = str; update('education', newEdu); }
                           }} /> Present
                         </label>
                      </div>
                      <div className="rb-form-row" style={{ marginTop: 12 }}>
                        <input className="inp" placeholder="Degree" value={edu.degree} onChange={e => updateItem('education', edu.id, 'degree', e.target.value)} />
                        <input className="inp" placeholder="CGPA / Percentage" value={edu.grade || ''} onChange={e => updateItem('education', edu.id, 'grade', e.target.value)} />
                      </div>
                   </div>
                 ))}
                 <Btn v="ghost" sz="sm" pill onClick={() => addItem('education', { school: '', degree: '', year: '', grade: '' })}>+ Add Education</Btn>
              </div>
           )}

           {activeLayer === 'review' && (() => {
             const exps = data.experience || [];
             const totalDesc = exps.map(e => e.desc || '').join(' ');
             const hasMetrics = /\d+/.test(totalDesc);
             const hasActionVerbs = /\b(spearheaded|engineered|architected|optimized|orchestrated|launched|led|built|designed|delivered|reduced|increased|improved|drove|managed|developed|automated|scaled|created|deployed)\b/i.test(totalDesc);
             const hasSummary = (data.summary || '').length > 40;
             const hasSkills = (data.skills || '').split('|').filter(s => s.trim()).length >= 4;
             
             // Initial heuristic score
             const atsScore = auditData?.atsScore || Math.min(100, 60 + (hasMetrics ? 12 : 0) + (hasActionVerbs ? 10 : 0) + (hasSummary ? 10 : 0) + (hasSkills ? 8 : 0));
             const impactScore = auditData?.impactScore || Math.min(100, 30 + (hasMetrics ? 40 : 0) + (hasActionVerbs ? 20 : 0) + (exps.length > 1 ? 10 : 0));
             const keywordScore = auditData?.keywordScore || Math.min(95, 60 + data.skills.split('|').filter(s => s.trim()).length * 5);
             const rejectionPct = auditData?.rejectionProb ?? Math.max(5, 100 - Math.round((atsScore + impactScore + keywordScore) / 3));

             return (
               <div className="rf" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div className="card-tint" style={{ padding: 24, borderLeft: `5px solid ${rejectionPct > 40 ? 'var(--red)' : rejectionPct > 20 ? 'var(--amber)' : 'var(--green)'}`, background: rejectionPct > 40 ? 'rgba(255,59,48,.04)' : 'rgba(52,199,89,.04)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                          <h4 style={{ fontSize: '.75rem', fontWeight: 800, textTransform: 'uppercase', color: rejectionPct > 40 ? 'var(--red)' : rejectionPct > 20 ? 'var(--amber)' : 'var(--green)', letterSpacing: '.05em', marginBottom: 4 }}>Neural Analysis Index</h4>
                          <p style={{ fontSize: '.65rem', color: 'var(--ts)', fontWeight: 600 }}>{auditData ? 'High Fidelity Audit Active' : 'Heuristic Scan Active'}</p>
                        </div>
                        <Btn v="ind" sz="xs" pill onClick={runNeuralAudit} disabled={loadingAudit}>
                          {loadingAudit ? 'Auditing...' : <><Icon id="zap" size={10} color="white" /> Run Full AI Audit</>}
                        </Btn>
                     </div>
                     <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: '2.8rem', fontWeight: 950, letterSpacing: '-.06em', color: rejectionPct > 40 ? 'var(--red)' : rejectionPct > 20 ? 'var(--amber)' : 'var(--green)' }}>{rejectionPct}%</span>
                        <span style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--ts)' }}>Rejection Risk</span>
                     </div>
                     <p style={{ fontSize: '.84rem', color: 'var(--ts)', lineHeight: 1.5, fontWeight: 500 }}>
                       {auditData?.verdict || (rejectionPct > 40 ? 'High Risk: Add metrics, action verbs, and a stronger summary to pass ATS filters.' : 'Market Optimized: Your profile is currently aligned with hiring standards.')}
                     </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                     <h4 className="eyebrow">Diagnostic Breakdown</h4>
                     {(auditData?.reasoning || [
                        { type: 'ATS Formatting', score: atsScore, note: atsScore > 80 ? 'Standard structure detected — good.' : 'Improve summary and add more structured content.' },
                        { type: 'Impact Language', score: impactScore, note: impactScore > 70 ? 'Strong action verbs and metrics detected.' : 'Use ⚡ to rewrite bullets with metrics and power verbs.' },
                        { type: 'Keyword Density', score: keywordScore, note: keywordScore > 70 ? 'Sufficient skills detected.' : 'Add more technical keywords to the Skills section.' }
                     ]).map(res => (
                        <div key={res.type} className="card" style={{ padding: 20, border: '1px solid var(--bl)' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ fontWeight: 800, fontSize: '.9rem' }}>{res.type}</span><span style={{ fontWeight: 800, color: res.score > 70 ? 'var(--green)' : res.score > 40 ? 'var(--amber)' : 'var(--red)', fontSize: '1.1rem' }}>{res.score}%</span></div>
                           <div style={{ height: 6, background: 'var(--s1)', borderRadius: 100, marginBottom: 12 }}><div style={{ height: '100%', width: `${res.score}%`, borderRadius: 100, background: res.score > 70 ? 'var(--green)' : res.score > 40 ? 'var(--amber)' : 'var(--red)', transition: 'width 1s cubic-bezier(.22,1,.36,1)' }} /></div>
                           <p style={{ fontSize: '.82rem', color: 'var(--ts)', lineHeight: 1.4, fontWeight: 500 }}>{res.note}</p>
                        </div>
                     ))}
                  </div>
               </div>
             );
           })()}
        </div>
      </div>
 
       {/* 2. Right Preview Side — The 1% Standard */}
       <div className={viewMode === 'editor' ? 'hide-mobile' : ''} style={{ 
         flex: 1, 
         display: 'flex', 
         flexDirection: 'column', 
         alignItems: 'center', 
         padding: '40px 20px', 
         overflowY: 'auto', 
         background: '#f8f9fa' 
       }}>
         <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
           <Btn v="dark" sz="sm" pill onClick={downloadPDF}><Icon id="download" size={14} color="white" /> Export PDF</Btn>
           <Btn v={showATS ? 'ind' : 'light'} sz="sm" pill onClick={() => setShowATS(!showATS)}><Icon id="target" size={14} color={showATS ? 'white' : 'var(--tp)'} /> {showATS ? 'ATS Active' : 'Recruiter Mode'}</Btn>
        </div>

        <div id="resume-preview-wrapper" style={{ 
          width: '100%', maxWidth: '595px', minHeight: '842px', height: 'max-content', flexShrink: 0,
          filter: 'drop-shadow(0 16px 24px rgba(0,0,0,0.12))', paddingBottom: 40
        }}>
          <div id="resume-preview" className="a4-preview" style={{ 
            width: '100%', height: '100%', minHeight: '842px', background: 'white',
            padding: window.innerWidth > 640 ? '50px 65px' : '30px 25px', display: 'flex', flexDirection: 'column', color: '#000', position: 'relative', fontFamily: "'Inter', sans-serif", wordBreak: 'break-word'
          }}>
           
           {/* ATS Terminal Overlay */}
           {showATS && (
             <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', color: '#00ff41', padding: '60px 50px', zIndex: 10, fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.5, overflowY: 'auto' }}>
                <div style={{ borderBottom: '1px solid #00ff41', paddingBottom: 10, marginBottom: 20, opacity: 0.8 }}>[ ATS PARSING SIMULATOR v4.2 ]</div>
                <div style={{ marginBottom: 30 }}><div style={{ color: '#fff', fontWeight: 700 }}>[ENTITY_NAME]</div><div>{(data.name || '').toUpperCase()}</div></div>
                <div style={{ marginBottom: 30 }}><div style={{ color: '#fff', fontWeight: 700 }}>[EXTRACTED_SKILLS]</div><div>{data.skills}</div></div>
                <div style={{ marginBottom: 20 }}><div style={{ color: '#fff', fontWeight: 700 }}>[WORK_HISTORY]</div>{data.experience.map(e => <div key={e.id} style={{ marginBottom: 10 }}>{e.company}: {e.desc}</div>)}</div>
             </div>
           )}

           <div style={{ textAlign: 'center', marginBottom: 35 }}>
              <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-.04em' }}>{(data.name || '').toUpperCase()}</h1>
              <div style={{ fontSize: '11px', color: '#666', display: 'flex', justifyContent: 'center', gap: 6 }}>
                {data.location && <span>{data.location}</span>}
                {data.location && (data.email || data.linkedin || data.github) && <span>|</span>}
                {data.email && <a href={`mailto:${data.email}`} style={{ color: 'var(--ind)', textDecoration: 'none' }}>{data.email}</a>}
                {data.email && (data.linkedin || data.github) && <span>|</span>}
                {data.linkedin && <a href={data.linkedin.startsWith('http') ? data.linkedin : `https://${data.linkedin}`} target="_blank" rel="noreferrer" style={{ color: 'var(--ind)', textDecoration: 'none' }}>LinkedIn</a>}
                {data.linkedin && data.github && <span>|</span>}
                {data.github && <a href={data.github.startsWith('http') ? data.github : `https://${data.github}`} target="_blank" rel="noreferrer" style={{ color: 'var(--ind)', textDecoration: 'none' }}>GitHub</a>}
              </div>
           </div>

           {/* EDUCATION */}
           {data.education && data.education.length > 0 && (
             <section style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, borderBottom: '1.5px solid #000', paddingBottom: 4, marginBottom: 12 }}>EDUCATION</h4>
                {data.education.map(edu => (
                  <div key={edu.id} style={{ marginBottom: 10 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontWeight: 800, fontSize: '11px', gap: 16 }}>
                       <span style={{ flex: 1, lineHeight: 1.4 }}>{edu.school}</span>
                       <span style={{ textAlign: 'right', flexShrink: 0, maxWidth: '50%', lineHeight: 1.4 }}>{edu.year}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '11px', marginTop: 2, gap: 16 }}>
                       <span style={{ flex: 1, lineHeight: 1.4 }}>{edu.degree}</span>
                       {edu.grade && <span style={{ fontWeight: 600, textAlign: 'right', flexShrink: 0, maxWidth: '60%', lineHeight: 1.4 }}>{edu.grade}</span>}
                     </div>
                  </div>
                ))}
             </section>
           )}

           {/* SUMMARY */}
           {data.summary && (
             <section style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, borderBottom: '1.5px solid #000', paddingBottom: 4, marginBottom: 10 }}>SUMMARY</h4>
                <p style={{ fontSize: '11px', lineHeight: 1.6 }}>{data.summary}</p>
             </section>
           )}

           {/* EXPERIENCE */}
           {data.experience && data.experience.length > 0 && (
             <section style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, borderBottom: '1.5px solid #000', paddingBottom: 4, marginBottom: 14 }}>EXPERIENCE</h4>
                {data.experience.map(exp => (
                  <div key={exp.id} style={{ marginBottom: 15 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontWeight: 800, fontSize: '12px', gap: 16 }}>
                       <span style={{ flex: 1, lineHeight: 1.4 }}>{exp.company} — {exp.role}</span>
                       <span style={{ textAlign: 'right', flexShrink: 0, maxWidth: '40%', lineHeight: 1.4 }}>{exp.period}</span>
                     </div>
                     <p style={{ fontSize: '11px', marginTop: 5, lineHeight: 1.5 }}>• {exp.desc}</p>
                  </div>
                ))}
             </section>
           )}

           {/* PROJECTS */}
           {data.projects && data.projects.length > 0 && (
             <section style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, borderBottom: '1.5px solid #000', paddingBottom: 4, marginBottom: 14 }}>PROJECTS</h4>
                {data.projects.map(p => (
                  <div key={p.id} style={{ marginBottom: 15 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontWeight: 800, fontSize: '12px', gap: 16 }}>
                       <span style={{ flex: 1, lineHeight: 1.4 }}>{p.title}</span>
                       <span style={{ textAlign: 'right', flexShrink: 0, maxWidth: '60%', lineHeight: 1.4 }}>{p.tech}</span>
                     </div>
                     <p style={{ fontSize: '11px', marginTop: 5, lineHeight: 1.5 }}>• {p.desc}</p>
                  </div>
                ))}
             </section>
           )}

           {/* SKILLS */}
           {data.skills && (
             <section style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, borderBottom: '1.5px solid #000', paddingBottom: 4, marginBottom: 12 }}>SKILLS</h4>
                <p style={{ fontSize: '11px' }}>{data.skills}</p>
             </section>
           )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default LiveBuilder;
