
import { useCallback, useEffect, useState } from 'react';

const VALID_TABS = new Set([
  'dashboard',
  'profile',
  'leaderboard',
  'vault',
  'blueprints',
  'roadmaps',
  'tasks',
  'pro',
  'admin',
  'guides',
]);

function readHash() {
  // Next.js server rendering has no browser window.
  if (typeof window === 'undefined') {
    return 'dashboard';
  }

  const value = window.location.hash
    .replace(/^#/, '')
    .trim();

  return VALID_TABS.has(value) ? value : 'dashboard';
}

export function useNavigation() {
  // Use a server-safe initial state.
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Read the actual URL only after mounting in the browser.
    const sync = () => {
      setActiveTab(readHash());
    };

    sync();

    window.addEventListener('hashchange', sync);

    return () => {
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const navigate = useCallback((tab) => {
    // Navigation is only performed in the browser.
    if (typeof window === 'undefined') return;

    const target = tab === 'workspace' ? 'dashboard' : tab;

    if (!VALID_TABS.has(target)) return;

    if (window.location.hash !== `#${target}`) {
      window.location.hash = target;
    }

    setActiveTab(target);

    document.getElementById('resources-menu')
      ?.setAttribute('hidden', '');

    document.getElementById('resources-menu-trigger')
      ?.setAttribute('aria-expanded', 'false');

    document.getElementById('topx-mobile-drawer')
      ?.classList.remove('is-open');

    document.getElementById('topx-drawer-backdrop')
      ?.setAttribute('hidden', '');

    document.body.classList.remove('topx-drawer-open');
  }, []);

  return { activeTab, navigate };
}