import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Navbar    from './components/Navbar';
import AuthModal from './components/AuthModal';
import Landing   from './pages/Landing';
import Upload    from './pages/Upload';
import Results   from './pages/Results';
import Dashboard from './pages/Dashboard';
import ResumeBuilder from './pages/ResumeBuilder';
import LiveBuilder from './pages/LiveBuilder';
import RecruitingHome from './pages/RecruitingHome';
import RecruitingProgram from './pages/RecruitingProgram';
import Contact     from './pages/Contact';
import Icon from './components/Icon';
import Btn from './components/Btn';
import Toast from './components/Toast';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--s1)', padding: 20 }}>
          <div className="card ru" style={{ maxWidth: 400, padding: 40, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid var(--bl)' }}>
               <Icon id="warn" size={24} color="var(--red)" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12 }}>Something went wrong</h2>
            <p style={{ color: 'var(--ts)', fontSize: '.9rem', marginBottom: 24 }}>The app encountered an unexpected error. This usually happens during high traffic.</p>
            <Btn v="dark" pill onClick={() => window.location.reload()}>Reload Resumeeit</Btn>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Default structured resume data — used by Portfolio Maker as the live source of truth
const DEFAULT_RESUME = {
  name: '',
  title: '',
  email: '',
  location: '',
  linkedin: '',
  github: '',
  summary: '',
  skills: '',
  experience: [],
  projects: [],
  education: []
};

const App = () => {
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const [page, setPage] = useState(() => localStorage.getItem('resumeeit_page') || 'landing');
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [results, setResultsState] = useState(() => {
    try {
      const cached = localStorage.getItem('resumeeit_results');
      return cached ? JSON.parse(cached) : null;
    } catch(e) { 
      console.warn("Cleared corrupted results cache");
      localStorage.removeItem('resumeeit_results');
      return null;
    }
  });
  // Shared structured resume state — LiveBuilder writes, PortfolioMaker reads
  const [resumeData, setResumeDataState] = useState(() => {
    try {
      const cached = localStorage.getItem('resumeeit_resumeData');
      return (cached && cached !== "undefined") ? JSON.parse(cached) : DEFAULT_RESUME;
    } catch(e) {
      console.warn("Cleared corrupted resumeData cache");
      localStorage.removeItem('resumeeit_resumeData');
      return DEFAULT_RESUME;
    }
  });
  const [showLogout, setShowLogout] = useState(false);

  // ── Recruiting programs (Smart Shortlisting Engine) ──
  const [programs, setProgramsState] = useState(() => {
    try {
      const cached = localStorage.getItem('resumeeit_programs');
      return cached ? JSON.parse(cached) : [];
    } catch (e) { return []; }
  });
  const setPrograms = (list) => {
    setProgramsState(list);
    try { localStorage.setItem('resumeeit_programs', JSON.stringify(list)); } catch (e) { /* quota etc — non-fatal */ }
  };
  const [activeProgramId, setActiveProgramId] = useState(null);
  // Full ranked results are kept in memory only (can be several MB for large
  // batches with resume-text previews) — re-run after a page reload.
  const [programResults, setProgramResultsState] = useState({});

  const createProgram = (name) => {
    const id = `prog_${Date.now()}`;
    const program = { id, name: name || `Recruiting Program ${programs.length + 1}`, createdAt: new Date().toISOString(), jdText: '', config: null };
    setPrograms([program, ...programs]);
    setActiveProgramId(id);
    go('recruiting-program');
  };

  const updateProgram = (id, patch) => {
    setPrograms(programs.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const deleteProgram = (id) => {
    setPrograms(programs.filter(p => p.id !== id));
    setProgramResultsState(prev => { const next = { ...prev }; delete next[id]; return next; });
    if (activeProgramId === id) setActiveProgramId(null);
  };

  const go = p => {
    setPage(p);
    localStorage.setItem('resumeeit_page', p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setResults = (data) => {
    setResultsState(data);
    if (data) localStorage.setItem('resumeeit_results', JSON.stringify(data));
    else localStorage.removeItem('resumeeit_results');
  };

  const setResumeData = (data) => {
    setResumeDataState(data);
    if (data) localStorage.setItem('resumeeit_resumeData', JSON.stringify(data));
    else localStorage.removeItem('resumeeit_resumeData');
  };

  const login = u => {
    setUser(u);
    setShowAuth(false);
    // Don't auto-redirect if we are looking at results — let the user finish reading
    if (u && page !== 'results') checkOnboarding(u.uid);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setShowLogout(false);
      go('landing');
      setResults(null);
      setResumeData(DEFAULT_RESUME);
    } catch(e) { console.error(e); }
  };

  const checkOnboarding = async (uid) => {
    try {
      const q = await getDocs(collection(db, 'users', uid, 'scans'));
      if (q.empty) {
        go('upload');
      } else {
        go('dashboard');
      }
    } catch(e) {
      console.error("Onboarding check failed:", e);
      go('dashboard'); // Fallback
    }
  };

  useEffect(() => {
    const titles = {
      landing: 'Resumeeit | AI-powered Resume Intelligence',
      upload: 'Analyze Your Resume | Resumeeit',
      results: 'Your Resume Report | Resumeeit',
      dashboard: 'Dashboard | Resumeeit Career OS',
      contact: 'Contact Us | Resumeeit',
      livebuilder: 'Expert Resume Builder | Resumeeit',
      recruiting: 'Recruiting Programs | Resumeeit',
      'recruiting-program': 'Smart Shortlisting Engine | Resumeeit',
    };
    document.title = titles[page] || 'Resumeeit';
  }, [page]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const u = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email
        };
        setUser(u);
        // On conversion/login, if on landing, check onboarding
        if (page === 'landing') {
          checkOnboarding(firebaseUser.uid);
        }
      } else {
        setUser(null);
        // Redirect to landing if on a protected page
        const protectedPages = ['dashboard', 'resumebuilder', 'livebuilder'];
        if (protectedPages.includes(page)) {
          go('landing');
        }
      }
    });
    return () => unsub();
  }, [page]); // Re-subscribe if page changes during auth transition

  // Conversion Sync: Save guest scan to user account upon sign-in
  useEffect(() => {
    if (user && results && !results.is_persisted) {
      const persistScan = async () => {
        try {
          const scanId = results.id || `scan_${Date.now()}`;
          const scanRef = doc(db, 'users', user.uid, 'scans', scanId);
          
          await setDoc(scanRef, {
            ...results,
            id: scanId,
            userId: user.uid,
            timestamp: results.date || new Date().toISOString(),
          });
          
          // Mark as persisted locally to avoid double-write
          const updatedResults = { ...results, id: scanId, is_persisted: true };
          setResults(updatedResults);
          
          showToast("Resume report saved to your profile! 💎", "success");
        } catch (e) {
          console.error("Conversion sync failed:", e);
        }
      };
      persistScan();
    }
  }, [user, results]);

  const openAuth = () => setShowAuth(true);

  const screens = React.useMemo(() => ({
    landing:   <Landing   go={go} onAuth={openAuth} />,
    upload:    <Upload    go={go} user={user} onAuth={openAuth} setResults={setResults} onNotify={showToast} />,
    results:   <Results   go={go} user={user} onAuth={openAuth} data={results} />,
    contact:   <Contact   go={go} onNotify={showToast} />,
    dashboard: <Dashboard go={go} user={user} onAuth={openAuth} onNotify={showToast} />,
    resumebuilder: <ResumeBuilder go={go} user={user} />,
    livebuilder: <LiveBuilder go={go} user={user} onDataChange={setResumeData} onNotify={showToast} />,
    recruiting: (
      <RecruitingHome
        programs={programs}
        onCreate={createProgram}
        onOpen={(id) => { setActiveProgramId(id); go('recruiting-program'); }}
        onDelete={deleteProgram}
      />
    ),
    'recruiting-program': (
      <RecruitingProgram
        go={go}
        program={programs.find(p => p.id === activeProgramId)}
        onUpdateProgram={(patch) => updateProgram(activeProgramId, patch)}
        result={programResults[activeProgramId]}
        onSetResult={(res) => setProgramResultsState(prev => ({ ...prev, [activeProgramId]: res }))}
        onNotify={showToast}
      />
    ),
  }), [user, results, showToast, page, openAuth, programs, activeProgramId, programResults]); // Include page to ensure freshness on navigation

  const LogoutModal = () => (
    <div className="rf" style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }} onClick={() => setShowLogout(false)} />
      <div className="card ru glass" style={{ position: 'relative', width: '100%', maxWidth: 380, padding: 32, textAlign: 'center', borderRadius: 28, border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
         <div style={{ width: 64, height: 64, borderRadius: 22, background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid var(--bl)' }}>
            <Icon id="award" size={24} color="var(--ts)" />
         </div>
         <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 10, letterSpacing: '-.03em' }}>Ready to exit?</h2>
         <p style={{ color: 'var(--ts)', fontSize: '.9rem', lineHeight: 1.6, marginBottom: 32 }}>You will be signed out of your Resumeeit session. All your scans are safe.</p>
         <div style={{ display: 'flex', gap: 12 }}>
            <Btn v="ghost" full sz="lg" pill onClick={() => setShowLogout(false)}>Cancel</Btn>
            <Btn v="dark" full sz="lg" pill onClick={() => handleLogout()}>Sign Out</Btn>
         </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <Navbar page={page} go={go} user={user} onAuth={openAuth} onLogout={() => setShowLogout(true)} />
      {screens[page] || screens.landing}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLogin={login}
        />
      )}
      {showLogout && <LogoutModal />}
      {toast && <Toast message={toast.msg} type={toast.type} onClear={() => setToast(null)} />}
    </ErrorBoundary>
  );
};

export default App;
