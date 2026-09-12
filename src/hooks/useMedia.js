import { useState, useEffect } from 'react';

const useMedia = () => {
  const [w, setW] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  return {
    isMobile:  w < 640,
    isTablet:  w < 960,
    isDesktop: w >= 960,
    width: w,
  };
};

export default useMedia;
