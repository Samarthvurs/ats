import { useState, useEffect } from 'react';

const ProgressRow = ({ label, value, delay = 0, dark }) => {
  const [width, setWidth] = useState(0);
  const [curr, setCurr] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(value), delay + 300);
    
    // Count up for the text
    let start = 0;
    const end = parseInt(value);
    const duration = 1000;
    const increment = end / (duration / 16);
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCurr(end);
          clearInterval(interval);
        } else {
          setCurr(Math.floor(start));
        }
      }, 16);
    }, delay + 300);

    return () => {
      clearTimeout(t);
      clearTimeout(timer);
    };
  }, [value, delay]);

  const color = value < 40
    ? 'var(--red)'
    : value < 65
      ? 'var(--amber)'
      : 'var(--green)';

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '.82rem', color: dark ? 'var(--td)' : 'var(--ts)', fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ fontSize: '.82rem', fontWeight: 800, color, fontFamily: "'Instrument Sans'" }}>
          {curr}%
        </span>
      </div>
      <div className={`pb-track ${dark ? 'pb-track-dark' : ''}`} style={{ height: 5 }}>
        <div className="pb-fill" style={{ width: `${width}%`, background: color, transitionDuration: '1.2s' }} />
      </div>
    </div>
  );
};

export default ProgressRow;
