const Btn = ({ children, v = 'dark', sz = 'md', pill, full, onClick, style, loading, strobe, haptic = true }) => (
  <button
    className={`btn btn-${v} sz-${sz} ${pill ? 'pill' : ''} ${full ? 'w100' : ''} ${strobe ? 'strobe-effect' : ''} ${haptic ? 'haptic-click' : ''}`}
    onClick={onClick}
    style={style}
    disabled={loading}
  >
    {loading ? (
      <span
        className="spin"
        style={{
          width: 13, height: 13,
          border: '2px solid rgba(255,255,255,.25)',
          borderTopColor: 'currentColor',
          borderRadius: '50%',
          display: 'inline-block',
        }}
      />
    ) : children}
  </button>
);

export default Btn;
