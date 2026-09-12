import { useState, useEffect } from 'react';
import Icon from './Icon';
import Btn from './Btn';
import useMedia from '../hooks/useMedia';

const Navbar = ({ page, go, user, onAuth, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isMobile } = useMedia();
  const dark = page === 'landing';

  useEffect(() => { setMenuOpen(false); }, [page]);

  const navLinks = [
    ['dashboard', 'Dashboard'],
    ['recruiting', 'Recruiting'],
    ['contact', 'Contact Us'],
  ];

  return (
    <>
      <nav className={`nav-shell ${dark ? 'dark-nav' : ''}`}>
        <div style={{ maxWidth: 1120, margin: '0 auto', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>

          {/* Left — Logo + desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              onClick={() => go('landing')}
              className="haptic-click"
            >
              <div style={{ width:28, height:28, borderRadius:8, background: dark ? '#fff' : 'var(--near-black)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow: dark ? '0 0 15px rgba(255,255,255,0.3)' : 'none' }}>
                <Icon id="logo" size={15} color={dark ? 'var(--near-black)' : 'white'} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-.05em', color: dark ? '#fff' : 'var(--tp)' }}>
                Resumeeit<span style={{ color: 'var(--ind)' }}>.</span>
              </span>
            </div>

            {/* Desktop nav links */}
            <div className="hide-tablet" style={{ display: 'flex', gap: 2 }}>
              {navLinks.map(([p, l]) => (
                <button
                  key={p}
                  onClick={() => go(p)}
                  className={`nav-btn ${page === p || (p === 'recruiting' && page === 'recruiting-program') ? 'current' : ''}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Right — Auth / User + Hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: dark ? 'rgba(255,255,255,.15)' : 'var(--near-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11 }}>
                    {user.name[0]}
                  </div>
                  <span className="hide-mobile" style={{ fontSize: '.84rem', fontWeight: 600, color: dark ? 'var(--tw)' : 'var(--tp)' }}>
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Sign out"
                >
                  <Icon id="logout" size={18} color="var(--red)" />
                </button>
              </div>
            ) : (
              <>
                <Btn
                  v={dark ? 'ghost-dark' : 'ghost'}
                  sz="sm" pill
                  onClick={onAuth}
                  style={{ display: isMobile ? 'none' : undefined }}
                >
                  Sign in
                </Btn>
                <Btn v={dark ? 'white' : 'dark'} sz="sm" pill onClick={() => go('recruiting')}>
                  Get started
                </Btn>
              </>
            )}

            {/* Hamburger — shown on tablet/mobile via CSS */}
            <button
              className="hide-desktop"
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: dark ? 'var(--tw)' : 'var(--tp)', padding: 6, borderRadius: 8 }}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <Icon id={menuOpen ? 'x' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="mobile-menu open" onClick={() => setMenuOpen(false)}>
          <div
            className="mobile-menu-panel"
            style={{ background: dark ? 'var(--near-black)' : 'var(--s0)' }}
            onClick={e => e.stopPropagation()}
          >
            {navLinks.map(([p, l]) => (
              <button
                key={p}
                onClick={() => { go(p); setMenuOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', background: page === p ? 'var(--s1)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '.95rem', color: dark ? (page === p ? 'var(--tp)' : 'var(--tw)') : 'var(--tp)', borderRadius: 11, marginBottom: 4, transition: 'background .15s' }}
              >
                {l}
              </button>
            ))}
            {user ? (
              <button
                onClick={() => { onLogout(); setMenuOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, fontSize: '.95rem', color: 'var(--red)', borderRadius: 11, transition: 'background .15s' }}
              >
                <Icon id="logout" size={17} color="var(--red)" /> Sign out
              </button>
            ) : (
              <button
                onClick={() => { onAuth(); setMenuOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, fontSize: '.95rem', color: dark ? 'rgba(255,255,255,.55)' : 'var(--ts)', borderRadius: 11, transition: 'background .15s' }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
