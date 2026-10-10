'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from './features/navigation/useNavigation.js';
import { useAuth } from './features/auth/useAuth.js';
import { api } from './lib/api.js';
import { useFeatureRuntime } from './runtime/useFeatureRuntime.js';
import AppFooter from './components/shell/AppFooter.jsx';
import ProfileModal from './components/shell/ProfileModal.jsx';
import CommandPaletteModal from './components/shell/CommandPaletteModal.jsx';
import AppHeader from './components/shell/AppHeader.jsx';
import AuthGate from './components/shell/AuthGate.jsx';
import AdminView from './components/views/AdminView.jsx';
import ProView from './components/views/ProView.jsx';
import TasksView from './components/views/TasksView.jsx';
import GuidesView from './components/views/GuidesView.jsx';
import ProfileView from './components/views/ProfileView.jsx';
import LabView from './components/views/LabView.jsx';
import RoadmapsView from './components/views/RoadmapsView.jsx';
import BlueprintsView from './components/views/BlueprintsView.jsx';
import VaultView from './components/views/VaultView.jsx';
import LeaderboardView from './components/views/LeaderboardView.jsx';
import DashboardView from './components/views/DashboardView.jsx';

const VIEWS = [
  ['dashboard', DashboardView], ['leaderboard', LeaderboardView], ['vault', VaultView],
  ['blueprints', BlueprintsView], ['roadmaps', RoadmapsView], ['lab', LabView],
  ['profile', ProfileView], ['guides', GuidesView], ['tasks', TasksView],
  ['pro', ProView], ['admin', AdminView]
];

/** React owns navigation, session lifecycle, theme and global UI actions. Feature views are independent components. */
export default function AppShell() {
  useFeatureRuntime();
  const { activeTab, navigate } = useNavigation();
  const auth = useAuth();
  const [toast, setToast] = useState('');
  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  }, []);

  useEffect(() => {
    let theme = 'light';
    try { theme = window.localStorage.getItem('topx-theme') || 'light'; } catch {}
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  useEffect(() => {
    document.querySelectorAll('.nav-tab-btn[data-tab]').forEach(button => {
      button.classList.toggle('active', button.dataset.tab === activeTab);
    });
  }, [activeTab]);

  const handleClick = useCallback(async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const nav = target.closest('[data-tab]');
    if (nav) { event.preventDefault(); navigate(nav.dataset.tab); return; }
    if (target.closest('#theme-toggle-btn')) {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next); try { window.localStorage.setItem('topx-theme', next); } catch {}
      notify(`${next === 'dark' ? 'Dark' : 'Light'} theme enabled`); return;
    }
    if (target.closest('#header-logout-btn') || target.closest('#page-profile-logout')) {
      auth.logout(); notify('You have been signed out.'); return;
    }
    if (target.closest('#header-signin-btn') || target.closest('#open-auth-modal-link')) {
      document.body.classList.add('auth-locked'); return;
    }
    if (target.closest('#search-pill-btn') || target.closest('#topx-drawer-search')) {
      window.dispatchEvent(new Event('topx:open-search')); return;
    }
    if (target.closest('#topx-mobile-menu')) {
      document.getElementById('topx-mobile-drawer')?.classList.add('is-open');
      document.getElementById('topx-drawer-backdrop')?.removeAttribute('hidden');
      document.body.classList.add('topx-drawer-open'); return;
    }
    if (target.closest('#topx-drawer-close') || target.closest('#topx-drawer-backdrop')) {
      document.getElementById('topx-mobile-drawer')?.classList.remove('is-open');
      document.getElementById('topx-drawer-backdrop')?.setAttribute('hidden', '');
      document.body.classList.remove('topx-drawer-open'); return;
    }
    if (target.closest('#resources-menu-trigger')) {
      const menu = document.getElementById('resources-menu');
      if (menu) { const open = menu.hasAttribute('hidden'); open ? menu.removeAttribute('hidden') : menu.setAttribute('hidden', ''); document.getElementById('resources-menu-trigger')?.setAttribute('aria-expanded', String(open)); }
      return;
    }
    if (target.closest('#page-profile-sync')) {
      if (!auth.user) { notify('Sign in to sync your coding profiles.'); return; }
      const handles = {
        leetcode: document.getElementById('page-handle-leetcode')?.value.trim() || '',
        codeforces: document.getElementById('page-handle-codeforces')?.value.trim() || '',
        codechef: document.getElementById('page-handle-codechef')?.value.trim() || ''
      };
      const status = document.getElementById('page-profile-sync-status');
      try {
        if (status) status.textContent = 'Saving handles and syncing live platform data…';
        await api(`/api/user/handles/${encodeURIComponent(auth.user.id)}`, { method: 'PUT', body: JSON.stringify(handles) });
        const result = await api(`/api/sync/all/${encodeURIComponent(auth.user.id)}`, { method: 'POST' });
        if (result.user) auth.setUser(result.user);
        if (status) status.textContent = 'Sync complete. Profile data refreshed from connected platforms.';
        notify('Coding profiles synced.');
        window.dispatchEvent(new CustomEvent('topx:profile-updated', { detail: result }));
      } catch (error) { if (status) status.textContent = error.message; notify(error.message); }
      return;
    }
  }, [navigate, auth, notify]);

  const handleSubmit = useCallback(async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id === 'page-profile-form') {
      event.preventDefault();
      if (!auth.user) return notify('Sign in to update your profile.');
      const body = {
        name: document.getElementById('page-profile-name-input')?.value.trim(),
        branch: document.getElementById('page-profile-branch-input')?.value || '',
        section: document.getElementById('page-profile-section-input')?.value || ''
      };
      try { const result = await api(`/api/user/profile/${encodeURIComponent(auth.user.id)}`, { method: 'PUT', body: JSON.stringify(body) }); auth.setUser(result.user); notify('Profile saved.'); }
      catch (error) { notify(error.message); }
    }
  }, [auth, notify]);

  useEffect(() => {
    if (!auth.user) return;
    const name = auth.user.name || 'Member';
    const headerName = document.getElementById('menu-profile-header'); if (headerName) headerName.textContent = name;
    const avatar = document.getElementById('header-user-avatar'); if (avatar) avatar.textContent = name.slice(0, 1).toUpperCase();
    const profileName = document.getElementById('page-profile-name'); if (profileName) profileName.textContent = name;
    const profileEmail = document.getElementById('page-profile-email'); if (profileEmail) profileEmail.textContent = auth.user.email || '';
    const nameInput = document.getElementById('page-profile-name-input'); if (nameInput && document.activeElement !== nameInput) nameInput.value = name;
    const branch = document.getElementById('page-profile-branch-input'); if (branch && auth.user.branch) branch.value = auth.user.branch;
    const section = document.getElementById('page-profile-section-input'); if (section && auth.user.section) section.value = auth.user.section;
  }, [auth.user]);



  return (
    <div className="topx-react-app" onClick={handleClick} onSubmit={handleSubmit}>
      <AuthGate authMode={auth.authMode} setAuthMode={auth.setAuthMode} authenticate={auth.authenticate} error={auth.error} setError={auth.setError} isAuthenticated={Boolean(auth.user)} />
      <div id="top-progress" />
      <AppHeader />
      <main className="app-view-container">
        {VIEWS.map(([id, View]) => <View key={id} active={activeTab === id} user={auth.user} />)}
      </main>
      <CommandPaletteModal />
      <ProfileModal />
      <div id="toast-container" aria-live="polite">{toast ? <div className="toast-pill"><span>⚡</span><span>{toast}</span></div> : null}</div>
      <AppFooter />
    </div>
  );
}
