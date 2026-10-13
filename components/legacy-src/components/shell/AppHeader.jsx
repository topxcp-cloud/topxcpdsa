'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../features/auth/useAuth.js';

export default function AppHeader({ onOpenAuth }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const { user, logout } = auth;

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsMenuOpen, setNotificationsMenuOpen] = useState(false);
  const [resourcesMenuOpen, setResourcesMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const headerRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
        setNotificationsMenuOpen(false);
        setResourcesMenuOpen(false);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setProfileMenuOpen(false);
        setNotificationsMenuOpen(false);
        setResourcesMenuOpen(false);
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateTo = (path) => {
    setProfileMenuOpen(false);
    setNotificationsMenuOpen(false);
    setResourcesMenuOpen(false);
    setMobileDrawerOpen(false);
    router.push(path);
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try { window.localStorage.setItem('topx-theme', next); } catch (_) {}
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    setMobileDrawerOpen(false);
    await logout();
    router.push('/');
  };

  const handleOpenAuth = () => {
    setProfileMenuOpen(false);
    setMobileDrawerOpen(false);
    if (typeof onOpenAuth === 'function') {
      onOpenAuth();
    } else {
      router.push('/login');
    }
  };

  // Compute streak count
  const streakCount = user ? (user.totalActiveDays || user.currentStreak || 0) : 0;

  // Active check helpers
  const isHomeActive = pathname === '/';
  const isDashboardActive = pathname === '/dashboard';
  const isTasksActive = pathname === '/progress';
  const isLeaderboardActive = pathname === '/leaderboard';
  const isGuidesActive = pathname === '/contests';
  const isResourcesActive = pathname === '/problems' || pathname === '/roadmap';
  const isProfileActive = pathname === '/profile' || pathname === '/settings';

  return (
    <header className="app-header" ref={headerRef}>
      {/* Brand logo */}
      <div className="brand-wrap">
        <a
          className="brand-logo"
          href="/"
          onClick={(e) => { e.preventDefault(); navigateTo('/'); }}
          aria-label="My Topics Club Home"
        >
          <svg className="topx-rebuilt-mark" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M5 13 L15 3 L24 12 L15 21 Z" fill="currentColor" opacity=".95" />
            <path d="M43 13 L33 3 L24 12 L33 21 Z" fill="currentColor" opacity=".95" />
            <path d="M5 35 L15 45 L24 36 L15 27 Z" fill="currentColor" opacity=".78" />
            <path d="M43 35 L33 45 L24 36 L33 27 Z" fill="currentColor" opacity=".78" />
            <path d="M9 39 L39 9" stroke="#ff6a2a" strokeWidth="3.8" strokeLinecap="square" />
            <path d="M20 15 L28 23 L20 31 L28 39" fill="none" stroke="#ff8b55" strokeWidth="3" opacity=".9" />
          </svg>
          <span>TOPICS<i>CLUB</i></span>
        </a>
      </div>

      {/* Primary navigation tabs */}
      <nav className="app-nav-tabs" aria-label="Main navigation">
        <button
          type="button"
          className={`nav-tab-btn ${isHomeActive ? 'active' : ''}`}
          data-tab="home"
          onClick={() => navigateTo('/')}
        >
          Home
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${isDashboardActive ? 'active' : ''}`}
          data-tab="dashboard"
          onClick={() => navigateTo(user ? '/dashboard' : '/login')}
        >
          Dashboard
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${isTasksActive ? 'active' : ''}`}
          data-tab="tasks"
          onClick={() => navigateTo('/progress')}
        >
          Daily Tasks <span className="badge-pill" id="nav-tasks-count">3</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${isLeaderboardActive ? 'active' : ''}`}
          data-tab="leaderboard"
          onClick={() => navigateTo('/leaderboard')}
        >
          Leaderboard
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${isGuidesActive ? 'active' : ''}`}
          data-tab="guides"
          onClick={() => navigateTo('/contests')}
        >
          Guides
        </button>

        {/* Resources dropdown */}
        <div className="resources-dropdown" style={{ position: 'relative' }}>
          <button
            className={`nav-tab-btn resources-trigger ${isResourcesActive ? 'active' : ''}`}
            type="button"
            aria-haspopup="true"
            aria-expanded={resourcesMenuOpen}
            id="resources-menu-trigger"
            onClick={() => setResourcesMenuOpen(!resourcesMenuOpen)}
          >
            Resources <span className="resources-chevron">▾</span>
          </button>
          {resourcesMenuOpen && (
            <div className="resources-menu" id="resources-menu" style={{ display: 'block' }}>
              <button type="button" className="nav-tab-btn" onClick={() => navigateTo('/roadmap')}>
                Blueprints
              </button>
              <button type="button" className="nav-tab-btn" onClick={() => navigateTo('/problems')}>
                Problem Vault <span className="badge-pill">16</span>
              </button>
              <button type="button" className="nav-tab-btn" onClick={() => navigateTo('/roadmap')}>
                3D Labs
              </button>
              <button type="button" className="nav-tab-btn" onClick={() => navigateTo('/roadmap')}>
                Roadmaps
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Header right utility controls */}
      <div className="header-right">
        {/* Search button */}
        <button
          type="button"
          className="search-pill-btn"
          id="search-pill-btn"
          title="Open Command Palette (Cmd+K or /)"
          onClick={() => window.dispatchEvent(new Event('topx:open-search'))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search anything...</span>
          <kbd>/</kbd>
        </button>

        {/* Streak chip (clickable -> /progress) */}
        <div
          className="streak-chip"
          id="header-streak-chip"
          role="button"
          tabIndex={0}
          title="Active practice streak — Click to view tasks & streaks"
          onClick={() => navigateTo('/progress')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('/progress'); } }}
        >
          <i aria-hidden="true" />
          <span className="num" id="header-streak-num">{streakCount}</span>
          <span>day streak</span>
        </div>

        {/* Top-X Pro button */}
        <button
          type="button"
          className="nav-tab-btn topx-pro-button"
          data-tab="pro"
          onClick={() => navigateTo('/profile')}
        >
          ⚡ Top-X Pro
        </button>

        {/* Notifications toggle */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="icon-btn"
            id="notifications-toggle-btn"
            aria-label="Notifications"
            onClick={() => {
              setNotificationsMenuOpen(!notificationsMenuOpen);
              setProfileMenuOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          {notificationsMenuOpen && (
            <div className="menu-dropdown open" id="menu-notifications" style={{ display: 'block' }}>
              <div className="menu-header">Notifications</div>
              <div className="menu-item">
                <strong>No notifications yet</strong>
                <span>Account and challenge updates will appear here.</span>
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          className="icon-btn"
          id="theme-toggle-btn"
          title="Toggle Dark/Light Mode"
          aria-label="Toggle Dark/Light Mode"
          onClick={toggleTheme}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>

        {/* Mobile menu hamburger button */}
        <button
          type="button"
          className="topx-mobile-menu"
          id="topx-mobile-menu"
          aria-label="Open navigation menu"
          aria-expanded={mobileDrawerOpen}
          onClick={() => setMobileDrawerOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>

        {/* Authentication: Sign In button if unauthenticated */}
        {!user && (
          <button
            type="button"
            className="header-signin-btn"
            id="header-signin-btn"
            onClick={handleOpenAuth}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
            Sign In
          </button>
        )}

        {/* Profile Pill & Dropdown if authenticated */}
        {user && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`profile-pill-btn ${isProfileActive ? 'active' : ''}`}
              id="header-profile-btn"
              aria-label="Profile menu"
              aria-haspopup="true"
              aria-expanded={profileMenuOpen}
              onClick={() => {
                setProfileMenuOpen(!profileMenuOpen);
                setNotificationsMenuOpen(false);
              }}
            >
              <div
                className="profile-avatar"
                id="header-user-avatar"
                style={user.avatar ? { backgroundImage: `url(${user.avatar})`, backgroundSize: 'cover' } : {}}
              >
                {!user.avatar && (user.name ? user.name[0].toUpperCase() : 'U')}
              </div>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {profileMenuOpen && (
              <div className="menu-dropdown open" id="menu-profile" style={{ width: '270px', display: 'block' }}>
                <div className="menu-header" id="menu-profile-header">
                  <div style={{ fontWeight: '700', color: 'var(--ink)' }}>{user.name || 'Member'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--mute)', wordBreak: 'break-all' }}>{user.email || ''}</div>
                </div>
                <button
                  type="button"
                  className="menu-item"
                  id="open-profile-modal-link"
                  data-tab="profile"
                  onClick={() => navigateTo('/profile')}
                >
                  <b>My Profile &amp; CP Sync</b>
                  <span>LeetCode, CF &amp; CodeChef Handles</span>
                </button>
                <button
                  type="button"
                  className="menu-item"
                  data-tab="pro"
                  onClick={() => navigateTo('/profile')}
                >
                  <b>⚡ Top-X Pro Status</b>
                  <span>40 CodeChef Tasks Track</span>
                </button>
                <button
                  type="button"
                  className="menu-item"
                  data-tab="tasks"
                  onClick={() => navigateTo('/progress')}
                >
                  <b>Daily Tasks</b>
                  <span>Track Streaks &amp; Solves</span>
                </button>
                <button
                  type="button"
                  className="menu-item"
                  id="header-logout-btn"
                  onClick={handleLogout}
                  style={{ borderTop: '1px solid var(--line)', marginTop: '4px', paddingTop: '10px' }}
                >
                  <span style={{ color: 'var(--hard)', fontWeight: '600' }}>Log Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="topx-drawer-backdrop"
          id="topx-drawer-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`topx-mobile-drawer ${mobileDrawerOpen ? 'is-open' : ''}`}
        id="topx-mobile-drawer"
        aria-label="Mobile navigation"
        aria-hidden={!mobileDrawerOpen}
      >
        <div className="topx-drawer-heading">
          <strong>My Topics Club</strong>
          <button
            type="button"
            id="topx-drawer-close"
            aria-label="Close navigation"
            onClick={() => setMobileDrawerOpen(false)}
          >
            ×
          </button>
        </div>

        <button
          type="button"
          className="search-pill-btn topx-drawer-search"
          id="topx-drawer-search"
          onClick={() => {
            setMobileDrawerOpen(false);
            window.dispatchEvent(new Event('topx:open-search'));
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search anything...</span>
          <kbd>/</kbd>
        </button>

        <nav className="topx-drawer-links" aria-label="Mobile navigation links">
          <button type="button" className={`nav-tab-btn ${isHomeActive ? 'active' : ''}`} onClick={() => navigateTo('/')}>
            Home
          </button>
          <button type="button" className={`nav-tab-btn ${isDashboardActive ? 'active' : ''}`} onClick={() => navigateTo(user ? '/dashboard' : '/login')}>
            Dashboard
          </button>
          <button type="button" className={`nav-tab-btn ${isTasksActive ? 'active' : ''}`} onClick={() => navigateTo('/progress')}>
            Daily Tasks <span className="badge-pill">3</span>
          </button>
          <button type="button" className={`nav-tab-btn ${isLeaderboardActive ? 'active' : ''}`} onClick={() => navigateTo('/leaderboard')}>
            Leaderboard
          </button>
          <button type="button" className={`nav-tab-btn ${isGuidesActive ? 'active' : ''}`} onClick={() => navigateTo('/contests')}>
            Guides
          </button>
          <button type="button" className="nav-tab-btn" onClick={() => navigateTo('/problems')}>
            Problem Vault
          </button>
          <button type="button" className="nav-tab-btn" onClick={() => navigateTo('/roadmap')}>
            Roadmaps
          </button>
          <button type="button" className={`nav-tab-btn ${isProfileActive ? 'active' : ''}`} onClick={() => navigateTo(user ? '/profile' : '/login')}>
            My Profile
          </button>

          {user ? (
            <button
              type="button"
              className="nav-tab-btn"
              onClick={handleLogout}
              style={{ color: 'var(--hard)', marginTop: '12px' }}
            >
              Log Out
            </button>
          ) : (
            <button
              type="button"
              className="nav-tab-btn"
              onClick={handleOpenAuth}
              style={{ color: 'var(--ac)', marginTop: '12px', fontWeight: '700' }}
            >
              Sign In
            </button>
          )}
        </nav>
      </aside>
    </header>
  );
}
