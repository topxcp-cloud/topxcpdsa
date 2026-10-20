import { useEffect } from 'react';

const VISUALIZER_SCRIPTS = ['js/three.min.js', 'js/visualizers.js'];
const VISUALIZERS = [
  { canvasId: 'dash-gl-canvas', method: 'initBinarySearch', args: ['dash-gl-canvas', 'dash-ro-hud'] },
  { canvasId: 'lb-bs-canvas', method: 'initBubbleSort', args: ['lb-bs-canvas', 'lb-bs-ro', 'lb-bs-pz', 'lb-bs-sp', 'lb-bs-sh'] },
  { canvasId: 'home-sort-canvas', method: 'initBubbleSort', args: ['home-sort-canvas', 'home-sort-ro', 'home-sort-pz', 'home-sort-sp', 'home-sort-sh'] },
  { canvasId: 'lab-pf-canvas', method: 'initPathfinding', args: ['lab-pf-canvas', 'lab-pf-table', 'lab-pf-msg', 'lab-pf-pz', 'lab-pf-sp', 'lab-pf-nm', '.lab-pf-algo-btn'] },
  { canvasId: 'lab-bs-canvas', method: 'initBinarySearch', args: ['lab-bs-canvas', 'lab-bs-ro'] },
  { canvasId: 'lab-sort-canvas', method: 'initBubbleSort', args: ['lab-sort-canvas', 'lab-sort-ro', 'lab-sort-pz', 'lab-sort-sp', 'lab-sort-sh'] }
];
let visualizerScriptsPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-topx-src="${src}"]`);
    if (existing?.dataset.loaded === 'true') return resolve();
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error(`Could not load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement('script'); script.src = `/${src}`; script.dataset.topxSrc = src;
    script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
    script.onerror = () => { script.remove(); reject(new Error(`Could not load ${src}`)); };
    document.body.appendChild(script);
  });
}

function loadVisualizers() {
  if (!visualizerScriptsPromise) {
    visualizerScriptsPromise = (async () => {
      for (const src of VISUALIZER_SCRIPTS) await loadScript(src);
    })().catch(error => {
      visualizerScriptsPromise = null;
      throw error;
    });
  }
  return visualizerScriptsPromise;
}

/** Loads only the standalone 3D rendering library. Authentication, routing, theme and feature events are React-owned. */
export function useFeatureRuntime() {
  useEffect(() => {
    let cancelled = false;
    const canvasConfigs = new Map();
    VISUALIZERS.forEach(config => {
      const canvas = document.getElementById(config.canvasId);
      if (canvas) canvasConfigs.set(canvas, config);
    });
    const instances = new Map();
    const available = Array.from(canvasConfigs, ([canvas, config]) => ({ canvas, config }));
    if (!available.length) return undefined;

    const cleanup = () => {
      cancelled = true;
      instances.forEach((instance, canvas) => {
        instance.destroy();
        delete canvas.dataset.topxInitialized;
      });
      instances.clear();
    };

    const initialize = async (config, canvas) => {
      if (cancelled || !canvas.isConnected || canvas.dataset.topxInitialized === 'true') return;
      try {
        await loadVisualizers();
        if (cancelled || !canvas.isConnected || canvas.dataset.topxInitialized === 'true' || !window.TopXVisualizers) return;
        const instance = window.TopXVisualizers[config.method](...config.args);
        if (instance) {
          instances.set(canvas, instance);
          canvas.dataset.topxInitialized = 'true';
        }
      } catch (error) {
        console.error(`TOP-X visualizer ${config.canvasId} failed to initialize:`, error);
      }
    };

    if (!('IntersectionObserver' in window)) {
      available.forEach(({ config, canvas }) => void initialize(config, canvas));
      return cleanup;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        void initialize(canvasConfigs.get(entry.target), entry.target);
      });
    }, { rootMargin: '300px 0px' });
    canvasConfigs.forEach((_config, canvas) => observer.observe(canvas));
    return () => {
      observer.disconnect();
      cleanup();
    };
  }, []);
}
