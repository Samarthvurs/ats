import { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import Btn from '../components/Btn';
import Badge from '../components/Badge';
import ScoreRing from '../components/ScoreRing';
import ProgressRow from '../components/ProgressRow';
import AICoach from '../components/AICoach';
import JobMatcher from '../components/JobMatcher';
import AnimatedNumber from '../components/AnimatedNumber';
import CoverLetter from '../components/CoverLetter';
import InterviewPrep from '../components/InterviewPrep';
import SalaryEstimator from '../components/SalaryEstimator';
import { db, auth } from '../firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { callGroq } from '../services/ai';
import FormattedText from '../components/FormattedText';

const SIDE_NAV = [
  { id: 'overview', l: 'Overview', ic: 'grid' },
  { id: 'scans', l: 'Scans', ic: 'file' },
  { id: 'matcher', l: 'Job Matcher', ic: 'target', neu: true },
  { id: 'coach', l: 'AI Coach', ic: 'brain', neu: true },
  { id: 'cover', l: 'Cover Letter', ic: 'file', neu: true },
  { id: 'interview', l: 'Interview Prep', ic: 'award', neu: true },
  { id: 'builder', l: 'Expert Builder', ic: 'zap', neu: true },
];

const Dashboard = ({ go, user, onAuth }) => {
  const [tab, setTab] = useState('overview');
  const [scans, setScans] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [profileData, setProfileData] = useState({ name: user?.name || '', bio: user?.bio || 'Career Explorer' });
  // Settings functionality removed
  const [loadingAI, setLoadingAI] = useState(false);
  const [roastContent, setRoastContent] = useState(null);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'users', user.uid, 'scans'), orderBy('date', 'desc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setScans(docs);
      setLoaded(true);
    }, (error) => {
      console.error("Error fetching scans:", error);
      setLoaded(true);
    });

    return () => unsub();
  }, [user]);

  const latest = scans[0];
  const total = scans.length;
  const avg = total > 0 ? Math.round(scans.reduce((a, b) => a + b.score, 0) / total) : 0;

  const KPIS = [
    { label: 'Current Score', val: latest?.score || 0, sub: 'Latest scan', suffix: '%' },
    { label: 'Improvement', val: total > 1 ? Math.max(0, latest.score - scans[total - 1].score) : 0, sub: 'Since first scan', suffix: '%' },
    { label: 'Total Scans', val: total, sub: 'Versions created', suffix: '' },
    { label: 'Avg Persistence', val: avg, sub: 'Quality stability', suffix: '%' },
  ];

  /* ── Not Signed In ── */
  if (!user) return (
    <div style={{ padding: '80px 20px', textAlign: 'center', background: 'var(--s1)', minHeight: 'calc(100vh - 52px)' }}>
      <div className="ru card" style={{ maxWidth: 440, margin: '0 auto', padding: 40 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Icon id="lock" size={20} color="var(--ts)" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 10, letterSpacing: '-.03em' }}>
          Unlock Your Career OS
        </h2>
        <p style={{ color: 'var(--ts)', marginBottom: 28, fontSize: '.9rem', lineHeight: 1.65 }}>
          Track your resume score history and improvements over time.
        </p>
        <Btn v="dark" sz="lg" pill onClick={onAuth}>
          Sign in <Icon id="arrow" size={14} color="white" />
        </Btn>
      </div>
    </div>
  );

  const handleDeleteScan = async (scanId) => {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'scans', scanId));
      setScans(scans.filter(s => s.id !== scanId));
      setSelectedScan(null);
    } catch (err) {
      console.error("Failed to delete scan", err);
    }
    setDeleting(false);
  };

  const handleAIRename = async (scan) => {
    if (!user || loadingAI) return;
    setLoadingAI(true);
    try {
      const prompt = `Based on this resume text, suggest a very short, professional filename (3-4 words max). Output ONLY the filename, nothing else. Text: ${scan.text?.substring(0, 4000) || scan.name}`;
      const completion = await callGroq(prompt);
      const newName = completion.choices[0]?.message?.content?.replace(/["']/g, '').trim() || scan.name;
      await updateDoc(doc(db, 'users', user.uid, 'scans', scan.id), { name: newName });
      setSelectedScan({ ...scan, name: newName });
    } catch (e) { console.error(e); }
    setLoadingAI(false);
  };

  const handleAIRoast = async (scan) => {
    if (!user || loadingAI) return;
    setLoadingAI(true);
    try {
      const prompt = `You are a brutally honest, witty, and high-standard senior recruiter. Roast this resume text in 3 short, punchy, but actually helpful bullet points. Be funny but professional. Text: ${scan.text?.substring(0, 4000) || scan.name}`;
      const completion = await callGroq(prompt);
      setRoastContent(completion.choices[0]?.message?.content || "Your resume is so generic even I can't roast it.");
    } catch (e) { console.error(e); }
    setLoadingAI(false);
  };

  const ScanModal = () => {
    if (!selectedScan) return null;
    const s = selectedScan;
    const rc = s.risk?.includes('High') ? 'red' : s.risk?.includes('Medium') ? 'amber' : 'green';

    // Standardization: getSolution logic for the dashboard
    const getSolution = (label) => {
      const solutions = {
        'Resume Too Short': 'Expert Solution: Expand your bullet points to include specific tools and methodologies used.',
        'Missing Experience Section': 'Expert Solution: Ensure your headline for past work exactly matches "Experience" or "Professional History".',
        'Incomplete Contact Info': 'Expert Solution: Explicitly list both a professional email and a phone number in the header.',
        'Potential Keyword Stuffing': 'Expert Tip: Weave keywords naturally into project descriptions rather than listing them in a block.',
        'No Experience Dates': 'Expert Solution: Format dates clearly as Month Year – Month Year (e.g. June 2021 – Present).',
        'Invalid Document': 'Expert Tip: Ensure your PDF is text-searchable (not a flat image) and uses standard fonts like Arial or Roboto.'
      };
      return solutions[label] || 'Expert Tip: Use the STAR method to fix this signal.';
    };

    return (
      <div className="modal-bg rf" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ position: 'absolute', inset: 0 }} onClick={() => { setSelectedScan(null); setRoastContent(null); }} />
        <div className="ru glass-dark" style={{ position: 'relative', width: '100%', maxWidth: 840, borderRadius: 32, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>
          <div style={{ padding: '32px 40px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.04em', color: '#fff', marginBottom: 4 }}>{s.name || 'Resume Analysis'}</h2>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>Protocol ID: {s.id.substring(0,8)} • {new Date(s.date).toLocaleDateString()}</p>
            </div>
            <Btn v="ghost-dark" pill onClick={() => { setSelectedScan(null); setRoastContent(null); }} haptic={true}><Icon id="x" size={18} /></Btn>
          </div>

          <div style={{ padding: 40, maxHeight: '75vh', overflowY: 'auto' }}>
            <div className="scan-modal-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: 48 }}>
              {/* Left — Score Ring & AI Actions */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 24px' }}>
                  <svg width="160" height="160" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" className="ring-bg ring-dark" />
                    <circle
                      cx="50" cy="50" r="44" className="ring-val"
                      stroke={s.score < 60 ? 'var(--red)' : s.score < 80 ? 'var(--amber)' : 'var(--green)'}
                      strokeDasharray="276"
                      strokeDashoffset={276 - (276 * (s.score || 0)) / 100}
                      style={{ filter: `drop-shadow(0 0 8px ${s.score < 60 ? 'var(--red)' : s.score < 80 ? 'var(--amber)' : 'var(--green)'}66)` }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '2.8rem', fontWeight: 900, color: '#fff', letterSpacing: '-.05em', lineHeight: 1 }}>{s.score}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Index</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Btn v="white" full pill onClick={() => handleAIRoast(s)} loading={loadingAI} strobe={!roastContent}>
                    {roastContent ? 'Refresh Roast' : 'Execute AI Roast'}
                  </Btn>
                  <Btn v="ghost-dark" sz="sm" pill onClick={() => handleAIRename(s)} loading={loadingAI}>
                    <Icon id="zap" size={12} color="var(--ind)" /> Auto-Rename 
                  </Btn>
                </div>
              </div>

              {/* Right — Breakdown & Insights */}
              <div>
                {/* Roast Display (if exists) */}
                {roastContent && (
                  <div className="si" style={{ marginBottom: 32, padding: '24px', background: 'rgba(255,59,48,0.08)', borderRadius: 24, border: '1px solid rgba(255,59,48,0.2)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 12, right: 16, fontSize: '1.2rem' }}>🔥</div>
                    <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Brutal Feedback</h4>
                    <FormattedText 
                      text={roastContent} 
                      bulletColor="var(--red)" 
                      textColor="rgba(255,255,255,0.85)" 
                      boldColor="#fff"
                      style={{ fontSize: '.9rem', lineHeight: 1.6, fontWeight: 500 }}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 32 }}>
                  {[
                    { label: 'ATS Protocol', val: s.ats, icon: 'shield' },
                    { label: 'Key Match', val: s.keyword, icon: 'target' },
                    { label: 'Neural Impact', val: s.impact, icon: 'zap' },
                    { label: 'Form Factor', val: s.formatting, icon: 'file' }
                  ].map((it, i) => (
                    <div key={i} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{it.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{it.val}%</span>
                       </div>
                       <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 100 }}>
                          <div style={{ height: '100%', borderRadius: 100, background: it.val > 70 ? 'var(--green)' : 'var(--ind)', width: `${it.val}%` }} />
                       </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                   <div>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon id="warn" size={14} color="var(--amber)" /> Critical Issues
                    </h4>
                    {s.issues?.map((iss, i) => (
                      <div key={i} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: '1.5px solid rgba(255,159,10,0.3)' }}>
                        <p style={{ fontSize: '.85rem', fontWeight: 600, color: '#fff', marginBottom: 2 }}>{iss.label}</p>
                        <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginBottom: 4 }}>{iss.desc}</p>
                        <p style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--ind)', background: 'rgba(94,92,230,0.1)', padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>{getSolution(iss.label)}</p>
                      </div>
                    ))}
                   </div>
                   <div>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon id="check" size={14} color="var(--green)" /> Recommendations
                    </h4>
                    {s.improvements?.map((imp, i) => (
                      <div key={i} style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', marginTop: 6, flexShrink: 0 }} />
                        <p style={{ fontSize: '.82rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{imp}</p>
                      </div>
                    ))}
                   </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Military-grade encryption enabled • Local ML Engine verified</p>
              <Btn v="ghost-dark" sz="sm" onClick={() => handleDeleteScan(s.id)} style={{ color: 'var(--red)' }}>
                {deleting ? 'Discarding...' : 'Erase Version Data'}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (tab === 'overview') {
      return (
        <>
          <div className="ru" style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 'clamp(1.4rem,2.8vw,1.8rem)', fontWeight: 800, letterSpacing: '-.04em', marginBottom: 8, color: 'var(--near-black)' }}>
              Welcome back, {user?.name?.split(' ')[0] || 'Hero'}!
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge type="ind">Step {total + 1} of your journey</Badge>
              <p style={{ fontSize: '.88rem', fontWeight: 500, color: 'var(--ts)' }}>You're {latest?.score || 0}% toward resume perfection.</p>
            </div>
          </div>

          <div id="dash-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14, marginBottom: 14 }}>
            {KPIS.map((k, i) => (
              <div key={i} className={`ru d${i} glass`} style={{ padding: '24px', borderRadius: 28, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 60, height: 60, background: 'var(--glow-ind)', filter: 'blur(20px)', opacity: 0.4 }} />
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--ts)', marginBottom: 14 }}>{k.label}</p>
                {loaded
                  ? <div style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-.06em', marginBottom: 6, color: 'var(--near-black)', display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <AnimatedNumber value={k.val} />
                    <span style={{ fontSize: '1.2rem', color: 'var(--ts)' }}>{k.suffix}</span>
                  </div>
                  : <div className="skel" style={{ height: 38, width: 90, marginBottom: 6 }} />
                }
                <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--tt)', letterSpacing: '.02em' }}>{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="chart-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginBottom: 14 }}>
            <div className="ru d2 glass" style={{ padding: 28, borderRadius: 28 }}>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Score Evolution</p>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-.04em', marginBottom: 28 }}>Performance Radar</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120, paddingBottom: 10, borderBottom: '1px solid var(--bl)' }}>
                {scans.length > 0 ? [...scans].reverse().slice(-5).map((s, i) => {
                  const v = s.score;
                  const color = v < 60 ? 'var(--red)' : v < 80 ? 'var(--amber)' : 'var(--green)';
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div className="ru" style={{ width: '100%', borderRadius: 8, background: color, height: loaded ? `${(v / 100) * 100}px` : '4px', transition: 'all 1s cubic-bezier(.22,1,.36,1)', boxShadow: `0 4px 15px ${color}33`, animationDelay: `${i * .1}s` }} />
                      <span style={{ fontSize: 9, color: 'var(--tt)', fontWeight: 700, textTransform: 'uppercase' }}>{s.name ? s.name.substring(0, 3) : 'V' + (i + 1)}</span>
                    </div>
                  );
                }) : <div style={{ fontSize: 11, color: 'var(--ts)', padding: 20 }}>Initialize scan protocol to see radar...</div>}
              </div>
            </div>

            <div className="ru d3 glass" style={{ padding: 28, borderRadius: 28, background: 'var(--near-black)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, padding: 20, opacity: 0.2 }}><Icon id="radar" size={40} color="var(--ind)" /></div>
              <p className="eyebrow-light eyebrow" style={{ marginBottom: 6 }}>System Insights</p>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-.04em', marginBottom: 28 }}>Target Match</h3>
              {loaded ? (
                <>
                  <ProgressRow label="ATS Protocol" value={latest?.ats || 0} delay={0} />
                  <ProgressRow label="Contextual Match" value={latest?.keyword || 0} delay={80} />
                  <ProgressRow label="Neural Impact" value={latest?.impact || 0} delay={160} />
                </>
              ) : [1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 12, marginBottom: 20, opacity: 0.1 }} />)}
            </div>
          </div>
        </>
      );
    }

    if (tab === 'scans') {
      return (
        <div className="ru card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '.5px solid var(--bl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Version History</h2>
            <Btn v="dark" sz="sm" pill onClick={() => go('upload')}>+ New Version</Btn>
          </div>
          {scans.length > 0 ? scans.map((sc, i) => {
            const rc = sc.risk === 'High Risk' ? 'red' : sc.risk === 'Medium Risk' ? 'amber' : 'green';
            const ver = `v1.${scans.length - i}`;
            return (
              <div
                key={sc.id}
                onClick={() => setSelectedScan(sc)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: i < scans.length - 1 ? '.5px solid var(--bl)' : 'none', cursor: 'pointer', transition: 'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--s1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '.75rem', color: 'var(--ind)' }}>{ver}</div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '.9rem' }}>{sc.name}</p>
                    <span style={{ fontSize: 11, color: 'var(--tt)' }}>{new Date(sc.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                  <Badge type={rc}>{sc.risk}</Badge>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: `var(--${rc})` }}>{sc.score}%</span>
                </div>
              </div>
            );
          }) : <div style={{ padding: 40, textAlign: 'center', color: 'var(--ts)' }}>No versions found.</div>}
        </div>
      );
    }


    const renderSubHeader = (title) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button 
          onClick={() => setTab('overview')}
          style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--s0)', border: '.5px solid var(--bl)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--s1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--s0)'}
        >
          <Icon id="arrow" size={14} style={{ transform: 'rotate(180deg)' }} color="var(--ts)" />
        </button>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.03em' }}>{title}</h2>
      </div>
    );

    if (tab === 'matcher') return <div className="ru"> {renderSubHeader('Job Matcher')} <JobMatcher user={user} resumeText={latest?.extractedText || latest?.text || latest?.name || ""} /> </div>;
    if (tab === 'coach') return <div className="ru"> {renderSubHeader('AI Career Coach')} <AICoach user={user} scans={scans} /> </div>;
    if (tab === 'cover') return <div className="ru"> {renderSubHeader('Cover Letter')} <CoverLetter user={user} scans={scans} /> </div>;
    if (tab === 'interview') return <div className="ru"> {renderSubHeader('Interview Prep')} <InterviewPrep user={user} scans={scans} /> </div>;

    // Settings tab removed

    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ts)' }}>Content mapping in progress...</div>;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', paddingTop: 52, background: 'var(--s1)' }}>
      <aside className="sidebar-panel" style={{ width: 220, borderRight: '.5px solid var(--bl)', background: 'var(--s0)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 52, height: 'calc(100vh - 52px)', overflowY: 'auto' }}>
        <div style={{ padding: '8px 12px 24px', borderBottom: '.5px solid var(--bl)', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <div
              style={{ width: 38, height: 38, borderRadius: 14, background: 'linear-gradient(135deg, #1D1D1F 0%, #434347 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              {user.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 800, fontSize: '.9rem', letterSpacing: '-0.02em', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', background: 'linear-gradient(90deg, #1b1b1c 0%, #3a3a3c 100%)', color: '#e5e5ea', fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: 100, letterSpacing: '0.04em', textTransform: 'uppercase', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>Pro Pilot</span>
            </div>
          </div>
        </div>
        {SIDE_NAV.map(n => (
          <div key={n.id} className={`slink ${tab === n.id ? 'active' : ''}`} onClick={() => { if (n.id === 'builder') go('livebuilder'); else setTab(n.id); }}>
            <div style={{ width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: tab === n.id ? 1 : 0.7 }}>
              <Icon id={n.ic} size={15} color={tab === n.id ? 'var(--near-black)' : 'var(--ts)'} />
            </div>
            <span style={{ flex: 1, letterSpacing: '-0.01em', pointerEvents: 'none' }}>{n.l}</span>
            {n.neu && (
              <span style={{
                background: tab === n.id ? 'linear-gradient(135deg, #5E5CE6 0%, #8E8DFA 100%)' : 'rgba(94,92,230,0.08)',
                color: tab === n.id ? 'white' : 'var(--ind)',
                fontSize: 9, padding: '2px 7px', borderRadius: 12, fontWeight: 800, boxShadow: tab === n.id ? '0 2px 8px rgba(94,92,230,0.25)' : 'none',
                transition: 'all .2s'
              }}>
                AI
              </span>
            )}
          </div>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '.5px solid var(--bl)' }}>
          <Btn v="dark" sz="sm" full pill onClick={() => go('upload')} style={{ marginBottom: 8 }}><Icon id="plus" size={14} color="white" /> New Analysis</Btn>

          <div className="slink" onClick={() => signOut(auth)}>
            <Icon id="logout" size={18} />
            <span>Log out</span>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {/* Mobile Tab Nav */}
        <div className="hide-desktop" style={{ position: 'sticky', top: 52, zIndex: 99, background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '.5px solid var(--bl)', padding: '12px 16px', gap: 8, overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
          {SIDE_NAV.map(n => (
            <div key={n.id} onClick={() => { if (n.id === 'builder') go('livebuilder'); else setTab(n.id); }} style={{ padding: '8px 16px', background: tab === n.id ? 'var(--near-black)' : 'var(--s1)', color: tab === n.id ? 'white' : 'var(--tp)', borderRadius: 100, fontSize: '.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0, transition: 'all .2s' }}>
              <Icon id={n.ic} size={13} color={tab === n.id ? 'white' : 'var(--tt)'} /> {n.l}
              {n.neu && <span style={{ background: 'var(--ind)', color: 'white', fontSize: 7, padding: '1px 5px', borderRadius: 4, fontWeight: 900 }}>AI</span>}
            </div>
          ))}
        </div>

        <main className="dash-main" style={{ flex: 1, padding: 'clamp(20px, 4vw, 40px) clamp(12px, 3vw, 32px)' }}>
          {renderContent()}
        </main>
      </div>
      <ScanModal />
    </div>
  );
};

export default Dashboard;
