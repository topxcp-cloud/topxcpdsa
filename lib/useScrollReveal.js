'use client';

import { useEffect, useRef } from 'react';

/**
 * useScrollReveal — Lightweight, performant IntersectionObserver hook.
 * Triggers entrance animations once per element as it scrolls into view.
 * 
 * @param {Object} options
 * @param {string} [options.selector] - CSS selector for elements to observe
 * @param {number} [options.threshold] - Visibility threshold (0.05 to 0.15)
 * @param {string} [options.rootMargin] - Viewport margin offset
 * @returns {React.MutableRefObject} containerRef
 */
export function useScrollReveal(options = {}) {
  const containerRef = useRef(null);
  const {
    selector = '[data-scroll-reveal="true"], [data-reveal], .scroll-reveal, .topx-reveal',
    threshold = 0.08,
    rootMargin = '0px 0px -40px 0px'
  } = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const revealAll = (targets) => {
      targets.forEach((el) => {
        el.classList.add('is-revealed');
        el.classList.add('is-visible');
      });
    };

    // If reduced motion is requested, instantly reveal everything
    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mediaQuery && mediaQuery.matches) {
      const root = containerRef.current || document;
      revealAll(root.querySelectorAll(selector));
      return;
    }

    if (!('IntersectionObserver' in window)) {
      const root = containerRef.current || document;
      revealAll(root.querySelectorAll(selector));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            entry.target.classList.add('is-visible');
            // Unobserve immediately so animation only runs once
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    const root = containerRef.current || document;
    const targets = root.querySelectorAll(selector);
    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [selector, threshold, rootMargin]);

  return containerRef;
}

export default useScrollReveal;
