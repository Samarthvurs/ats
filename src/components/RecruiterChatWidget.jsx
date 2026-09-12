import { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import Btn from './Btn';
import { answerQuery, HELP_TEXT } from '../utils/chatbot';

const RecruiterChatWidget = ({ ranked, explanations }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    { role: 'bot', text: 'Ask me about this shortlist — e.g. "Why is Jane ranked above Bob?"' },
  ]);
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    const answer = answerQuery(q, ranked, explanations);
    setMessages((m) => [...m, { role: 'user', text: q }, { role: 'bot', text: answer }]);
    setInput('');
  };

  const askExample = (text) => {
    const answer = answerQuery(text, ranked, explanations);
    setMessages((m) => [...m, { role: 'user', text }, { role: 'bot', text: answer }]);
  };

  const examples = ranked.length >= 2
    ? [`Why is ${ranked[0].name} ranked above ${ranked[ranked.length - 1].name}?`, 'Who is the top candidate?']
    : [];

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 30 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--near-black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon id="ai" size={16} color="#fff" />
          </div>
          <span>
            <p style={{ fontWeight: 800, fontSize: '.92rem' }}>Ask the recruiter assistant</p>
            <p style={{ fontSize: '.74rem', color: 'var(--tt)' }}>Offline · answers only from this shortlist's computed data</p>
          </span>
        </span>
        <span style={{ display: 'flex', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
          <Icon id="chevron" size={16} color="var(--tt)" />
        </span>
      </button>

      {open && (
        <div className="si" style={{ borderTop: '.5px solid var(--bl)' }}>
          <div ref={listRef} style={{ maxHeight: 320, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--s1)' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: 14, fontSize: '.86rem', lineHeight: 1.55, whiteSpace: 'pre-wrap',
                  background: m.role === 'user' ? 'var(--near-black)' : 'var(--s0)',
                  color: m.role === 'user' ? '#fff' : 'var(--tp)',
                  border: m.role === 'user' ? 'none' : '.5px solid var(--bl)',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {examples.length > 0 && messages.length <= 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 20px 12px' }}>
              {examples.map((ex) => (
                <button key={ex} onClick={() => askExample(ex)} style={{
                  fontSize: '.74rem', fontWeight: 600, padding: '6px 12px', borderRadius: 100, cursor: 'pointer',
                  background: 'var(--s1)', border: '.5px solid var(--bl)', color: 'var(--ts)',
                }}>
                  {ex}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, padding: 16, borderTop: '.5px solid var(--bl)' }}>
            <input
              className="inp" style={{ flex: 1 }} placeholder='e.g. "Why is Jane ranked above Bob?"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), send())}
            />
            <Btn v="dark" sz="md" onClick={send}>
              <Icon id="arrow" size={14} color="#fff" />
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterChatWidget;
