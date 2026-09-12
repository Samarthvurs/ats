import Icon from '../components/Icon';
import Btn from '../components/Btn';
import Badge from '../components/Badge';

const Landing = ({ go, onAuth }) => {
  const stats = [
    { val: '94%',  sub: 'Prediction accuracy' },
    { val: '2.8s', sub: 'Analysis time'       },
    { val: '50K+', sub: 'Resumes analyzed'    },
  ];

  const steps = [
    { n: '01', ic: 'target',    t: 'Screen',    b: 'Rank a resume batch against your JD with hybrid semantic + keyword matching.' },
    { n: '02', ic: 'ai',        t: 'Interview',  b: 'Auto-generated, candidate-specific interview kits from real matched/missing skills.' },
    { n: '03', ic: 'mail',      t: 'Communicate', b: 'Personalized interview, rejection and offer emails — ready to send from your inbox.' },
    { n: '04', ic: 'award',     t: 'Offer & hire', b: 'Generate an offer letter as a PDF and track every candidate through to hire.' },
  ];

  return (
    <div style={{ paddingTop: 52 }}>

      {/* ── HERO ── */}
      <section className="grain bg-grid" style={{ background: 'var(--near-black)', position: 'relative', overflow: 'hidden', paddingBottom: 110 }}>
        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(94,92,230,.12) 0%,transparent 65%)', pointerEvents: 'none', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,59,48,.05) 0%,transparent 70%)', pointerEvents: 'none', filter: 'blur(50px)' }} />

        <div className="hero-grid" style={{ maxWidth: 1120, margin: '0 auto', padding: '96px 28px 0', display: 'grid', alignItems: 'center' }}>

          {/* Left — copy */}
          <div>
            <div className="ru" style={{ marginBottom: 24 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.05)', border: '.5px solid rgba(255,255,255,.1)', borderRadius: 100, padding: '6px 16px 6px 10px' }}>
                <span className="strobe-effect" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ind)', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--td)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Now in Private Beta</span>
              </span>
            </div>

            <h1 className="ru d1 hero-headline" style={{ fontFamily: "'Instrument Sans'", fontSize: 'clamp(3rem, 6vw, 5.2rem)', fontWeight: 950, letterSpacing: '-.06em', lineHeight: 0.9, color: 'var(--tw)', marginBottom: 24 }}>
              Hiring,<br />
              <span style={{ color: 'rgba(255,255,255,.3)', fontStyle: 'italic', fontFamily: "'Instrument Serif',serif" }}>end to end.</span>
            </h1>

            <p className="ru d2 hero-sub" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', color: 'var(--td)', maxWidth: 480, marginBottom: 44, lineHeight: 1.6, fontWeight: 500 }}>
              Resumeeit ranks a resume batch against a job description with real semantic + keyword matching, then carries every candidate through screening, interview prep, and offer — all in one place.
            </p>

            <div className="ru d3 cta-group" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 64 }}>
              <Btn v="white" sz="xl" pill strobe onClick={() => go('recruiting')}>
                Start Recruiting <Icon id="target" size={16} />
              </Btn>
              <Btn v="ghost-dark" sz="xl" pill onClick={() => go('dashboard')}>
                My Dashboard
              </Btn>
            </div>

            {/* Core Pillars */}
            <div className="ru d4 stats-row" style={{ display: 'flex', gap: 0, paddingTop: 40, borderTop: '.5px solid var(--bd)' }}>
                <div style={{ padding: '0 32px 0 0', borderRight: '.5px solid var(--bd)' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--tw)', letterSpacing: '-.03em', marginBottom: 4 }}>Neural</div>
                  <div style={{ fontSize: 10, color: 'var(--td)', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>Intelligence</div>
                </div>
                <div style={{ padding: '0 32px', borderRight: '.5px solid var(--bd)' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--tw)', letterSpacing: '-.03em', marginBottom: 4 }}>In-Memory</div>
                  <div style={{ fontSize: 10, color: 'var(--td)', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>Privacy</div>
                </div>
                <div style={{ padding: '0 0 0 32px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--tw)', letterSpacing: '-.03em', marginBottom: 4 }}>100%</div>
                  <div style={{ fontSize: 10, color: 'var(--td)', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>Actionable</div>
                </div>
            </div>
          </div>

          {/* Right — preview card with Scanning effect */}
          <div className="ru d3 flt">
            <div className="glass-dark" style={{ padding: 40, borderRadius: 36, boxShadow: '0 60px 120px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
              <div className="laser" style={{ animationDuration: '4s' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>Neural Extraction Active</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: "'Instrument Sans'", fontSize: '4.2rem', fontWeight: 900, color: 'var(--tw)', letterSpacing: '-.07em', lineHeight: 1 }}>88</span>
                    <span style={{ color: 'var(--ind)', fontWeight: 900, fontSize: '1.6rem' }}>%</span>
                  </div>
                </div>
                <Badge type="ind">Elite</Badge>
              </div>
              <div className="div-dark" style={{ margin: '0 0 32px', opacity: 0.3 }} />
              {[
                ['Intelligence Signal','92%','var(--ind)'],
                ['Infrastructure Alignment','86%','var(--green)'],
                ['Quantifiable Impact','79%','var(--amber)'],
                ['Heuristic Match','94%','var(--ind)']
              ].map(([l, v, c], i) => (
                <div key={i} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{l}</span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>{v}</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,.05)', borderRadius: 100 }}>
                    <div className="ru" style={{ height: '100%', borderRadius: 100, background: c, width: v, boxShadow: `0 0 16px ${c}33`, transition: 'width 2s cubic-bezier(.22,1,.36,1)', animationDelay: `${1 + i * 0.1}s` }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 24, padding: '14px 18px', background: 'rgba(255,255,255,.05)', border: '.5px solid rgba(255,255,255,.08)', borderRadius: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="strobe-effect" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontWeight: 600 }}>Neural engine validated 24 signal tokens</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRIVACY PILLAR ── */}
      <div style={{ borderBottom: '.5px solid var(--bl)', background: 'var(--s1)', padding: '24px 0' }}>
        <div className="proof-bar" style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Icon id="lock" size={14} color="var(--ts)" />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ts)', whiteSpace: 'nowrap' }}>
            Privacy Protocol: Your data never leaves your browser during analysis
          </span>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section className="section-pad" style={{ maxWidth: 1120, margin: '0 auto', padding: '110px 28px' }}>
        <div className="how-grid" style={{ display: 'grid', alignItems: 'center' }}>
          <div>
            <div className="ru" style={{ marginBottom: 20 }}>
              <Badge type="dim">Technology</Badge>
            </div>
            <h2 className="ru d1" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 900, letterSpacing: '-.06em', lineHeight: 1, marginBottom: 24 }}>
              Static Scores are<br />
              <span style={{ color: 'var(--ind)' }}>Obsolete.</span>
            </h2>
            <p className="ru d2" style={{ fontSize: '1.05rem', color: 'var(--ts)', lineHeight: 1.7, fontWeight: 500 }}>
              While generic ATS checkers look for exact strings, Resumeeit uses a custom-trained neural engine to identify high-fidelity engineering signals and infrastructure alignment.
            </p>
          </div>
          <div className="how-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {steps.map((s, i) => (
              <div key={i} className="card-tint ru" style={{ padding: '32px 28px', animationDelay: `${i * .1}s`, background: '#fff', border: '1px solid var(--bl)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                   <Icon id={s.ic} size={20} color="var(--near-black)" />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-.03em', marginBottom: 12 }}>{s.t}</h3>
                <p style={{ fontSize: '.9rem', color: 'var(--ts)', lineHeight: 1.6, fontWeight: 500 }}>{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAREER OS PILLAR ── */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px 100px' }}>
        <div className="card career-os-card" style={{ padding: '56px 48px', position: 'relative', overflow: 'hidden', background: 'var(--near-black)' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 400, height: 400, background: 'radial-gradient(circle, rgba(94,92,230,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          <div style={{ position: 'relative', z: 2 }}>
            <h3 style={{ fontSize: '2.4rem', fontWeight: 950, color: '#fff', letterSpacing: '-.05em', marginBottom: 20 }}>Beyond the Scan.</h3>
            <p style={{ color: 'var(--td)', fontSize: '1.2rem', lineHeight: 1.6, maxWidth: 640, marginBottom: 40, fontWeight: 500 }}>
              Resumeeit builds your <strong style={{color:'#fff'}}>Career Strategy</strong>. From identifying mission-critical structural gaps to generating tailored tactical advice, we provide the operating system for your professional growth.
            </p>
            <div className="career-os-stats" style={{ display: 'flex', gap: 32 }}>
               <div>
                  <p style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: 6 }}>10x</p>
                  <p style={{ fontSize: '.7rem', color: 'var(--td)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em' }}>Signal Strength</p>
               </div>
               <div className="div-v" style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.1)' }} />
               <div>
                  <p style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: 6 }}>Custom</p>
                  <p style={{ fontSize: '.7rem', color: 'var(--td)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em' }}>Neural Models</p>
               </div>
               <div className="div-v" style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.1)' }} />
               <div>
                  <p style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: 6 }}>Private</p>
                  <p style={{ fontSize: '.7rem', color: 'var(--td)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em' }}>Local Engine</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <section className="grain" style={{ background: 'var(--near-black)', padding: '88px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: '-30%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(94,92,230,.06) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 580, margin: '0 auto', position: 'relative' }}>
          <p className="eyebrow-light eyebrow ru" style={{ marginBottom: 18 }}>Start today</p>
          <h2 className="ru d1" style={{ fontFamily: "'Instrument Sans'", fontSize: 'clamp(2rem,5vw,3.6rem)', fontWeight: 700, letterSpacing: '-.05em', color: 'var(--tw)', marginBottom: 16, lineHeight: 1.08 }}>
            Stop guessing.<br />
            <span style={{ color: 'rgba(255,255,255,.28)', fontStyle: 'italic', fontFamily: "'Instrument Serif',serif" }}>Start winning.</span>
          </h2>
          <p className="ru d2" style={{ color: 'var(--td)', fontSize: 'clamp(.95rem,1.3vw,1.1rem)', marginBottom: 36, lineHeight: 1.7 }}>
            From a resume batch to a signed offer — one pipeline, fully explainable.
          </p>
          <div className="ru d3 cta-group" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Btn v="white" sz="xl" pill onClick={() => go('recruiting')}>
              Start Recruiting <Icon id="arrow" size={16} />
            </Btn>
            <Btn v="ghost-dark" sz="xl" pill onClick={() => go('dashboard')}>
              My Dashboard
            </Btn>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
