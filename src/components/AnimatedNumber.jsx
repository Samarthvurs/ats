import { useState, useEffect } from 'react';

const AnimatedNumber = ({ value = 0, duration = 1200, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let dev = false;
    let start = null;
    const end = Number(value);
    
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic Out Ease
      
      setDisplayValue(Math.floor(ease * end));
      
      if (progress < 1 && !dev) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
    return () => { dev = true; };
  }, [value, duration]);

  return <span>{displayValue}{suffix}</span>;
};

export default AnimatedNumber;
