import { useState, useRef, useEffect } from 'react';
import Icon from '../../components/Icon';
import Btn from '../../components/Btn';
import PdfHighlightViewer from '../../components/PdfHighlightViewer';
import DocxPreview from '../../components/DocxPreview';

let ML_BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000';
if (ML_BACKEND && !ML_BACKEND.startsWith('http') && !ML_BACKEND.includes('localhost')) {
  ML_BACKEND = `https://${ML_BACKEND}`;
}

const ACCEPT_EXT = ['.pdf', '.docx'];
const isAcceptedFile = (f) => ACCEPT_EXT.some(ext => f.name.toLowerCase().endsWith(ext));

const DEFAULT_CONFIG = {
  semantic_weight: 0.5,
  required_weight: 1.0,
  preferred_weight: 0.5,
  semantic_credit: 0.6,
  semantic_threshold: 0.42,
};

// Stable empty-array reference — PdfHighlightViewer/DocxPreview key their
// async render effect off these props by identity, so passing a fresh []
// literal every render (this step re-renders on every keystroke/weight
// change) was restarting the PDF render mid-flight and intermittently
// leaving it stuck on the plain-text error fallback.
const NO_HIGHLIGHTS = [];

const EDUCATION_LEVELS = [
  { value: '', label: 'Any' },
  { value: 'high_school', label: 'High School' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'bachelor', label: "Bachelor's" },
  { value: 'master', label: "Master's" },
  { value: 'phd', label: 'PhD' },
];

const SAMPLE_JD = `Junior Full Stack Developer Intern — TechNova Solutions

We're looking for a motivated Junior Full Stack Developer Intern to join our engineering team.

Requirements:
- Proficiency in JavaScript and React
- Experience building REST APIs with Node.js
- Familiarity with MongoDB or another NoSQL database
- Solid understanding of HTML and CSS
- Comfortable with Git for version control
- Strong written and verbal communication skills
- Currently pursuing or recently completed a degree in Computer Science or related field

Preferred:
- Exposure to TypeScript
- Familiarity with Docker
- Basic knowledge of AWS`;

const ConfigSlider = ({ label, value, min, max, step, onChange, fmt }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--tp)' }}>{label}</span>
      <span style={{ fontSize: '.82rem', fontWeight: 800, color: 'var(--ind)' }}>{fmt ? fmt(value) : value}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      style={{ width: '100%', accentColor: 'var(--ind)' }}
    />
  </div>
);

const JobDescriptionStep = ({
  jdFile, setJdFile, jdText, setJdText, detectedSkills, setDetectedSkills,
  customSkills = [], setCustomSkills, skillWeights = {}, setSkillWeights,
  criteria = {}, setCriteria, config, setConfig, onNext,
}) => {
  const [mode, setMode] = useState(jdFile ? 'file' : 'text');
  const [parsing, setParsing] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [skillRequired, setSkillRequired] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const inputRef = useRef(null);

  const detectSkills = async (text) => {
    if (!text.trim()) { setDetectedSkills(null); return; }
    setDetecting(true);
    try {
      const res = await fetch(`${ML_BACKEND}/api/detect-skills`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: text }),
      });
      const json = await res.json();
      if (json.success) setDetectedSkills(json.data);
    } catch (e) {
      console.warn('Skill detection unavailable:', e.message);
    } finally {
      setDetecting(false);
    }
  };

  const handleFile = async (file) => {
    if (!isAcceptedFile(file)) return;
    setJdFile(file);
    setMode('file');
    setError(null);
    setParsing(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${ML_BACKEND}/api/parse-document`, { method: 'POST', body: form });
      const json = await res.json();
      if (json.success) {
        setJdText(json.text);
        detectSkills(json.text);
      } else {
        setError(json.error || 'Could not read this file.');
      }
    } catch (e) {
      setError('Could not reach the backend to read this file. Is it running?');
    } finally {
      setParsing(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  useEffect(() => {
    if (jdFile) return;
    const t = setTimeout(() => detectSkills(jdText), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jdText, jdFile]);

  const addSkill = () => {
    const v = skillInput.trim();
    if (!v) return;
    if (customSkills.some(s => s.name.toLowerCase() === v.toLowerCase())) { setSkillInput(''); return; }
    setCustomSkills([...customSkills, { name: v, required: skillRequired }]);
    setSkillInput('');
  };
  const removeSkill = (name) => setCustomSkills(customSkills.filter(s => s.name !== name));
  const updateWeight = (name, weight) => setSkillWeights({ ...skillWeights, [name]: weight });

  const isPdf = jdFile?.name.toLowerCase().endsWith('.pdf');
  const isDocx = jdFile?.name.toLowerCase().endsWith('.docx');

  const allSkills = [
    ...(detectedSkills?.required || []).map(name => ({ name, required: true, source: 'jd' })),
    ...(detectedSkills?.preferred || []).map(name => ({ name, required: false, source: 'jd' })),
    ...customSkills.map(s => ({ ...s, source: 'custom' })),
  ];

  return (
    <div>
      <div className="card ru" style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ts)' }}>
            Job description document
          </label>
          <div style={{ display: 'flex', gap: 14 }}>
            <button onClick={() => { setJdText(SAMPLE_JD); setJdFile(null); setMode('text'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', fontWeight: 700, color: 'var(--ind)' }}>
              Use sample JD
            </button>
            {mode === 'file' && jdFile && (
              <button onClick={() => setMode('text')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', fontWeight: 700, color: 'var(--ind)' }}>
                Edit as text instead
              </button>
            )}
            {mode === 'text' && (
              <button onClick={() => inputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', fontWeight: 700, color: 'var(--ind)' }}>
                Upload PDF/DOCX
              </button>
            )}
          </div>
          <input ref={inputRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
        </div>

        {mode === 'file' && jdFile ? (
          <div>
            <div
              className={`dz-idle ${dragging ? 'dz-hover' : ''}`}
              style={{ borderRadius: 12, padding: '8px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <span style={{ fontSize: '.82rem', fontWeight: 600 }}>
                <Icon id="file" size={13} /> {jdFile.name} {parsing && '· reading…'}
              </span>
              <button onClick={() => inputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', fontWeight: 700, color: 'var(--ind)' }}>Replace</button>
            </div>
            <div style={{ background: 'var(--s1)', borderRadius: 12, padding: 16, maxHeight: 480, overflowY: 'auto' }}>
              {isPdf && <PdfHighlightViewer file={jdFile} explicitTerms={NO_HIGHLIGHTS} semanticChunks={NO_HIGHLIGHTS} />}
              {isDocx && <DocxPreview file={jdFile} explicitTerms={NO_HIGHLIGHTS} semanticChunks={NO_HIGHLIGHTS} />}
            </div>
          </div>
        ) : (
          <div
            className={`dz-idle ${dragging ? 'dz-hover' : ''}`}
            style={{ borderRadius: 16, padding: '24px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 14 }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Icon id="upload" size={20} color="var(--ts)" />
            <p style={{ fontWeight: 600, fontSize: '.86rem', marginTop: 8 }}>Drop the JD as a PDF or DOCX here</p>
            <p style={{ fontSize: '.76rem', color: 'var(--tt)', marginTop: 3 }}>or tap to browse — or paste the text below instead</p>
          </div>
        )}

        {mode === 'text' && (
          <textarea
            className="inp"
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder="…or paste the full job description text here"
            rows={9}
            style={{ resize: 'vertical', lineHeight: 1.6, fontSize: '.88rem' }}
          />
        )}

        {error && <p style={{ color: 'var(--red)', fontSize: '.82rem', marginTop: 10 }}>{error}</p>}
      </div>

      <div className="card ru d1" style={{ padding: 22, marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ts)', marginBottom: 14 }}>
          Skills &amp; weights {detecting && '· detecting…'}
        </p>

        {allSkills.length === 0 && (
          <p style={{ fontSize: '.84rem', color: 'var(--tt)', marginBottom: 16 }}>No skills detected yet — add a JD above, or add keywords manually below.</p>
        )}

        {allSkills.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 10, padding: '0 0 6px', fontSize: '.68rem', fontWeight: 800, color: 'var(--tt)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <span style={{ flex: 1 }}>Skill</span>
              <span style={{ width: 78 }}>Type</span>
              <span style={{ width: 54, textAlign: 'center' }}>Weight</span>
              <span style={{ width: 20 }} />
            </div>
            {allSkills.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '.5px solid var(--bl)' }}>
                <span style={{ flex: 1, fontSize: '.86rem', fontWeight: 700 }}>{s.name}</span>
                <span style={{ width: 78, fontSize: '.68rem', fontWeight: 800, padding: '3px 9px', borderRadius: 100, background: s.required ? 'rgba(255,59,48,.08)' : 'var(--s1)', color: s.required ? '#C0392B' : 'var(--ts)', textAlign: 'center' }}>
                  {s.required ? 'Must-have' : 'Preferred'}
                </span>
                <input
                  type="number" min={0.2} max={3} step={0.1} value={skillWeights[s.name] ?? 1.0}
                  onChange={e => updateWeight(s.name, parseFloat(e.target.value) || 1)}
                  title="Weight multiplier — how much this skill counts toward the final score"
                  style={{ width: 54, padding: '4px 6px', fontSize: '.78rem', border: '.5px solid var(--bl)', borderRadius: 8, textAlign: 'center' }}
                />
                <span style={{ width: 20, display: 'flex', justifyContent: 'center' }}>
                  {s.source === 'custom' && (
                    <button onClick={() => removeSkill(s.name)} style={{ background: 'var(--s1)', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer' }}>
                      <Icon id="x" size={9} />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ts)', marginBottom: 8 }}>
          Add a keyword manually
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="inp" style={{ flex: 1, minWidth: 180 }} placeholder="e.g. Kubernetes, PCI-DSS, Figma…"
            value={skillInput} onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
          />
          <select className="inp" style={{ width: 'auto' }} value={skillRequired ? 'must' : 'preferred'} onChange={e => setSkillRequired(e.target.value === 'must')}>
            <option value="must">Must-have</option>
            <option value="preferred">Preferred</option>
          </select>
          <Btn v="ghost" sz="md" onClick={addSkill}>Add</Btn>
        </div>
      </div>

      <div className="card ru d2" style={{ padding: 22, marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ts)', marginBottom: 14 }}>
          Additional criteria <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--tt)' }}>(optional — flagged, not hard-excluded, if a resume doesn't state it)</span>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label className="rb-label">Minimum years of experience</label>
            <input
              className="inp" type="number" min={0} max={30} placeholder="e.g. 2"
              value={criteria.min_years_experience ?? ''}
              onChange={e => setCriteria(c => ({ ...c, min_years_experience: e.target.value === '' ? null : parseFloat(e.target.value) }))}
            />
          </div>
          <div>
            <label className="rb-label">Minimum CGPA (out of 10)</label>
            <input
              className="inp" type="number" min={0} max={10} step={0.1} placeholder="e.g. 7.0"
              value={criteria.min_cgpa ?? ''}
              onChange={e => setCriteria(c => ({ ...c, min_cgpa: e.target.value === '' ? null : parseFloat(e.target.value) }))}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="rb-label">Minimum education level</label>
            <select
              className="inp" value={criteria.min_education_level || ''}
              onChange={e => setCriteria(c => ({ ...c, min_education_level: e.target.value || null }))}
            >
              {EDUCATION_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="rb-label">Preferred field of study</label>
            <input
              className="inp" placeholder="e.g. Computer Science"
              value={criteria.required_field_of_study || ''}
              onChange={e => setCriteria(c => ({ ...c, required_field_of_study: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="card ru d3" style={{ padding: 22, marginBottom: 22 }}>
        <button onClick={() => setShowConfig(s => !s)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon id="settings" size={16} color="var(--ind)" />
            <span style={{ fontSize: '.9rem', fontWeight: 800 }}>Customize the scoring formula</span>
          </span>
          <span style={{ display: 'flex', transform: showConfig ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
            <Icon id="chevron" size={15} color="var(--tt)" />
          </span>
        </button>

        {showConfig && (
          <div className="si" style={{ marginTop: 20 }}>
            <ConfigSlider
              label="Semantic vs. keyword weighting"
              value={config.semantic_weight} min={0} max={1} step={0.05}
              onChange={v => setConfig(c => ({ ...c, semantic_weight: v }))}
              fmt={v => `${Math.round(v * 100)}% semantic / ${Math.round((1 - v) * 100)}% keyword`}
            />
            <ConfigSlider
              label="Required skill base weight"
              value={config.required_weight} min={0.2} max={2} step={0.1}
              onChange={v => setConfig(c => ({ ...c, required_weight: v }))}
              fmt={v => `${v.toFixed(1)} pts`}
            />
            <ConfigSlider
              label="Preferred skill base weight"
              value={config.preferred_weight} min={0} max={1.5} step={0.1}
              onChange={v => setConfig(c => ({ ...c, preferred_weight: v }))}
              fmt={v => `${v.toFixed(1)} pts`}
            />
            <ConfigSlider
              label="Credit for inferred (semantic-only) skill matches"
              value={config.semantic_credit} min={0} max={1} step={0.05}
              onChange={v => setConfig(c => ({ ...c, semantic_credit: v }))}
              fmt={v => `${Math.round(v * 100)}% of full credit`}
            />
            <ConfigSlider
              label="Semantic match sensitivity (lower = more generous inference)"
              value={config.semantic_threshold} min={0.25} max={0.65} step={0.01}
              onChange={v => setConfig(c => ({ ...c, semantic_threshold: v }))}
              fmt={v => v.toFixed(2)}
            />
            <button onClick={() => setConfig(DEFAULT_CONFIG)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', fontWeight: 700, color: 'var(--ind)' }}>
              Reset to defaults
            </button>
          </div>
        )}

        <div style={{ background: 'var(--s1)', borderRadius: 12, padding: '12px 14px', marginTop: 18 }}>
          <p style={{ fontSize: '.76rem', color: 'var(--ts)', fontWeight: 600, lineHeight: 1.6 }}>
            <b style={{ color: 'var(--tp)' }}>Formula:</b> final = {Math.round(config.semantic_weight * 100)}% × semantic similarity to the JD
            + {Math.round((1 - config.semantic_weight) * 100)}% × weighted skill coverage, where each skill's base weight
            ({config.required_weight.toFixed(1)}pt required / {config.preferred_weight.toFixed(1)}pt preferred) is multiplied by the
            per-skill weight set above, and an inferred-only match earns {Math.round(config.semantic_credit * 100)}% of that — minus a
            deduction for any confirmed shortfall against the criteria below.
          </p>
        </div>
      </div>

      <Btn v="dark" sz="xl" full onClick={onNext} style={{ opacity: !jdText.trim() ? .5 : 1 }}>
        Next: Upload resumes <Icon id="arrow" size={16} color="#fff" />
      </Btn>
    </div>
  );
};

export default JobDescriptionStep;
