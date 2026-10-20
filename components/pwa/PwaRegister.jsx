'use client';
import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHttps = window.location.protocol === 'https:';

      if (isLocalhost || isHttps) {
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
              // Check for updates
              registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker) {
                  installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                      if (navigator.serviceWorker.controller) {
                        console.log('[Top-X PWA] New content is available; please refresh.');
                      } else {
                        console.log('[Top-X PWA] Content is cached for offline use.');
                      }
                    }
                  };
                }
              };
            })
            .catch((error) => {
              console.warn('[Top-X PWA] Service Worker registration failed:', error);
            });
        });
      }
    }

    // Capture install prompt for PWA installation support
    window.addEventListener('beforeinstallprompt', (e) => {
      // Allow browser to show native prompt or stash for UI button
      window.deferredPwaPrompt = e;
      window.dispatchEvent(new CustomEvent('topx:pwa-installable'));
    });
  }, []);

  return null;
}
