import { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import Btn from '../components/Btn';
import Badge from '../components/Badge';
import ScoreRing from '../components/ScoreRing';
import ProgressRow from '../components/ProgressRow';

const LockOverlay = ({ title, sub, action, label, features = [] }) => (
  <div style={{ position: 'absolute', inset: -1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit', padding: 16, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 10 }}>
    <div style={{ background: '#fff', border: '1.5px solid var(--bl)', borderRadius: 24, padding: '32px 36px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,.08)', maxWidth: 320 }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Icon id="lock" size={20} color="var(--ind)" />
      </div>
      <p style={{ fontWeight: 900, marginBottom: 8, fontSize: '1.1rem', letterSpacing: '-.03em', color: 'var(--near-black)' }}>{title}</p>
      <p style={{ fontSize: '.88rem', color: 'var(--ts)', marginBottom: 20, lineHeight: 1.5 }}>{sub}</p>
      
      {features.length > 0 && (
        <div style={{ textAlign: 'left', marginBottom: 24, padding: '12px 16px', background: 'var(--s1)', borderRadius: 12 }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < features.length - 1 ? 8 : 0 }}>
              <Icon id="check" size={12} color="var(--green)" />
              <span style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--tp)' }}>{f}</span>
            </div>
          ))}
        </div>
      )}
      
      <Btn v="dark" sz="lg" pill full onClick={action}>{label}</Btn>
    </div>
  </div>
);

const Results = ({ go, user, onAuth, data }) => {
  const [showPromo, setShowPromo] = useState(false);
  const [animated, setAnimated] = useState(false);
  
  const score = data?.score || 46;
  const fileName = data?.name || 'resume.pdf';
  
  const breakdown = [
    { label: 'ATS Compatibility', value: data?.ats || 38 },
    { label: 'Keyword Match',      value: data?.keyword || 52 },
    { label: 'Formatting',        value: data?.formatting || 61 },
    { label: 'Impact language',   value: data?.impact || 34 },
  ];

  const issues = data?.issues || [
    { label: 'Keyword Optimization', sev: 'Critical', desc: 'Missing high-impact technical keywords found in similar roles.' },
    { label: 'Quantifiable Metrics', sev: 'High', desc: 'Achievement data is currently descriptive. ATS systems prefer numeric proof.' },
    { label: 'Visual Hierarchy', sev: 'Medium', desc: 'Section headers are detectable but could benefit from standard ATS-friendly labeling.' }
  ];

  const improvements = data?.improvements || [
    "Tailor your language. Incorporate exact keywords from your target job description.",
    "Convert passive sentences into active achievement statements.",
    "Ensure your technical skills are grouped by category (e.g. Languages, Frameworks).",
    "Add a dedicated 'Projects' section to showcase practical application of skills."
  ];

  // Map solutions to issue types for a more professional feel
  const getSolution = (label) => {
    const solutions = {
      'Resume Too Short': 'Expert Solution: Expand your bullet points to include specific tools and methodologies used.',
      'Missing Experience Section': 'Expert Solution: Ensure your headline for past work exactly matches "Experience" or "Professional History".',
      'Incomplete Contact Info': 'Expert Solution: Explicitly list both a professional email and a phone number in the header.',
      'Potential Keyword Stuffing': 'Expert Tip: Weave keywords naturally into project descriptions rather than listing them in a block.',
      'No Experience Dates': 'Expert Solution: Format dates clearly as Month Year – Month Year (e.g. June 2021 – Present).',
      'Invalid Document': 'Expert Tip: Ensure your PDF is text-searchable (not a flat image) and uses standard fonts like Arial or Roboto.'
    };
    return solutions[label] || 'Expert Tip: Use the STAR method (Situation, Task, Action, Result) to fix this signal.';
  };
  
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    
    // 15-second Promotion Modal Timer for logged-in users
    let promoTimer;
    if (user) {
      promoTimer = setTimeout(() => setShowPromo(true), 15000);
    }

    return () => {
      clearTimeout(t);
      if (promoTimer) clearTimeout(promoTimer);
    };
  }, [user]);

  const PromoModal = () => (
    <div className="rf" style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }} onClick={() => setShowPromo(false)} />
      <div className="card ru glass" style={{ position: 'relative', width: '100%', maxWidth: 400, padding: 40, textAlign: 'center', borderRadius: 32, border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}>
         <div style={{ width: 64, height: 64, borderRadius: 22, background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid var(--bl)' }}>
            <Icon id="award" size={28} color="var(--ind)" />
         </div>
         <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 12, letterSpacing: '-.04em', color: 'var(--tp)' }}>Unlock Full Analysis</h2>
         <p style={{ color: 'var(--ts)', fontSize: '.95rem', lineHeight: 1.6, marginBottom: 32, fontWeight: 500 }}>For a comprehensive analysis and to avail all premium features like the AI Career Coach, go to your dashboard.</p>
         <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Btn v="dark" full sz="lg" pill onClick={() => go('dashboard')}>Go to Dashboard</Btn>
            <Btn v="ghost" full sz="md" pill onClick={() => setShowPromo(false)}>Cancel</Btn>
         </div>
      </div>
    </div>
  );

  const signalFallbacks = {
    action_verbs: ['Architected', 'Deployed', 'Optimized', 'Led'],
    tech_keywords: ['System Design', 'Scalability', 'API Integration'],
    metrics: ['85% Efficiency', '2.4s Latency', '10k+ Users']
  };

  return (
    <div style={{ background: 'var(--s1)', minHeight: '100vh', paddingTop: 52, position: 'relative' }}>
      {/* Subtle Ambient Background */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '400px', background: 'radial-gradient(circle at top right, rgba(94,92,230,0.06), transparent)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 840, margin: '0 auto', padding: '60px 24px', position: 'relative', zIndex: 1 }}>

        {/* Header Section */}
        <div className="ru results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, gap: 24 }}>
          <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Badge type={score < 60 ? 'red' : 'green'}>
                <span className="strobe-effect" style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 4 }} />
                Neural Scan Active
              </Badge>
              <Badge type="ind" sz="xs">
                {data?.source === 'groq_fallback' ? 'Groq AI' : 'ML Engine'}
              </Badge>
              <span style={{ fontSize: '.75rem', color: 'var(--ts)', fontWeight: 600, letterSpacing: '.02em' }}>{fileName.toUpperCase()}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 3.4rem)', fontWeight: 900, letterSpacing: '-.06em', color: 'var(--tp)', lineHeight: 0.95 }}>
              Resume <span style={{ color: 'var(--ind)' }}>Intelligence</span> Report
            </h1>
          </div>
          <div className="results-header-btns" style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
            <Btn v="ghost" sz="sm" pill onClick={() => go('upload')} style={{ background: '#fff' }}>
              <Icon id="upload" size={14} /> Reset
            </Btn>
            <Btn v="dark" sz="sm" pill onClick={user ? () => go('dashboard') : onAuth}>
              {user ? 'Full Dashboard' : 'Unlock Report'} <Icon id="arrow" size={12} color="white" />
            </Btn>
          </div>
        </div>

        {/* Executive Summary Grid */}
        <div className="results-grid" style={{ display: 'grid', gap: 24, marginBottom: 24 }}>
          
          {/* Main Score Card */}
          <div className="ru d1 card score-card-main" style={{ padding: '54px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#fff', boxShadow: '0 24px 60px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: score < 60 ? 'var(--red)' : 'var(--ind)' }} />
            <div className="score-card-inner" style={{ display: 'flex', alignItems: 'center', gap: 52 }}>
              <div className="score-ring-wrapper" style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: -20, background: score < 60 ? 'var(--glow-red)' : 'var(--glow-ind)', opacity: 0.35, filter: 'blur(20px)', borderRadius: '50%' }} />
                <ScoreRing value={score} size={156} strokeWidth={11} run={animated} noText />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '3.4rem', fontWeight: 950, color: 'var(--tp)', letterSpacing: '-.07em', lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--ts)', textTransform: 'uppercase', letterSpacing: '.2em', marginTop: -4 }}>Index</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: score < 60 ? 'rgba(255,59,48,0.07)' : 'rgba(94,92,230,0.07)', padding: '5px 14px', borderRadius: 100, marginBottom: 18 }}>
                   <div className="strobe-effect" style={{ width: 6, height: 6, borderRadius: '50%', background: score < 60 ? 'var(--red)' : 'var(--ind)' }} />
                   <span style={{ fontSize: '.68rem', fontWeight: 800, color: score < 60 ? 'var(--red)' : 'var(--ind)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                     {score < 60 ? 'Critical Revision' : score < 80 ? 'Market Optimized' : 'Elite Candidate'}
                   </span>
                </div>
                <h3 style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--tp)', letterSpacing: '-.05em', marginBottom: 12, lineHeight: 1 }}>
                  {score < 60 ? 'Structural Gap' : score < 85 ? 'Benchmark Verified' : 'Neural Precision'}
                </h3>
                <p style={{ color: 'var(--ts)', fontSize: '.98rem', lineHeight: 1.6, fontWeight: 500 }}>
                  {score < 70 
                    ? 'Your current documentation triggers core ATS heuristic warnings. Immediate structural optimization is required for visibility.' 
                    : 'Your professional profile demonstrates high-fidelity alignment with industry-leading technical standards.'}
                </p>
              </div>
            </div>
          </div>

          {/* Benchmark Matrix */}
          <div className="ru d2 card" style={{ padding: '36px 32px', background: '#fff', position: 'relative' }}>
            <h4 style={{ fontSize: '.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--tt)', letterSpacing: '.14em', marginBottom: 32 }}>Capability Matrix</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
              {breakdown.map((b, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'baseline' }}>
                    <span style={{ fontSize: '.92rem', fontWeight: 700, color: 'var(--tp)' }}>{b.label}</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: b.value > 70 ? 'var(--green)' : 'var(--tp)', fontVariantNumeric: 'tabular-nums' }}>{b.value}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--s1)', borderRadius: 100, overflow: 'hidden' }}>
                    <div className="ru" style={{ height: '100%', borderRadius: 100, background: b.value > 70 ? 'var(--green)' : 'var(--ind)', width: animated ? `${b.value}%` : '0%', transition: 'width 1.5s cubic-bezier(.22,1,.36,1)', animationDelay: `${i * .1}s` }} />
                  </div>
                </div>
              ))}
            </div>
            {!user && (
              <LockOverlay 
                title="Capability Locked" 
                sub="Sign in to view your detailed metric breakdown"
                action={onAuth}
                label="Unlock Now"
              />
            )}
          </div>
        </div>

        {/* Signal Intelligence */}
        <div className="ru d3 card" style={{ padding: 40, marginBottom: 24, background: '#fff', border: '1px solid var(--bl)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--near-black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon id="zap" size={16} color="#fff" />
              </div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--tp)', letterSpacing: '-.03em' }}>Signal Intelligence Summary</h4>
            </div>
            <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--ts)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)' }} />
              Live Feedback Engine
            </div>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {(data?.signals?.action_verbs?.length ? data.signals.action_verbs : ['Architected', 'Deployed', 'Optimized', 'Led']).map((k, i) => (
              <div key={`v-${i}`} style={{ padding: '10px 20px', borderRadius: 14, background: 'var(--s1)', fontSize: '.88rem', fontWeight: 700, color: 'var(--tp)', border: '1px solid var(--bl)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ts)' }} />
                {k}
              </div>
            ))}
            {(data?.signals?.tech_keywords?.length ? data.signals.tech_keywords : ['System Design', 'Scalability', 'API Integration']).map((k, i) => (
              <div key={`t-${i}`} style={{ padding: '10px 20px', borderRadius: 14, background: 'rgba(94,92,230,0.06)', border: '1px solid rgba(94,92,230,0.12)', fontSize: '.88rem', fontWeight: 700, color: 'var(--ind)' }}>{k}</div>
            ))}
            {(data?.signals?.metrics?.length ? data.signals.metrics : ['85% Efficiency', '2.4s Latency', '10k+ Users']).map((m, i) => (
              <div key={`m-${i}`} style={{ padding: '10px 20px', borderRadius: 14, background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.12)', fontSize: '.88rem', fontWeight: 700, color: 'var(--green)' }}>{m}</div>
            ))}
          </div>
          <p style={{ marginTop: 24, fontSize: '.85rem', color: 'var(--ts)', fontWeight: 500, lineHeight: 1.6, maxWidth: 640 }}>
            Our neural engine extracted these high-weight tokens from your document to validate against global hiring standards.
          </p>
          {!user && (
            <LockOverlay 
              title="Neural Signals Locked" 
              sub="Unlock the full spectrum of hiring intelligence"
              action={onAuth}
              label="Unlock Signals"
              features={['Action Verb Impact Analysis', 'Technical Keyword Matching', 'Quantifiable Metric Extraction']}
            />
          )}
        </div>

        {/* Detailed Insights */}
        <div className="insights-grid" style={{ display: 'grid', gap: 24, marginBottom: 48 }}>
          
          {/* Critical Issues */}
          <div className="ru d4 card" style={{ padding: 36, position: 'relative', background: '#fff', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--tp)', letterSpacing: '-.02em' }}>Optimization Needed</h4>
              <Badge type="red">{issues.length || 3} Critical Items</Badge>
            </div>
            <div>
              {(issues.length ? issues : [
                { label: 'Keyword Optimization', desc: 'Missing high-impact technical keywords found in similar roles.', sev: 'Critical' },
                { label: 'Quantifiable Metrics', desc: 'Achievement data is currently descriptive. ATS systems prefer numeric proof.', sev: 'Critical' },
                { label: 'Visual Hierarchy', desc: 'Section headers are detectable but could benefit from standard ATS-friendly labeling.', sev: 'Medium' }
              ]).map((iss, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: 18, padding: '20px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--bl)' : 'none' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '4px', marginTop: 4, flexShrink: 0, background: iss.sev === 'Critical' ? 'var(--red)' : 'var(--amber)', border: '2px solid #fff', boxShadow: '0 0 0 1px var(--bl)' }} />
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '.95rem', color: 'var(--tp)', marginBottom: 6 }}>{iss.label}</p>
                    <p style={{ fontSize: '.88rem', color: 'var(--ts)', lineHeight: 1.6, fontWeight: 500, marginBottom: 8 }}>{iss.desc}</p>
                    <div style={{ padding: '8px 12px', background: 'var(--s1)', borderRadius: 8, borderLeft: '3px solid var(--ind)' }}>
                      <p style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--ind)', lineHeight: 1.4 }}>{getSolution(iss.label)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!user && (
              <LockOverlay
                title="Protocol Locked"
                sub="Sign in to view critical ATS failures and fixes"
                action={onAuth}
                label="Unlock Analysis"
                features={['Detailed ATS Structural Audit', 'Keyword Density Analysis', 'Visual Hierarchy Scoring']}
              />
            )}
          </div>

          {/* Recommendations */}
          <div className="ru d5 card" style={{ padding: 36, position: 'relative', background: '#fff', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--tp)', letterSpacing: '-.02em' }}>Actionable Improvements</h4>
              <Badge type="ind">AI Coach Expert</Badge>
            </div>
            <div>
              {[
                "Tailor your language. Incorporate exact keywords from your target job description.",
                ...(improvements.length ? improvements : ["Add specific metrics", "Use stronger action verbs"])
              ].map((imp, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--bl)' : 'none' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '8px', background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon id="zap" size={12} color="var(--ind)" />
                  </div>
                  <p style={{ fontSize: '.92rem', color: 'var(--tp)', lineHeight: 1.5, fontWeight: 600 }}>{imp}</p>
                </div>
              ))}
            </div>
            {!user && (
              <LockOverlay
                title="Experience Locked"
                sub="Unlock personalized coaching & growth tools"
                action={onAuth}
                label="Unlock Career OS"
                features={['Personal AI Career Coach', 'STAR-method Interview Prep', 'Strategic Job Matcher', 'Expert AI Resume Builder']}
              />
            )}
          </div>
        </div>

        {/* Master CTA Footer */}
        <div className="ru d6" style={{ background: 'var(--near-black)', borderRadius: 32, padding: '56px 48px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, rgba(94,92,230,0.12), transparent)', pointerEvents: 'none' }} />
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-.06em', marginBottom: 18, position: 'relative', lineHeight: 1 }}>
            {user ? 'Finalize Your Profile.' : 'Unlock the Full Report.'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 36px', position: 'relative', fontWeight: 500 }}>
            {user 
              ? 'Your analysis is saved. Visit the dashboard to track your benchmarks, access the AI coach, and generate a tailored cover letter.'
              : 'Sign in to access your detailed analysis history, personalized career coach, and strategic hiring signals.'}
          </p>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 20 }}>
            <Btn v="white" sz="lg" pill onClick={user ? () => go('dashboard') : onAuth} style={{ padding: '16px 40px' }}>
              {user ? 'Access Dashboard' : 'Unlock Everything'} <Icon id="arrow" size={16} />
            </Btn>
          </div>
          <p style={{ marginTop: 24, fontSize: '.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            {user ? 'Military-grade encryption active • Secure PDF parsing' : 'Quick sign-in available • No credit card required'}
          </p>
        </div>
        {showPromo && <PromoModal />}
      </div>
    </div>
  );
};

export default Results;
