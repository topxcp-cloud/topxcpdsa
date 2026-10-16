'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../features/auth/useAuth.js';
import {
  Search,
  Flame,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  Sparkles,
  Layers,
  Compass,
  BookOpen
} from 'lucide-react';

export default function AppHeader({ onOpenAuth }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const { user, logout } = auth;

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [resourcesMenuOpen, setResourcesMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const headerRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
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
        setResourcesMenuOpen(false);
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateTo = (path) => {
    setProfileMenuOpen(false);
    setResourcesMenuOpen(false);
    setMobileDrawerOpen(false);
    router.push(path);
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
  const streakCount = Number(user?.currentStreak) || 0;

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
      {/* Brand Logo with Editorial Refinement */}
      <div className="brand-wrap">
        <a
          className="brand-logo"
          href="/"
          onClick={(e) => { e.preventDefault(); navigateTo('/'); }}
          aria-label="Top X Club Home"
        >
          {/* Geometric Asterisk / Diamond Logo matching Locomotive Editorial Reference */}
          <span className="brand-star-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
            </svg>
          </span>
          <span className="brand-text">TOP X <i>CLUB</i></span>
        </a>
      </div>

      {/* Primary Navigation */}
      <nav className="app-nav-tabs" aria-label="Main navigation">
        <button type="button" className={`nav-tab-btn ${isDashboardActive || isHomeActive ? 'active' : ''}`} onClick={() => navigateTo('/dashboard')}>Dashboard</button>
        <button type="button" className={`nav-tab-btn ${isTasksActive ? 'active' : ''}`} onClick={() => navigateTo('/progress')}>Daily Tasks</button>
        <button type="button" className={`nav-tab-btn ${isLeaderboardActive ? 'active' : ''}`} onClick={() => navigateTo('/leaderboard')}>Leaderboard</button>
        <button type="button" className={`nav-tab-btn ${isProfileActive ? 'active' : ''}`} onClick={() => navigateTo(user ? '/profile' : '/login')}>Profile</button>
      </nav>

      {/* Header Right Utility Controls */}
      <div className="header-right">
        {/* Search Palette Opener */}
        <button
          type="button"
          className="search-pill-btn"
          id="search-pill-btn"
          title="Open Command Palette (Cmd+K or /)"
          onClick={() => window.dispatchEvent(new Event('topx:open-search'))}
        >
          <Search size={14} className="search-icon" aria-hidden="true" />
          <span>Search anything...</span>
          <kbd>/</kbd>
        </button>

        {/* Consistency Streak Chip */}
        <div
          className="streak-chip"
          id="header-streak-chip"
          role="button"
          tabIndex={0}
          title="Active practice streak — Click to view tasks & streaks"
          onClick={() => navigateTo('/progress')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('/progress'); } }}
        >
          <Flame size={15} style={{ color: 'var(--ac)' }} aria-hidden="true" />
          <span className="num" id="header-streak-num">{streakCount}</span>
          <span>streak</span>
        </div>

        {/* Mobile Hamburger Menu */}
        <button
          type="button"
          className="topx-mobile-menu"
          id="topx-mobile-menu"
          aria-label="Open navigation menu"
          aria-expanded={mobileDrawerOpen}
          onClick={() => setMobileDrawerOpen(true)}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        {/* Authentication: Sign In if unauthenticated */}
        {!user && (
          <button
            type="button"
            className="btn-primary header-signin-btn"
            id="header-signin-btn"
            onClick={handleOpenAuth}
            style={{ padding: '7px 18px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Sign In</span>
            <span style={{ fontSize: '14px', lineHeight: 1 }}>→</span>
          </button>
        )}

        {/* Authenticated User Avatar & Dropdown */}
        {user && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`profile-pill-btn ${isProfileActive ? 'active' : ''}`}
              id="header-profile-btn"
              aria-label="User account actions"
              aria-haspopup="true"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px 4px 4px', borderRadius: '999px', border: '1px solid var(--line)', background: 'var(--card)' }}
            >
              <div
                className="profile-avatar"
                id="header-user-avatar"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--surface-alt)',
                  fontWeight: 700,
                  fontSize: '12px',
                  color: 'var(--ink)'
                }}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'Member'}
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  (user.name || 'U').slice(0, 1).toUpperCase()
                )}
              </div>
              <ChevronDown size={14} style={{ opacity: 0.7 }} aria-hidden="true" />
            </button>

            {profileMenuOpen && (
              <div
                className="menu-dropdown open"
                id="menu-profile"
                style={{
                  width: '260px',
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  boxShadow: 'var(--sh-lg)',
                  padding: '8px',
                  zIndex: 200
                }}
              >
                <div
                  className="menu-header"
                  id="menu-profile-header"
                  style={{
                    padding: '8px 10px 10px',
                    borderBottom: '1px solid var(--line)',
                    marginBottom: '6px'
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--ink)' }}>{user.name || 'Member'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--mute)', wordBreak: 'break-all' }}>{user.email || ''}</div>
                  {user.branch && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--ac)', fontWeight: 600 }}>
                      {user.branch} {user.academicYear ? `• Year ${user.academicYear}` : ''}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="menu-item"
                  id="open-profile-modal-link"
                  data-tab="profile"
                  onClick={() => navigateTo('/profile')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    color: 'var(--ink)'
                  }}
                >
                  <User size={15} style={{ color: 'var(--ac)' }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px' }}>My Profile</strong>
                    <span style={{ fontSize: '11px', color: 'var(--mute)' }}>Academic &amp; Coding Handles</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="menu-item"
                  data-tab="tasks"
                  onClick={() => navigateTo('/progress')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    color: 'var(--ink)'
                  }}
                >
                  <Flame size={15} style={{ color: 'var(--ac)' }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px' }}>Daily Tasks &amp; Streak</strong>
                    <span style={{ fontSize: '11px', color: 'var(--mute)' }}>Track Daily Consistency</span>
                  </div>
                </button>

                <div style={{ borderTop: '1px solid var(--line)', margin: '6px 0' }} />

                <button
                  type="button"
                  className="menu-item"
                  id="header-logout-btn"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    color: 'var(--hard)'
                  }}
                >
                  <LogOut size={15} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Sign Out</span>
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

      {/* Mobile Navigation Drawer */}
      <aside
        className={`topx-mobile-drawer ${mobileDrawerOpen ? 'is-open' : ''}`}
        id="topx-mobile-drawer"
        aria-label="Mobile navigation"
        aria-hidden={!mobileDrawerOpen}
      >
        <div className="topx-drawer-heading">
          <strong>Top X Club</strong>
          <button
            type="button"
            id="topx-drawer-close"
            aria-label="Close navigation"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <X size={18} />
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
          <Search size={14} aria-hidden="true" />
          <span>Search anything...</span>
          <kbd>/</kbd>
        </button>

        <nav className="topx-drawer-links" aria-label="Mobile navigation">
          <button type="button" className={`nav-tab-btn ${isDashboardActive || isHomeActive ? 'active' : ''}`} onClick={() => navigateTo('/dashboard')}>Dashboard</button>
          <button type="button" className={`nav-tab-btn ${isTasksActive ? 'active' : ''}`} onClick={() => navigateTo('/progress')}>Daily Tasks</button>
          <button type="button" className={`nav-tab-btn ${isLeaderboardActive ? 'active' : ''}`} onClick={() => navigateTo('/leaderboard')}>Leaderboard</button>
          <button type="button" className={`nav-tab-btn ${isProfileActive ? 'active' : ''}`} onClick={() => navigateTo(user ? '/profile' : '/login')}>Profile</button>
          {user ? (
            <button type="button" className="nav-tab-btn" onClick={handleLogout} style={{ color: 'var(--hard)', marginTop: '16px' }}>Sign Out ({user.name || 'Member'})</button>
          ) : (
            <button type="button" className="nav-tab-btn" onClick={handleOpenAuth} style={{ color: 'var(--ac)', marginTop: '16px', fontWeight: '700' }}>Sign In</button>
          )}
        </nav>
      </aside>
    </header>
  );
}
