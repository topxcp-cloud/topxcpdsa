'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from './features/navigation/useNavigation.js';
import { useAuth } from './features/auth/useAuth.js';
import { api } from './lib/api.js';
import AppFooter from './components/shell/AppFooter.jsx';
import ProfileModal from './components/shell/ProfileModal.jsx';
import CommandPaletteModal from './components/shell/CommandPaletteModal.jsx';
import AppHeader from './components/shell/AppHeader.jsx';
import AuthGate from './components/shell/AuthGate.jsx';
import StudentProfileSetup from './components/shell/StudentProfileSetup.jsx';
import { hasRequiredStudentProfile } from './features/profile/studentProfileOptions.js';
import AdminView from './components/views/AdminView.jsx';
import ProView from './components/views/ProView.jsx';
import TasksView from './components/views/TasksView.jsx';
import GuidesView from './components/views/GuidesView.jsx';
import ProfileView from './components/views/ProfileView.jsx';
import RoadmapsView from './components/views/RoadmapsView.jsx';
import BlueprintsView from './components/views/BlueprintsView.jsx';
import VaultView from './components/views/VaultView.jsx';
import LeaderboardView from './components/views/LeaderboardView.jsx';
import DashboardView from './components/views/DashboardView.jsx';

const VIEWS = [
  ['dashboard', DashboardView], ['leaderboard', LeaderboardView], ['vault', VaultView],
  ['blueprints', BlueprintsView], ['roadmaps', RoadmapsView],
  ['profile', ProfileView], ['guides', GuidesView], ['tasks', TasksView],
  ['pro', ProView], ['admin', AdminView]
];

/** React owns navigation, session lifecycle and global UI actions. Feature views are independent components. */
export default function AppShell() {
  const { activeTab, navigate } = useNavigation();
  const auth = useAuth();
  const [toast, setToast] = useState('');
  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
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
    if (target.closest('#header-logout-btn') || target.closest('#page-profile-logout')) {
      auth.logout(); notify('You have been signed out.'); return;
    }
    if (target.closest('#header-signin-btn') || target.closest('#open-auth-modal-link')) {
      document.body.classList.add('auth-locked'); return;
    }
    if (target.closest('#header-streak-chip')) {
      if (auth.user) {
        navigate('profile');
        setTimeout(() => document.getElementById('streak')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
      } else {
        navigate('tasks');
      }
      return;
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
    const handleProfileUpdated = (event) => {
      const updatedUser = event?.detail?.user;
      if (updatedUser?.id && updatedUser.id === auth.user?.id) auth.setUser(updatedUser);
    };
    window.addEventListener('topx:profile-updated', handleProfileUpdated);
    return () => window.removeEventListener('topx:profile-updated', handleProfileUpdated);
  }, [auth.user?.id, auth.setUser]);

  useEffect(() => {
    if (!auth.user) return;
    const name = auth.user.name || 'Member';
    const headerName = document.getElementById('menu-profile-header'); if (headerName) headerName.textContent = name;
    const avatar = document.getElementById('header-user-avatar');
    if (avatar && !auth.user.avatar) avatar.textContent = name.slice(0, 1).toUpperCase();
    const profileName = document.getElementById('page-profile-name'); if (profileName) profileName.textContent = name;
    const profileEmail = document.getElementById('page-profile-email'); if (profileEmail) profileEmail.textContent = auth.user.email || '';
    const nameInput = document.getElementById('page-profile-name-input'); if (nameInput && document.activeElement !== nameInput) nameInput.value = name;
    const branch = document.getElementById('page-profile-branch-input'); if (branch && auth.user.branch) branch.value = auth.user.branch;
    const section = document.getElementById('page-profile-section-input'); if (section && auth.user.section) section.value = auth.user.section;
  }, [auth.user]);



  return (
    <div className="topx-react-app" onClick={handleClick} onSubmit={handleSubmit}>
      <AuthGate
        authMode={auth.authMode}
        setAuthMode={auth.setAuthMode}
        authenticate={auth.authenticate}
        loginWithGoogle={auth.loginWithGoogle}
        error={auth.error}
        setError={auth.setError}
        isAuthenticated={Boolean(auth.user)}
      />
      {!auth.loading && auth.user && !hasRequiredStudentProfile(auth.user) && (
        <StudentProfileSetup
          user={auth.user}
          onSaved={(updatedUser) => {
            auth.setUser(updatedUser);
            navigate('profile');
          }}
        />
      )}
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
