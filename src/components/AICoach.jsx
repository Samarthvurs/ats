import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot, arrayUnion, updateDoc } from 'firebase/firestore';
import { callGroq } from '../services/ai';
import Icon from './Icon';
import Btn from './Btn';
import FormattedText from './FormattedText';

const SUGGESTIONS = [
  "Why is my ATS score low?",
  "Improve my projects section",
  "What should I add for this job?",
  "Optimize my latest experience"
];

const AICoach = ({ user, scans = [] }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm your AI Career Coach. I've analyzed your recent scans. How can I help you improve your professional profile today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const latest = scans[0] || null;

  // Load history from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const coachRef = doc(db, 'users', user.uid, 'coach', 'history');
    
    const unsub = onSnapshot(coachRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      }
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ask = async (text) => {
    if (!text.trim() || !user?.uid) return;
    
    const userMsg = { role: 'user', text };
    const coachRef = doc(db, 'users', user.uid, 'coach', 'history');

    // Optimistically update local state
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Save user message to Firestore
    try {
      const docSnap = await getDoc(coachRef);
      if (!docSnap.exists()) {
        await setDoc(coachRef, { messages: [
          { role: 'assistant', text: "Hello! I'm your AI Career Coach. I've analyzed your recent scans. How can I help you improve your professional profile today?" },
          userMsg
        ] });
      } else {
        await updateDoc(coachRef, { messages: arrayUnion(userMsg) });
      }
    } catch (e) { console.error("Persistence error:", e); }

    const latestContext = scans.length > 0 
      ? `User's Latest Resume Score: ${scans[0].score}%. ATS: ${scans[0].ats}%. Issues: ${JSON.stringify(scans[0].issues?.slice(0, 3))}. Improvements: ${JSON.stringify(scans[0].improvements?.slice(0, 3))}. RAW RESUME (TRUNCATED): """${scans[0].text?.substring(0, 2000) || "No text extracted"}"""`
      : `No resume uploaded yet.`;

    try {
      const sysMsg = { 
        role: "system", 
        content: `You are a world-class AI Career Coach. You help users improve their resume. 
        Context about the user's latest resume analysis: ${latestContext}
        Keep responses concise, friendly, encouraging, and highly actionable (max 3 sentences). Do NOT use markdown bold text.` 
      };

      const groqMsgs = [
         sysMsg,
         ...messages.map(m => ({ role: m.role, content: m.text })),
         { role: 'user', content: text }
      ];

      const completion = await callGroq(groqMsgs);

      const responseText = completion.choices[0]?.message?.content || "I couldn't process that.";
      const aiMsg = { role: 'assistant', text: responseText };
      
      // Save AI response to Firestore
      await updateDoc(coachRef, { messages: arrayUnion(aiMsg) });
      
    } catch (err) {
      console.error("Coach Error Details:", err);
      const errMsg = { role: 'assistant', text: "I'm having a brief connection issue with the neural network. Please try again in 5 seconds." };
      setMessages(prev => [...prev, errMsg]);
    }
    setLoading(false);
  };

  return (
    <div className="ru card" style={{ height: '540px', display: 'flex', flexDirection: 'column', background: 'var(--s0)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '.5px solid var(--bl)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--s1)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--near-black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon id="brain" size={16} color="white" />
        </div>
        <div>
          <h3 style={{ fontSize: '.95rem', fontWeight: 700 }}>AI Career Coach</h3>
          <p style={{ fontSize: '.7rem', color: 'var(--ts)' }}>Analyzing {scans.length} previous scans</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            background: m.role === 'user' ? 'var(--near-black)' : 'var(--s1)',
            color: m.role === 'user' ? 'white' : 'var(--tp)',
            padding: '12px 16px',
            borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            fontSize: '.85rem',
            lineHeight: 1.5,
            border: m.role === 'user' ? 'none' : '.5px solid var(--bl)'
          }}>
            <FormattedText 
              text={m.text} 
              bulletColor={m.role === 'user' ? 'rgba(255,255,255,0.5)' : 'var(--ind)'} 
              boldColor={m.role === 'user' ? '#fff' : 'var(--tp)'}
            />
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--s1)', padding: '10px 16px', borderRadius: '18px', fontSize: '.75rem', color: 'var(--ts)' }}>
            AI Coach is typing...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Footer / Suggestions */}
      <div style={{ padding: 16, borderTop: '.5px solid var(--bl)', background: 'var(--s0)' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }} className="no-scroll">
          {SUGGESTIONS.map(s => (
            <div key={s} onClick={() => ask(s)} style={{ 
              whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: 100, background: 'var(--s1)', border: '.5px solid var(--bl)', 
              fontSize: '.75rem', cursor: 'pointer', color: 'var(--ts)', fontWeight: 600 
            }}>
              {s}
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: 10 }}>
          <input 
            className="inp" 
            placeholder="Ask me anything about your career..." 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask(input)}
            style={{ borderRadius: 100, fontSize: '.85rem', padding: '10px 20px' }}
          />
          <Btn v="dark" sz="sm" pill onClick={() => ask(input)} disabled={!input.trim()}>
            <Icon id="arrow" size={14} color="white" />
          </Btn>
        </div>
      </div>
    </div>
  );
};

export default AICoach;
