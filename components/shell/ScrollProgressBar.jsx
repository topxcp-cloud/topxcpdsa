'use client';

import React, { useEffect, useState } from 'react';

export default function ScrollProgressBar() {
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const docElem = document.documentElement;
          const body = document.body;
          const scrollY = window.scrollY || docElem.scrollTop || body?.scrollTop || 0;
          const totalHeight = Math.max(
            (docElem.scrollHeight || 0) - window.innerHeight,
            (body?.scrollHeight || 0) - window.innerHeight,
            1
          );

          if (totalHeight <= 0) {
            setScrollPercent(0);
          } else {
            const current = (scrollY / totalHeight) * 100;
            setScrollPercent(Math.min(100, Math.max(0, current)));
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div
      id="top-progress-bar-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: '#0d0d0f',
        zIndex: 999999,
        pointerEvents: 'none'
      }}
    >
      <div
        id="top-progress-bar"
        role="progressbar"
        aria-label="Page scroll progress"
        aria-valuenow={Math.round(scrollPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: '100%',
          width: `${scrollPercent}%`,
          background: '#ff7a1a',
          boxShadow: '0 0 8px rgba(255, 122, 26, 0.75)',
          transition: 'width 0.08s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'width'
        }}
      />
    </div>
  );
}

