'use client';

import React, { useEffect, useRef } from 'react';

export default function ScrollProgressBar() {
  const barRef = useRef(null);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      const docElem = document.documentElement;
      const scrollY = window.scrollY || docElem.scrollTop || 0;
      const totalHeight = Math.max(docElem.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, scrollY / totalHeight));
      const bar = barRef.current;
      if (!bar) return;
      bar.style.transform = `scaleX(${progress})`;
      bar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress);
    };

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
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
        ref={barRef}
        id="top-progress-bar"
        role="progressbar"
        aria-label="Page scroll progress"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: '100%',
          width: '100%',
          transform: 'scaleX(0)',
          transformOrigin: 'left center',
          background: '#ff7a1a',
          boxShadow: '0 0 8px rgba(255, 122, 26, 0.75)'
        }}
      />
    </div>
  );
}
