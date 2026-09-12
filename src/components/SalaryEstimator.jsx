import { useState } from 'react';
import Groq from 'groq-sdk';
import Icon from './Icon';
import Btn from './Btn';
import Badge from './Badge';
import FormattedText from './FormattedText';

const MARKETS = ['India', 'United States', 'United Kingdom', 'Remote / Global'];

const SalaryEstimator = ({ scans }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const latest = scans?.[0];
  const resumeText = latest?.text || latest?.name || '';

  const estimate = async () => {
    if (!resumeText) return;
    setLoading(true);
    setResult(null);
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error('Missing VITE_GROQ_API_KEY');
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

      const prompt = `You are an expert compensation analyst with deep knowledge of global tech salaries. Analyze this resume and return salary estimates.

Resume:
"""
${resumeText.substring(0, 3000)}
"""

Return a JSON object with exactly this structure:
{
  "role": "Detected Role Title",
  "level": "Junior | Mid | Senior | Lead | Principal",
  "yoe": "Estimated years of experience (number as string)",
  "topSkills": ["skill1", "skill2", "skill3"],
  "markets": {
    "India": { "min": 800000, "median": 1400000, "max": 2200000, "currency": "INR" },
    "United States": { "min": 90000, "median": 130000, "max": 180000, "currency": "USD" },
    "United Kingdom": { "min": 55000, "median": 80000, "max": 110000, "currency": "GBP" },
    "Remote / Global": { "min": 70000, "median": 100000, "max": 150000, "currency": "USD" }
  },
  "negotiationTips": [
    "Specific tip 1 based on their skills",
    "Specific tip 2",
    "Specific tip 3"
  ],
  "marketInsight": "2-sentence insight about this role's market demand"
}

Use realistic 2024-2025 market data. Return ONLY valid JSON.`;

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' }
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      setResult(parsed);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fmt = (num, currency) => {
    if (currency === 'INR') return `₹${(num / 100000).toFixed(1)}L`;
    return `${currency === 'GBP' ? '£' : '$'}${(num / 1000).toFixed(0)}k`;
  };

  const pct = (min, max, val) => Math.round(((val - min) / (max - min)) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="ru">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: 800, letterSpacing: '-.04em' }}>
            Salary Benchmark
          </h1>
          <Badge type="green">AI</Badge>
        </div>
        <p style={{ color: 'var(--ts)', fontSize: '.9rem' }}>
          Find out your market value across India, US, UK, and Remote based on your actual resume.
        </p>
      </div>

      {!result && (
        <div className="ru card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #22c55e22, #16a34a11)', border: '1.5px solid #22c55e44', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Icon id="trend" size={24} color="var(--green)" />
          </div>
          <h3 style={{ fontWeight: 800, marginBottom: 8, fontSize: '1.1rem' }}>AI Compensation Analysis</h3>
          <p style={{ color: 'var(--ts)', fontSize: '.88rem', lineHeight: 1.6, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
            We'll analyze your resume to detect your role, seniority level, and top skills — then map them against 2024 market benchmarks across 4 geographies.
          </p>
          <Btn v="dark" sz="lg" pill onClick={estimate} disabled={loading || !resumeText}>
            {loading
              ? <><div className="spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', marginRight: 8 }} />Analyzing Market...</>
              : <><Icon id="zap" size={16} color="white" /> Estimate My Salary</>
            }
          </Btn>
          {!resumeText && <p style={{ fontSize: '.78rem', color: 'var(--amber)', marginTop: 12 }}>⚠️ Upload a resume first.</p>}
        </div>
      )}

      {result && (
        <>
          {/* Profile Card */}
          <div className="ru card" style={{ padding: 24, background: 'linear-gradient(135deg, var(--s0), var(--s1))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: 4 }}>Detected Profile</p>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-.03em' }}>{result.role}</h2>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge type="ind">{result.level}</Badge>
                <Badge type="dim">{result.yoe} YoE</Badge>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(result.topSkills || []).map(s => (
                <div key={s} style={{ padding: '4px 12px', background: 'var(--s1)', borderRadius: 100, fontSize: '.75rem', fontWeight: 600, border: '1px solid var(--bl)' }}>{s}</div>
              ))}
            </div>
            {result.marketInsight && (
              <p style={{ marginTop: 16, fontSize: '.83rem', color: 'var(--ts)', lineHeight: 1.6, padding: '12px 16px', background: 'rgba(99,102,241,.06)', borderRadius: 12, borderLeft: '3px solid var(--ind)' }}>
                💡 {result.marketInsight}
              </p>
            )}
          </div>

          {/* Market Bars */}
          <div className="ru card" style={{ padding: 24 }}>
            <p className="eyebrow" style={{ marginBottom: 20 }}>Salary Ranges by Market</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {MARKETS.map(market => {
                const d = result.markets?.[market];
                if (!d) return null;
                return (
                  <div key={market}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{market}</span>
                      <span style={{ fontWeight: 800, fontSize: '.95rem', color: 'var(--green)' }}>{fmt(d.median, d.currency)}<span style={{ fontSize: '.72rem', color: 'var(--ts)', fontWeight: 500 }}> median</span></span>
                    </div>
                    <div style={{ position: 'relative', height: 8, background: 'var(--s2)', borderRadius: 8 }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: 'linear-gradient(90deg, var(--green), #22c55e)', borderRadius: 8, width: '100%', opacity: 0.15 }} />
                      <div style={{ position: 'absolute', left: `${pct(d.min, d.max, d.min)}%`, top: '50%', transform: 'translateY(-50%)', height: 16, width: 2, background: 'var(--ts)', borderRadius: 2 }} />
                      <div style={{ position: 'absolute', left: `${pct(d.min, d.max, d.median)}%`, top: '50%', transform: 'translateY(-50%) translateX(-50%)', height: 18, width: 18, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 3px rgba(34,197,94,.2)' }} />
                      <div style={{ position: 'absolute', left: `${pct(d.min, d.max, d.max)}%`, top: '50%', transform: 'translateY(-50%)', height: 16, width: 2, background: 'var(--ts)', borderRadius: 2 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: '.72rem', color: 'var(--tt)' }}>{fmt(d.min, d.currency)}</span>
                      <span style={{ fontSize: '.72rem', color: 'var(--tt)' }}>{fmt(d.max, d.currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Negotiation Tips */}
          {result.negotiationTips?.length > 0 && (
            <div className="ru card" style={{ padding: 24 }}>
              <p className="eyebrow" style={{ marginBottom: 16 }}>Negotiation Tips</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.negotiationTips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'var(--s1)', borderRadius: 12 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--near-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '.65rem', color: 'white', fontWeight: 800 }}>{i + 1}</div>
                    <div style={{ fontSize: '.85rem', lineHeight: 1.6, color: 'var(--ts)' }}>
                      <FormattedText text={tip} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Btn v="ghost" sz="sm" pill onClick={() => { setResult(null); }} style={{ alignSelf: 'center' }}>
            <Icon id="zap" size={13} color="var(--ind)" /> Re-analyze
          </Btn>
        </>
      )}
    </div>
  );
};

export default SalaryEstimator;
