const ScoreRing = ({ value, size = 112, run, dark, noText }) => {
  const r = (size / 2) - 10;
  const C = 2 * Math.PI * r;
  const offset = C - (value / 100) * C;
  const stroke = value < 40 ? 'var(--red)' : value < 65 ? 'var(--amber)' : 'var(--green)';

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle
        className={`ring-bg ${dark ? 'ring-dark' : ''}`}
        cx={size / 2} cy={size / 2} r={r}
      />
      <circle
        className="ring-val"
        cx={size / 2} cy={size / 2} r={r}
        stroke={stroke}
        style={{ strokeDasharray: C, strokeDashoffset: run ? offset : C }}
      />
      {!noText && (
        <>
          <text
            x={size / 2} y={size / 2 - 3}
            textAnchor="middle"
            style={{
              fontFamily: "'Instrument Sans'",
              fontSize: size * 0.28,
              fontWeight: 700,
              fill: dark ? 'var(--tw)' : stroke,
              letterSpacing: '-0.04em',
            }}
          >
            {run ? value : '–'}
          </text>
          <text
            x={size / 2} y={size / 2 + size * 0.16}
            textAnchor="middle"
            style={{
              fontFamily: "'Instrument Sans'",
              fontSize: size * 0.1,
              fill: dark ? 'var(--td)' : 'var(--tt)',
              fontWeight: 500,
            }}
          >
            score
          </text>
        </>
      )}
    </svg>
  );
};

export default ScoreRing;
