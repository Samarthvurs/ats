import { useState, useRef, useCallback, useEffect } from 'react';
import Icon from '../../components/Icon';
import Btn from '../../components/Btn';

let ML_BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000';
if (ML_BACKEND && !ML_BACKEND.startsWith('http') && !ML_BACKEND.includes('localhost')) {
  ML_BACKEND = `https://${ML_BACKEND}`;
}

const PHASE_LABELS = {
  queued: 'Queued…',
  parsing: 'Parsing resumes (PDF/DOCX)…',
  embedding_skills: 'Preparing skill vocabulary…',
  embedding_documents: 'Computing semantic embeddings for the whole batch…',
  scoring_candidates: 'Scoring & ranking candidates…',
  done: 'Done',
};

const ACCEPT_EXT = ['.pdf', '.docx'];
const isAcceptedFile = (f) => ACCEPT_EXT.some(ext => f.name.toLowerCase().endsWith(ext));

const ResumeUploadStep = ({ jdText, customSkills, skillWeights, criteria, config, files, setFiles, onScreened, onBack }) => {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const addFiles = useCallback((incoming) => {
    const accepted = Array.from(incoming).filter(isAcceptedFile);
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const merged = [...prev];
      accepted.forEach(f => { if (!existing.has(f.name + f.size)) merged.push(f); });
      return merged.slice(0, 400);
    });
  }, [setFiles]);

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));
  const onDrop = useCallback(e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }, [addFiles]);

  const pollJob = (jobId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${ML_BACKEND}/api/shortlist/jobs/${jobId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Job lookup failed');
        const job = json.data;
        setProgress(job.progress);
        if (job.status === 'done') {
          clearInterval(pollRef.current);
          setLoading(false);
          onScreened(job.result);
        } else if (job.status === 'error') {
          clearInterval(pollRef.current);
          setLoading(false);
          setError(job.error || 'Shortlisting job failed.');
        }
      } catch (err) {
        clearInterval(pollRef.current);
        setLoading(false);
        setError(err.message || 'Lost connection to the shortlisting job.');
      }
    }, 1200);
  };

  const runScreen = async () => {
    if (!jdText.trim() || files.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setProgress({ processed: 0, total: files.length, phase: 'queued' });

    try {
      const form = new FormData();
      form.append('job_description', jdText);
      form.append('config', JSON.stringify({
        ...config,
        custom_skills: customSkills,
        skill_weights: skillWeights,
        min_years_experience: criteria.min_years_experience,
        min_cgpa: criteria.min_cgpa,
        min_education_level: criteria.min_education_level,
        required_field_of_study: criteria.required_field_of_study,
      }));
      files.forEach(f => form.append('resumes', f));

      const res = await fetch(`${ML_BACKEND}/api/shortlist/jobs`, { method: 'POST', body: form, signal: AbortSignal.timeout(10 * 60 * 1000) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not start screening job');
      pollJob(json.job_id);
    } catch (err) {
      setError(err.message || 'Could not reach the screening engine. Is the backend running?');
      setLoading(false);
    }
  };

  const phaseLabel = progress ? (PHASE_LABELS[progress.phase] || 'Working…') : '';
  const pct = progress && progress.total ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <div>
      <div className="card ru" style={{ padding: 22, marginBottom: 22 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ts)', marginBottom: 10 }}>
          Resume batch ({files.length} added · PDF or DOCX · handles 200+)
        </label>

        <div
          className={`dz-idle ${dragging ? 'dz-hover' : ''}`}
          style={{ borderRadius: 16, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: files.length ? 14 : 0 }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".pdf,.docx" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
          <Icon id="upload" size={24} color="var(--ts)" />
          <p style={{ fontWeight: 600, fontSize: '.9rem', marginTop: 10 }}>Drop resumes here — a handful or a few hundred</p>
          <p style={{ fontSize: '.78rem', color: 'var(--tt)', marginTop: 3 }}>or tap to browse · .pdf, .docx</p>
        </div>

        {files.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {files.slice(0, 14).map((f, i) => (
              <span key={f.name + f.size} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--s1)', borderRadius: 100, padding: '5px 6px 5px 12px', fontSize: '.78rem', fontWeight: 600 }}>
                {f.name.length > 22 ? f.name.slice(0, 20) + '…' : f.name}
                <button onClick={() => removeFile(i)} style={{ background: 'var(--s2)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon id="x" size={9} />
                </button>
              </span>
            ))}
            {files.length > 14 && (
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '.78rem', fontWeight: 700, color: 'var(--ts)', padding: '5px 10px' }}>+{files.length - 14} more</span>
            )}
            <button onClick={() => setFiles([])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', fontWeight: 700, color: 'var(--red)', padding: '5px 4px' }}>Clear all</button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,59,48,.1)', color: 'var(--red)', borderRadius: 12, marginBottom: 16, fontSize: '.9rem', fontWeight: 500 }}>{error}</div>
      )}

      {loading ? (
        <div className="card ru" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '.86rem', fontWeight: 700 }}>{phaseLabel}</span>
            <span style={{ fontSize: '.86rem', fontWeight: 800, color: 'var(--ind)' }}>{pct}%</span>
          </div>
          <div className="pb-track" style={{ height: 6 }}>
            <div className="pb-fill" style={{ width: `${pct}%`, background: 'var(--ind)' }} />
          </div>
          {progress && progress.total > 0 && (
            <p style={{ fontSize: '.76rem', color: 'var(--ts)', marginTop: 8 }}>{progress.processed} / {progress.total} resumes</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn v="ghost" sz="xl" onClick={onBack}>Back</Btn>
          <Btn v="dark" sz="xl" full onClick={runScreen} style={{ opacity: (!jdText.trim() || !files.length) ? .5 : 1 }}>
            <Icon id="target" size={17} color="white" /> Screen {files.length || ''} candidates
          </Btn>
        </div>
      )}
    </div>
  );
};

export default ResumeUploadStep;
