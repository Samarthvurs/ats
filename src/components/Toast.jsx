import { useEffect } from 'react';
import Icon from './Icon';

const Toast = ({ message, type = 'success', onClear }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClear();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClear]);

  const bg = type === 'success' ? 'var(--near-black)' : 'var(--red)';
  const icon = type === 'success' ? 'check' : 'warn';

  return (
    <div style={{
      position: 'fixed',
      top: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      background: bg,
      color: 'white',
      padding: '12px 20px',
      borderRadius: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      animation: 'toastIn 0.3s ease-out forwards',
      maxWidth: '90vw',
      width: 'max-content'
    }}>
      <Icon id={icon} size={16} color="white" />
      <span style={{ fontSize: '.9rem', fontWeight: 600 }}>{message}</span>
      <button 
        onClick={onClear}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0, marginLeft: 8, display: 'flex' }}
      >
        <Icon id="plus" size={14} style={{ transform: 'rotate(45deg)' }} />
      </button>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};

export default Toast;
