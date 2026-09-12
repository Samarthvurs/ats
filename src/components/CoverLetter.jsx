import { useState } from 'react';
import Groq from 'groq-sdk';
import Icon from './Icon';
import Btn from './Btn';
import Badge from './Badge';
import FormattedText from './FormattedText';

const CoverLetter = ({ scans }) => {
  const [jd, setJd] = useState('');
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tone, setTone] = useState('Professional');

  const latest = scans?.[0];
  const resumeText = latest?.text || latest?.name || '';

  const generate = async () => {
    if (!jd.trim()) return;
    setLoading(true);
    setLetter('');
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error('Missing VITE_GROQ_API_KEY');
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

      const prompt = `You are an expert career coach and professional writer. Write a compelling, authentic cover letter in a ${tone.toLowerCase()} tone.

Resume Context:
"""
${resumeText.substring(0, 3000)}
"""

Job Description:
"""
${jd.substring(0, 1500)}
"""

Write a 3-paragraph cover letter that:
1. Opens with a strong hook referencing the specific company/role
2. Highlights 2-3 specific achievements from the resume that directly match JD requirements
3. Closes with confident enthusiasm and a clear call to action

Important: Write in first person. Do NOT include placeholders like [Your Name] - use context from the resume. Make it feel genuinely human, not templated.`;

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
      });

      setLetter(completion.choices[0]?.message?.content?.trim() || '');
    } catch (err) {
      console.error(err);
      setLetter('Failed to generate. Please check your API key and try again.');
    }
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([letter], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cover_letter.txt';
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="ru">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: 800, letterSpacing: '-.04em' }}>
            Cover Letter Generator
          </h1>
          <Badge type="ind">AI</Badge>
        </div>
        <p style={{ color: 'var(--ts)', fontSize: '.9rem' }}>
          Paste a job description and get a tailored, role-specific cover letter in seconds.
        </p>
      </div>

      {!resumeText && (
        <div style={{ padding: '14px 18px', background: 'rgba(255,149,0,.08)', border: '1px solid rgba(255,149,0,.2)', borderRadius: 14, fontSize: '.85rem', color: 'var(--amber)', fontWeight: 500 }}>
          ⚠️ Upload a resume first to personalize the cover letter with your actual experience.
        </div>
      )}

      <div className="ru card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ts)', display: 'block', marginBottom: 8 }}>Tone</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Professional', 'Confident', 'Creative', 'Concise'].map(t => (
              <div key={t} onClick={() => setTone(t)} style={{ padding: '6px 14px', borderRadius: 100, fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', background: tone === t ? 'var(--near-black)' : 'var(--s1)', color: tone === t ? 'white' : 'var(--tp)', border: tone === t ? 'none' : '1px solid var(--bl)', transition: 'all .2s' }}>
                {t}
              </div>
            ))}
          </div>
        </div>

        <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ts)', display: 'block', marginBottom: 8 }}>Job Description</label>
        <textarea
          className="inp"
          placeholder="Paste the full job description here..."
          value={jd}
          onChange={e => setJd(e.target.value)}
          style={{ height: 160, fontSize: '.85rem', lineHeight: 1.6, marginBottom: 16, resize: 'vertical' }}
        />
        <Btn v="dark" full sz="lg" pill onClick={generate} disabled={loading || !jd.trim()}>
          {loading
            ? <><div className="spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', marginRight: 8 }} />Generating...</>
            : <><Icon id="zap" size={16} color="white" /> Generate Cover Letter</>
          }
        </Btn>
      </div>

      {letter && (
        <div className="ru card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Your Cover Letter</h3>
              <Badge type="green">Ready</Badge>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn v="ghost" sz="sm" pill onClick={copy}>
                <Icon id="check" size={13} color={copied ? 'var(--green)' : 'var(--tp)'} /> {copied ? 'Copied!' : 'Copy'}
              </Btn>
              <Btn v="dark" sz="sm" pill onClick={download}>
                <Icon id="download" size={13} color="white" /> Download
              </Btn>
            </div>
          </div>
          <div style={{ fontSize: '.88rem', lineHeight: 1.8, color: 'var(--tp)', fontFamily: "'Georgia', serif", padding: '20px 24px', background: 'var(--s1)', borderRadius: 16, borderLeft: '3px solid var(--ind)' }}>
            <FormattedText text={letter} />
          </div>
          <p style={{ fontSize: '.75rem', color: 'var(--tt)', marginTop: 16, textAlign: 'center' }}>
            💡 Review and personalize before sending — AI-drafted letters work best with a human touch.
          </p>
        </div>
      )}
    </div>
  );
};

export default CoverLetter;
