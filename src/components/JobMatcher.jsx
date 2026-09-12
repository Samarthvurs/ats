import { useState } from 'react';
import { callGroq, cleanJsonResponse } from '../services/ai';
import Icon from './Icon';
import Btn from './Btn';
import Badge from './Badge';

const JobMatcher = ({ resumeText = "" }) => {
  const [jd, setJd] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJd(text);
    } catch (e) {
      alert("Clipboard access denied. Please paste manually.");
    }
  };

  const sampleJD = `Senior Frontend Engineer (React)
Requirements:
- 4+ years of experience with React, JavaScript (ES6+), and modern CSS
- Strong understanding of web performance, accessibility, and clean architecture
- Experience with state management (Redux, Zustand)
- Comfortable with REST APIs and asynchronous programming
- Strong mentorship and communication skills`;

  const performMatch = async () => {
    if (!jd.trim()) return;
    setLoading(true);
    
    try {
      
      const prompt = `
        You are an expert technical recruiter matching a resume to a job description.
        Job Description:
        ${jd}

        Resume:
        ${resumeText}

        Evaluate the resume strictly against the JD. Respond ONLY with a JSON object in this exact format:
        {
          "score": number (0-100 match percentage),
          "match_analysis": "Detailed string explaining exactly why the resume matches or falls short, and overall strategic thoughts",
          "matched_skills": ["List of core skills found in both"],
          "missing_skills": ["List of critical skills missing from resume"],
          "action_plan": [
            { "step": "Short action title", "reason": "Detailed explanation of what to do" }
          ],
          "what_to_learn": ["Specific tech 1", "Specific tech 2"],
          "roadmap_slug": "A valid slug from roadmap.sh (e.g. frontend, backend, devops, python, react, full-stack, computer-science) that best fits the missing skills"
        }
        Return ONLY valid JSON.
      `;

      const completion = await callGroq(prompt, { json: true });
      const textContent = completion.choices[0]?.message?.content || "{}";
      const resultData = cleanJsonResponse(textContent);
      setResult(resultData || {});
    } catch (err) {
      console.error(err);
      alert("Failed to connect to AI match engine: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="ru card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--ind)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon id="target" size={20} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Job Match v2.0</h2>
          <p style={{ fontSize: '.8rem', color: 'var(--ts)' }}>Enterprise-grade JD analysis and skill gap reporting.</p>
        </div>
      </div>

      {!result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn .4s ease' }}>
          {/* Pre-Analysis Banner */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 16, background: 'rgba(94,92,230,.05)', borderRadius: 16, border: '1px solid rgba(94,92,230,.15)' }}>
            <div style={{ flex: '1 1 45%', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(94,92,230,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon id="star" size={14} color="var(--ind)" />
              </div>
              <div>
                <p style={{ fontSize: '.75rem', fontWeight: 800 }}>Skill Extraction</p>
                <p style={{ fontSize: '.65rem', color: 'var(--ts)' }}>Maps your skills to JD</p>
              </div>
            </div>
            <div style={{ flex: '1 1 45%', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(48,209,88,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon id="target" size={14} color="var(--green)" />
              </div>
              <div>
                <p style={{ fontSize: '.75rem', fontWeight: 800 }}>Keyword Density</p>
                <p style={{ fontSize: '.65rem', color: 'var(--ts)' }}>Checks ATS thresholds</p>
              </div>
            </div>
            <div style={{ flex: '1 1 45%', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,159,10,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon id="award" size={14} color="var(--amber)" />
              </div>
              <div>
                <p style={{ fontSize: '.75rem', fontWeight: 800 }}>Experience Level</p>
                <p style={{ fontSize: '.65rem', color: 'var(--ts)' }}>Validates seniority</p>
              </div>
            </div>
            <div style={{ flex: '1 1 45%', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,59,48,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon id="trend" size={14} color="var(--red)" />
              </div>
              <div>
                <p style={{ fontSize: '.75rem', fontWeight: 800 }}>Skill Gaps</p>
                <p style={{ fontSize: '.65rem', color: 'var(--ts)' }}>Actionable roadmaps</p>
              </div>
            </div>
          </div>

          {/* Premium Input Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 4px' }}>
               <label style={{ fontSize: '.8rem', fontWeight: 700, letterSpacing: '-.01em' }}>Target Job Description</label>
               <div style={{ display: 'flex', gap: 8 }}>
                 <Btn v="ghost" sz="xs" pill onClick={() => setJd(sampleJD)}>Try Sample JD</Btn>
                 <Btn v="ghost" sz="xs" pill onClick={handlePaste}><Icon id="file" size={12}/> Paste</Btn>
                 <Btn v="ghost" sz="xs" pill onClick={() => setJd('')} disabled={!jd} style={{ opacity: jd ? 1 : 0.5 }}>Clear</Btn>
               </div>
            </div>
            <div style={{ position: 'relative', borderRadius: 20, background: '#fff', border: '1px solid var(--bl)', padding: 2, transition: 'box-shadow .2s ease-in-out', boxShadow: '0 8px 30px rgba(0,0,0,0.03)' }} 
                 onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 4px rgba(94,92,230,.15)'}
                 onBlur={(e) => e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.03)'}>
              <textarea 
                className="inp" 
                placeholder="Paste the complete Job Description here... Our AI will cross-reference your resume profile instantly." 
                style={{ height: 240, fontSize: '.85rem', lineHeight: 1.6, border: 'none', background: 'transparent', boxShadow: 'none', outline: 'none', padding: 20 }}
                value={jd}
                onChange={e => setJd(e.target.value)}
              />
              <div style={{ position: 'absolute', bottom: 12, right: 16, fontSize: '.7rem', fontWeight: 600, color: 'var(--tt)', background: '#fff', padding: '2px 6px', borderRadius: 6, pointerEvents: 'none' }}>
                {jd.length} chars
              </div>
            </div>
          </div>

          {/* Expected Output Preview */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--s1)', borderRadius: 16, alignItems: 'center', opacity: 0.8 }}>
            <div>
               <p style={{ fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ts)', letterSpacing: '.05em' }}>Expected Output</p>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 6 }}>
                 <p style={{ fontSize: '.8rem', fontWeight: 600 }}><Icon id="award" size={12} color="var(--ind)" /> Match Score</p>
                 <p style={{ fontSize: '.8rem', fontWeight: 600 }}><Icon id="target" size={12} color="var(--red)" /> Skill Gaps</p>
                 <p style={{ fontSize: '.8rem', fontWeight: 600 }}><Icon id="brain" size={12} color="var(--green)" /> AI Suggestions</p>
               </div>
            </div>
          </div>

          {/* Enhanced CTA */}
          <div style={{ marginTop: 8 }}>
            <button 
              onClick={performMatch} 
              disabled={loading || !jd.trim()}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: 100,
                border: 'none',
                background: (!jd.trim() || loading) ? 'var(--s2)' : 'linear-gradient(135deg, #1D1D1F 0%, #434347 100%)',
                color: (!jd.trim() || loading) ? 'var(--ts)' : 'white',
                fontSize: 16,
                fontWeight: 800,
                cursor: (!jd.trim() || loading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all .3s cubic-bezier(.22,1,.36,1)',
                boxShadow: (!jd.trim() || loading) ? 'none' : '0 12px 28px rgba(0,0,0,0.18)',
                transform: (!jd.trim() || loading) ? 'scale(1)' : 'translateY(0)'
              }}
              onMouseEnter={(e) => { if (jd.trim() && !loading) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.22)'; } }}
              onMouseLeave={(e) => { if (jd.trim() && !loading) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.18)'; } }}
              onMouseDown={(e) => { if (jd.trim() && !loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { if (jd.trim() && !loading) e.currentTarget.style.transform = 'scale(1.02)'; }}
            >
              {loading ? (
                <>
                  <div className="spin" style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                  Analyzing Match...
                </>
              ) : (
                <>🚀 Analyze My Job Match</>
              )}
            </button>
            <p style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--ts)', marginTop: 14, fontWeight: 500 }}>
              ✨ AI will suggest exactly how to improve your resume for this role
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeIn .4s ease' }}>
          
          {/* Score Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 24, background: 'var(--near-black)', borderRadius: 24, color: 'white' }}>
             <div style={{ position: 'relative', width: 90, height: 90 }}>
                <svg width="90" height="90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="var(--ind)" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * result.score / 100)} transform="rotate(-90 50 50)" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.4rem' }}>{result.score}%</div>
             </div>
             <div>
               <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{result.score > 75 ? 'Ready to Apply' : 'Skill Gap Detected'}</h3>
               <p style={{ fontSize: '.84rem', color: 'rgba(255,255,255,.6)', marginTop: 4 }}>
                 {result.score > 75 ? "Your profile is a top-tier match for this role." : "A few critical keywords are missing to clear the ATS threshold."}
               </p>
               <Btn v="white" sz="xs" pill onClick={() => setResult(null)} style={{ marginTop: 12 }}>Check Another Role</Btn>
             </div>
          </div>

          {/* Detailed Match Analysis */}
          <div className="card-tint" style={{ padding: 24 }}>
             <h4 style={{ fontSize: '.9rem', fontWeight: 800, marginBottom: 12 }}>Match Analysis</h4>
             <p style={{ fontSize: '.85rem', color: 'var(--ts)', lineHeight: 1.6 }}>{result.match_analysis}</p>
          </div>

          {/* Skills Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
             <div className="card" style={{ padding: 16, borderTop: '4px solid var(--green)' }}>
                <h4 style={{ fontSize: '.8rem', fontWeight: 800, marginBottom: 12, color: 'var(--green)' }}>Matched Skills</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.matched_skills?.map(s => <Badge key={s} type="green">{s}</Badge>)}
                </div>
             </div>
             <div className="card" style={{ padding: 16, borderTop: '4px solid var(--red)' }}>
                <h4 style={{ fontSize: '.8rem', fontWeight: 800, marginBottom: 12, color: 'var(--red)' }}>Missing Skills</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.missing_skills?.map(s => <Badge key={s} type="dim">{s}</Badge>)}
                </div>
             </div>
          </div>

          {/* Actionable Recommendations & Learning Path */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
             <div className="card" style={{ padding: 24, gridColumn: 'span 2' }}>
                <h4 className="eyebrow" style={{ marginBottom: 16 }}>What to Do First</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   {result.action_plan?.map((act, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12 }}>
                         <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--s1)', color: 'var(--ts)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i+1}</div>
                         <div>
                            <h5 style={{ fontSize: '.85rem', fontWeight: 700 }}>{act.step}</h5>
                            <p style={{ fontSize: '.75rem', color: 'var(--ts)', marginTop: 4, lineHeight: 1.5 }}>{act.reason}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             <div className="card" style={{ padding: 24, background: 'var(--ind)', color: 'white', gridColumn: '1 / -1' }}>
                <h4 className="eyebrow" style={{ marginBottom: 16, color: 'rgba(255,255,255,.7)' }}>What to Learn</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {result.what_to_learn?.map(l => (
                     <span key={l} style={{ background: 'rgba(0,0,0,.2)', padding: '6px 12px', borderRadius: 8, fontSize: '.75rem', fontWeight: 600 }}>{l}</span>
                  ))}
                </div>
                
                {result.roadmap_slug && (
                  <Btn v="white" sz="lg" full onClick={() => window.open(`https://roadmap.sh/${result.roadmap_slug?.toLowerCase()}`, '_blank')}>
                    View {result.roadmap_slug} Roadmap <Icon id="arrow" size={14} color="var(--ind)" />
                  </Btn>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobMatcher;
