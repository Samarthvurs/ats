import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Icon from './Icon';
import Btn from './Btn';

const AuthModal = ({ onClose, onLogin }) => {
  const [tab,     setTab]     = useState('signin');
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    try {
      setError('');
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      
      // Save/Merge user data in Firestore
      await setDoc(doc(db, 'users', res.user.uid), {
        name: res.user.displayName || 'Google User',
        email: res.user.email,
        lastActive: new Date().toISOString()
      }, { merge: true });

      onLogin({ uid: res.user.uid, name: res.user.displayName, email: res.user.email });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!email || !pass) return setError("Please fill in all fields.");
    setError('');
    setLoading(true);
    try {
      if (tab === 'signup') {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        if (name) await updateProfile(res.user, { displayName: name });
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', res.user.uid), {
          name: name || 'User',
          email: res.user.email,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString()
        });

        onLogin({ uid: res.user.uid, name: name || 'User', email: res.user.email });
      } else {
        const res = await signInWithEmailAndPassword(auth, email, pass);
        
        // Update lastActive when logging in
        await setDoc(doc(db, 'users', res.user.uid), {
          lastActive: new Date().toISOString()
        }, { merge: true });

        onLogin({ uid: res.user.uid, name: res.user.displayName || 'User', email: res.user.email });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-bg"
      style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}
    >
      <div
        className="si modal-card"
        style={{ background:'var(--s0)', borderRadius:28, padding:'40px 36px', width:'100%', maxWidth:400, boxShadow:'0 36px 90px rgba(0,0,0,.16),0 0 0 .5px rgba(0,0,0,.07)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:30 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'var(--near-black)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon id="logo" size={14} color="white" />
            </div>
            <span style={{ fontWeight:700, fontSize:'.95rem', letterSpacing:'-.03em' }}>Resumeeit</span>
          </div>
          <button
            onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tt)', display:'flex', padding:6, borderRadius:8, transition:'color .15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--tp)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--tt)'}
          >
            <Icon id="x" size={16} />
          </button>
        </div>

        <h2 style={{ fontSize:'1.55rem', fontWeight:700, letterSpacing:'-.04em', marginBottom:6 }}>
          {tab === 'signin' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ fontSize:'.85rem', color:'var(--ts)', marginBottom:26, lineHeight:1.65 }}>
          {tab === 'signin'
            ? 'Sign in to see your full resume report.'
            : 'Get started — your first scan is free.'}
        </p>

        {/* Google SSO */}
        <button
          onClick={handleGoogle}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'11px', border:'.5px solid var(--bm)', borderRadius:13, background:'var(--s0)', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:'.88rem', marginBottom:18, transition:'all .18s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--s1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--s0)'; }}
        >
          <Icon id="google" size={17} /> Continue with Google
        </button>

        {/* OR divider */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
          <div style={{ flex:1, height:.5, background:'var(--bl)' }} />
          <span style={{ fontSize:10, color:'var(--tt)', fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase' }}>or</span>
          <div style={{ flex:1, height:.5, background:'var(--bl)' }} />
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'var(--s1)', borderRadius:13, padding:4, gap:3, marginBottom:18 }}>
          {[['signin','Sign In'],['signup','Sign Up']].map(([t, l]) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              style={{ flex:1, padding:'8px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:'.83rem', background: tab===t ? 'var(--s0)' : 'transparent', color: tab===t ? 'var(--tp)' : 'var(--ts)', boxShadow: tab===t ? '0 1px 4px rgba(0,0,0,.08)' : 'none', transition:'all .18s' }}
            >
              {l}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ color:'var(--er, #ff4d4d)', fontSize:'.8rem', marginBottom:12, padding:8, background:'rgba(255, 77, 77, 0.1)', borderRadius:8, textAlign:'center' }}>
            {error}
          </div>
        )}

        {/* Name */}
        {tab === 'signup' && (
          <>
            <label style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'var(--ts)', marginBottom:7 }}>
              Name
            </label>
            <input
              className="inp"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Alex Chen"
              type="text"
              style={{ padding:'11px 14px', marginBottom:13, width: '100%', boxSizing: 'border-box' }}
            />
          </>
        )}

        {/* Email */}
        <label style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'var(--ts)', marginBottom:7 }}>
          Email
        </label>
        <input
          className="inp"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          style={{ padding:'11px 14px', marginBottom:13, width: '100%', boxSizing: 'border-box' }}
        />

        {/* Password */}
        <label style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'var(--ts)', marginBottom:7 }}>
          Password
        </label>
        <input
          className="inp"
          value={pass}
          onChange={e => setPass(e.target.value)}
          placeholder="••••••••"
          type="password"
          style={{ padding:'11px 14px', marginBottom:22, width: '100%', boxSizing: 'border-box' }}
        />

        <Btn v="dark" sz="lg" full loading={loading} onClick={submit}>
          {tab === 'signin' ? 'Sign in to Resumeeit' : 'Create free account'}
        </Btn>

        <p style={{ fontSize:10, color:'var(--tt)', textAlign:'center', marginTop:16, lineHeight:1.65 }}>
          By continuing, you agree to our{' '}
          <span style={{ color:'var(--ind)', cursor:'pointer' }}>Terms</span> and{' '}
          <span style={{ color:'var(--ind)', cursor:'pointer' }}>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
