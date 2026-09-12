import { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { answerQuery } from '../utils/chatbot';

const RecruiterChatWidget = ({ ranked, explanations }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    { role: 'bot', text: 'Ask me about this shortlist — e.g. "Why is Jane ranked above Bob?"' },
  ]);
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const ask = (text) => {
    const q = text.trim();
    if (!q) return;
    const answer = answerQuery(q, ranked, explanations);
    setMessages((m) => [...m, { role: 'user', text: q }, { role: 'bot', text: answer }]);
    setInput('');
  };

  const examples = ranked.length >= 2 && messages.length <= 1
    ? [`Why is ${ranked[0].name} ranked above ${ranked[ranked.length - 1].name}?`, 'Who is the top candidate?']
    : [];

  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
      {open && (
        <div
          className="si"
          style={{
            width: 360, maxWidth: 'calc(100vw - 48px)', height: 480, maxHeight: 'calc(100vh - 140px)',
            background: 'var(--s0)', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.08)',
            border: '.5px solid var(--bl)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '.5px solid var(--bl)', flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--near-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon id="ai" size={15} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 800, fontSize: '.86rem' }}>Recruiter assistant</p>
              <p style={{ fontSize: '.7rem', color: 'var(--tt)' }}>Offline · answers from this shortlist only</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'var(--s1)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Icon id="x" size={11} />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--s1)' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '9px 13px', borderRadius: 14, fontSize: '.84rem', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  background: m.role === 'user' ? 'var(--near-black)' : 'var(--s0)',
                  color: m.role === 'user' ? '#fff' : 'var(--tp)',
                  border: m.role === 'user' ? 'none' : '.5px solid var(--bl)',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 14,
                  borderBottomLeftRadius: m.role === 'user' ? 14 : 4,
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {examples.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {examples.map((ex) => (
                  <button key={ex} onClick={() => ask(ex)} style={{
                    textAlign: 'left', fontSize: '.78rem', fontWeight: 600, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                    background: 'var(--s0)', border: '.5px solid var(--bl)', color: 'var(--ind)',
                  }}>
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '.5px solid var(--bl)', flexShrink: 0 }}>
            <input
              ref={inputRef}
              className="inp" style={{ flex: 1, padding: '9px 13px', fontSize: '.86rem' }}
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), ask(input))}
            />
            <button
              onClick={() => ask(input)}
              disabled={!input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 12, border: 'none', flexShrink: 0, cursor: input.trim() ? 'pointer' : 'default',
                background: input.trim() ? 'var(--near-black)' : 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon id="arrow" size={15} color={input.trim() ? '#fff' : 'var(--tt)'} />
            </button>
          </div>
        </div>
      )}

      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="haptic-click"
        style={{
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'var(--near-black)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 28px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.1)',
          transition: 'transform .18s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title="Ask the recruiter assistant"
      >
        <Icon id={open ? 'x' : 'ai'} size={22} color="#fff" />
      </button>
    </div>
  );
};

export default RecruiterChatWidget;
