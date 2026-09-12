import Icon from './Icon';

export const Modal = ({ onClose, maxWidth = 640, children }) => (
  <div className="rf" style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div className="modal-bg" style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
    <div className="card si" style={{ position: 'relative', width: '100%', maxWidth, maxHeight: '86vh', display: 'flex', flexDirection: 'column', borderRadius: 24, overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

export const ModalHeader = ({ title, subtitle, onClose }) => (
  <div style={{ padding: '20px 24px', borderBottom: '.5px solid var(--bl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
    <div style={{ minWidth: 0 }}>
      <p style={{ fontWeight: 800, fontSize: '1.05rem' }}>{title}</p>
      {subtitle && <p style={{ fontSize: '.78rem', color: 'var(--tt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</p>}
    </div>
    <button onClick={onClose} style={{ background: 'var(--s1)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
      <Icon id="x" size={13} />
    </button>
  </div>
);
