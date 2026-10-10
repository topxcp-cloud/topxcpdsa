import { useEffect } from 'react';

const VISUALIZER_SCRIPTS = ['js/three.min.js', 'js/visualizers.js'];
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-topx-src="${src}"]`);
    if (existing?.dataset.loaded === 'true') return resolve();
    if (existing) { existing.addEventListener('load', resolve, { once: true }); existing.addEventListener('error', () => reject(new Error(`Could not load ${src}`)), { once: true }); return; }
    const script = document.createElement('script'); script.src = `/${src}`; script.dataset.topxSrc = src;
    script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
    script.onerror = () => { script.remove(); reject(new Error(`Could not load ${src}`)); };
    document.body.appendChild(script);
  });
}
/** Loads only the standalone 3D rendering library. Authentication, routing, theme and feature events are React-owned. */
export function useFeatureRuntime() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        for (const src of VISUALIZER_SCRIPTS) { if (cancelled) return; await loadScript(src); }
        if (cancelled || !window.TopXVisualizers) return;
        const v = window.TopXVisualizers;
        const init = (method, ...args) => { try { v[method]?.(...args); } catch (error) { console.warn(`Visualizer ${method} unavailable`, error); } };
        init('initBinarySearch', 'dash-gl-canvas', 'dash-ro-hud');
        init('initBubbleSort', 'lb-bs-canvas', 'lb-bs-ro', 'lb-bs-pz', 'lb-bs-sp', 'lb-bs-sh');
        init('initPathfinding', 'lab-pf-canvas', 'lab-pf-table', 'lab-pf-msg', 'lab-pf-pz', 'lab-pf-sp', 'lab-pf-nm', '.lab-pf-algo-btn');
        init('initBinarySearch', 'lab-bs-canvas', 'lab-bs-ro');
        init('initBubbleSort', 'lab-sort-canvas', 'lab-sort-ro', 'lab-sort-pz', 'lab-sort-sp', 'lab-sort-sh');
      } catch (error) { console.error('TOP-X visualizer library failed to load:', error); }
    })();
    return () => { cancelled = true; };
  }, []);
}
