import { useState } from 'react';
import Groq from 'groq-sdk';
import Icon from './Icon';
import Btn from './Btn';
import Badge from './Badge';
import FormattedText from './FormattedText';

const CATEGORIES = ['All', 'Behavioral', 'Technical', 'Culture Fit'];

const InterviewPrep = ({ scans }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [loadingAnswer, setLoadingAnswer] = useState(null);
  const [filter, setFilter] = useState('All');
  const [jd, setJd] = useState('');

  const latest = scans?.[0];
  const resumeText = latest?.text || latest?.name || '';

  const generateQuestions = async () => {
    setLoading(true);
    setQuestions([]);
    setAnswers({});
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error('Missing VITE_GROQ_API_KEY');
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

      const prompt = `You are an expert technical recruiter. Based on the resume and optional job description below, generate 9 highly specific interview questions that a recruiter or hiring manager would actually ask this candidate.

Resume:
"""
${resumeText.substring(0, 3000)}
"""
${jd ? `\nJob Description:\n"""\n${jd.substring(0, 1000)}\n"""` : ''}

Generate exactly 9 questions in this JSON format:
{
  "questions": [
    { "id": 1, "category": "Behavioral", "question": "..." },
    { "id": 2, "category": "Technical", "question": "..." },
    ...
  ]
}

- 3 Behavioral (STAR method scenarios based on their actual experience)  
- 3 Technical (based on specific technologies/skills in their resume)
- 3 Culture Fit (leadership, collaboration, growth mindset)
- Make every question specific to THIS candidate's background, not generic.
Return ONLY valid JSON.`;

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' }
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      setQuestions(Array.isArray(parsed.questions) ? parsed.questions : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const generateAnswer = async (q) => {
    setLoadingAnswer(q.id);
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

      const prompt = `Based on this candidate's resume, write a strong model answer for this interview question using the STAR method (Situation, Task, Action, Result).

Resume:
"""
${resumeText.substring(0, 2000)}
"""

Interview Question: "${q.question}"

Write a natural, 150-200 word answer that draws from the candidate's actual experience. Sound human and confident, not robotic.`;

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
      });

      const answer = completion.choices[0]?.message?.content?.trim() || '';
      setAnswers(prev => ({ ...prev, [q.id]: answer }));
    } catch (err) {
      console.error(err);
    }
    setLoadingAnswer(null);
  };

  const filtered = filter === 'All' ? questions : questions.filter(q => q.category === filter);
  const catColor = cat => cat === 'Behavioral' ? 'amber' : cat === 'Technical' ? 'ind' : 'green';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="ru">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: 800, letterSpacing: '-.04em' }}>
            Interview Prep Room
          </h1>
          <Badge type="amber">AI</Badge>
        </div>
        <p style={{ color: 'var(--ts)', fontSize: '.9rem' }}>
          Get personalized interview questions from your actual resume — each with an AI-generated STAR model answer.
        </p>
      </div>

      <div className="ru card" style={{ padding: 24 }}>
        <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ts)', display: 'block', marginBottom: 8 }}>
          Job Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — makes questions more targeted)</span>
        </label>
        <textarea
          className="inp"
          placeholder="Paste a job description to make questions role-specific..."
          value={jd}
          onChange={e => setJd(e.target.value)}
          style={{ height: 100, fontSize: '.85rem', lineHeight: 1.6, marginBottom: 16, resize: 'vertical' }}
        />
        <Btn v="dark" full sz="lg" pill onClick={generateQuestions} disabled={loading || !resumeText}>
          {loading
            ? <><div className="spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', marginRight: 8 }} />Generating Questions...</>
            : <><Icon id="target" size={16} color="white" /> Generate Interview Questions</>
          }
        </Btn>
        {!resumeText && <p style={{ fontSize: '.78rem', color: 'var(--amber)', marginTop: 10, textAlign: 'center' }}>⚠️ Upload a resume first to generate personalized questions.</p>}
      </div>

      {questions.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <div key={c} onClick={() => setFilter(c)} style={{ padding: '6px 14px', borderRadius: 100, fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', background: filter === c ? 'var(--near-black)' : 'var(--s0)', color: filter === c ? 'white' : 'var(--tp)', border: filter === c ? 'none' : '1px solid var(--bl)', transition: 'all .2s' }}>
                {c} {c === 'All' ? `(${questions.length})` : `(${questions.filter(q => q.category === c).length})`}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map((q, i) => (
              <div key={q.id} className="ru card" style={{ padding: 22, borderLeft: '3px solid var(--bl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 8, background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 800, color: 'var(--ts)', flexShrink: 0, marginTop: 1 }}>Q{i + 1}</div>
                    <p style={{ fontWeight: 600, fontSize: '.9rem', lineHeight: 1.5 }}>{q.question}</p>
                  </div>
                  <Badge type={catColor(q.category)}>{q.category}</Badge>
                </div>

                {answers[q.id] ? (
                  <div style={{ marginTop: 4, padding: '14px 18px', background: 'var(--s1)', borderRadius: 12, borderLeft: '3px solid var(--green)' }}>
                    <p style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--green)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>Model Answer (STAR)</p>
                    <div style={{ fontSize: '.85rem', lineHeight: 1.7, color: 'var(--ts)' }}>
                      <FormattedText text={answers[q.id]} bulletColor="var(--green)" />
                    </div>
                  </div>
                ) : (
                  <Btn v="ghost" sz="xs" pill onClick={() => generateAnswer(q)} disabled={loadingAnswer === q.id} style={{ marginTop: 4 }}>
                    {loadingAnswer === q.id
                      ? <><div className="spin" style={{ width: 12, height: 12, border: '1.5px solid var(--s2)', borderTopColor: 'var(--tp)', borderRadius: '50%', display: 'inline-block', marginRight: 6 }} />Generating...</>
                      : <><Icon id="zap" size={11} color="var(--ind)" /> Generate Model Answer</>
                    }
                  </Btn>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default InterviewPrep;
