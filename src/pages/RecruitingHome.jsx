import { useState } from 'react';
import Icon from '../components/Icon';
import Btn from '../components/Btn';

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch (e) { return ''; }
};

const RecruitingHome = ({ programs, onCreate, onOpen, onDelete }) => {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const submitCreate = () => {
    onCreate(name.trim());
    setName('');
    setNaming(false);
  };

  return (
    <div style={{ minHeight: '100vh', paddingTop: 52, background: 'var(--s1)' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 20px 100px' }}>

        <p className="eyebrow ru" style={{ marginBottom: 14 }}>Recruiting</p>
        <div className="ru d1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
          <h1 style={{ fontSize: 'clamp(1.9rem,4vw,2.6rem)', fontWeight: 800, letterSpacing: '-.05em' }}>
            Your recruiting programs
          </h1>
          {!naming && (
            <Btn v="dark" sz="md" pill onClick={() => setNaming(true)}>
              <Icon id="plus" size={15} color="#fff" /> New program
            </Btn>
          )}
        </div>
        <p className="ru d2" style={{ color: 'var(--ts)', marginBottom: 32, fontSize: '.95rem', lineHeight: 1.7, maxWidth: 620 }}>
          Each program is its own job description, resume batch, scoring configuration and ranked shortlist —
          run "Backend Intern — Fall 2026" and "Frontend Contractor" side by side without mixing results.
        </p>

        {naming && (
          <div className="card ru" style={{ padding: 20, marginBottom: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              className="inp" autoFocus style={{ flex: 1, minWidth: 220 }}
              placeholder="e.g. Backend Intern — Fall 2026"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitCreate()}
            />
            <Btn v="dark" sz="md" onClick={submitCreate}>Create</Btn>
            <Btn v="ghost" sz="md" onClick={() => { setNaming(false); setName(''); }}>Cancel</Btn>
          </div>
        )}

        {programs.length === 0 && !naming && (
          <div className="card ru" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Icon id="target" size={23} color="var(--ts)" />
            </div>
            <p style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 8 }}>No programs yet</p>
            <p style={{ fontSize: '.88rem', color: 'var(--ts)', marginBottom: 22 }}>Create one to start ranking resumes against a job description.</p>
            <Btn v="dark" sz="lg" pill onClick={() => setNaming(true)}>
              <Icon id="plus" size={16} color="#fff" /> New program
            </Btn>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {programs.map((p, i) => (
            <div key={p.id} className={`card ru d${Math.min(i + 3, 8)}`} style={{ padding: 22, cursor: 'pointer', position: 'relative' }} onClick={() => onOpen(p.id)}>
              <button
                onClick={e => { e.stopPropagation(); onDelete(p.id); }}
                style={{ position: 'absolute', top: 14, right: 14, background: 'var(--s1)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                title="Delete program"
              >
                <Icon id="x" size={11} color="var(--ts)" />
              </button>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--near-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon id="briefcase" size={17} color="#fff" />
              </div>
              <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 6, letterSpacing: '-.02em', paddingRight: 20 }}>{p.name}</p>
              <p style={{ fontSize: '.78rem', color: 'var(--tt)', marginBottom: 14 }}>Created {fmtDate(p.createdAt)}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '.72rem', fontWeight: 700, background: 'var(--s1)', color: 'var(--ts)', padding: '4px 10px', borderRadius: 100 }}>
                  {p.jdText ? 'JD ready' : 'No JD yet'}
                </span>
                {p.lastRunAt && (
                  <span style={{ fontSize: '.72rem', fontWeight: 700, background: 'rgba(94,92,230,.08)', color: 'var(--ind)', padding: '4px 10px', borderRadius: 100 }}>
                    {p.lastCandidateCount ?? 0} ranked
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecruitingHome;
