'use client';
import React, { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  useEffect(() => {
    // Only activate for devices with a fine pointer (mouse/trackpad), never touch
    if (typeof window === 'undefined') return;
    const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!hasMouse) return;

    document.body.classList.add('has-custom-cursor');

    const onMouseMove = (e) => {
      // Direct 1:1 hardware-accelerated tracking with zero latency
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      if (!visible) setVisible(true);

      const target = e.target;
      if (target && target instanceof Element) {
        const isInteractive = Boolean(
          target.closest(
            'a, button, [role="button"], input, select, textarea, label, [tabindex]:not([tabindex="-1"]), .interactive, .clickable, .pc, .home-podium-card, .streak-chip'
          )
        );
        setIsHovered(isInteractive);
      }
    };

    const onMouseDown = () => setIsClicked(true);
    const onMouseUp = () => setIsClicked(false);
    const onMouseLeave = () => setVisible(false);
    const onMouseEnter = () => setVisible(true);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    return () => {
      document.body.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
    };
  }, [visible]);

  return (
    <div
      ref={cursorRef}
      className={`bold-arrow-root ${visible ? 'is-visible' : ''}`}
      aria-hidden="true"
    >
      <div
        className={`bold-arrow-inner ${isHovered ? 'is-hover' : ''} ${isClicked ? 'is-click' : ''}`}
      >
        <svg
          className="bold-arrow-svg"
          width="20"
          height="24"
          viewBox="0 0 20 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Classic Pointer Arrow — Standard Normal Size */}
          <path
            className="bold-arrow-path"
            d="M1 1L1 17.5L5.8 13.3L9.2 21.5L12.2 20.2L8.8 12L15 12L1 1Z"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}




