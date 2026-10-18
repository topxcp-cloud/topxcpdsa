'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef(null);

  // Scroll detection for subtle header shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // initial check
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    const handleResize = () => {
      if (window.innerWidth > 1024) setMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.classList.add('topx-drawer-open');
    } else {
      document.body.classList.remove('topx-drawer-open');
    }
  }, [mobileDrawerOpen]);

  const navigateTo = useCallback((path) => {
    setProfileMenuOpen(false);
    setResourcesMenuOpen(false);
    setMobileDrawerOpen(false);
    router.push(path);
  }, [router]);

  const handleLogout = useCallback(async () => {
    setProfileMenuOpen(false);
    setMobileDrawerOpen(false);
    await logout();
    router.push('/');
  }, [logout, router]);

  const handleOpenAuth = useCallback(() => {
    setProfileMenuOpen(false);
    setMobileDrawerOpen(false);
    if (typeof onOpenAuth === 'function') {
      onOpenAuth();
    } else {
      router.push('/login');
    }
  }, [onOpenAuth, router]);

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

  // Avatar initial
  const avatarInitial = (user?.name || 'U').slice(0, 1).toUpperCase();

  return (
    <header className={`app-header${scrolled ? ' is-scrolled' : ''}`} ref={headerRef}>
      {/* ── Brand ── */}
      <div className="brand-wrap">
        <a
          className="brand-logo"
          href="/"
          onClick={(e) => { e.preventDefault(); navigateTo('/'); }}
          aria-label="Top X Club Home"
        >
          <span className="brand-star-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
            </svg>
          </span>
          <span className="brand-text">TOP X <i>CLUB</i></span>
        </a>
      </div>

      {/* ── Primary Navigation ── */}
      <nav className="app-nav-tabs" aria-label="Main navigation">
        <button type="button" className={`nav-tab-btn interactive-transition${isDashboardActive ? ' active' : ''}`} onClick={() => navigateTo('/dashboard')}>Dashboard</button>
        <button type="button" className={`nav-tab-btn interactive-transition${isTasksActive ? ' active' : ''}`} onClick={() => navigateTo('/progress')}>Daily Tasks</button>
        <button type="button" className={`nav-tab-btn interactive-transition${isLeaderboardActive ? ' active' : ''}`} onClick={() => navigateTo('/leaderboard')}>Leaderboard</button>
        <button type="button" className={`nav-tab-btn interactive-transition${isProfileActive ? ' active' : ''}`} onClick={() => navigateTo(user ? '/profile' : '/login')}>Profile</button>
      </nav>

      {/* ── Header Right Controls ── */}
      <div className="header-right">
        {/* Search */}
        <button
          type="button"
          className="search-pill-btn hover-lift interactive-transition"
          id="search-pill-btn"
          title="Open Command Palette (Cmd+K or /)"
          onClick={() => window.dispatchEvent(new Event('topx:open-search'))}
        >
          <Search size={14} className="search-icon" aria-hidden="true" />
          <span>Search…</span>
          <kbd>/</kbd>
        </button>

        {/* Streak Chip */}
        <div
          className="streak-chip hover-lift interactive-transition"
          id="header-streak-chip"
          role="button"
          tabIndex={0}
          title="Active practice streak"
          onClick={() => navigateTo('/progress')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('/progress'); } }}
        >
          <Flame size={14} style={{ color: 'var(--ac)' }} aria-hidden="true" />
          <span className="num badge-flip" id="header-streak-num">{streakCount}</span>
          <span>streak</span>
        </div>

        {/* Mobile Hamburger */}
        <button
          type="button"
          className="topx-mobile-menu interactive-transition"
          id="topx-mobile-menu"
          aria-label="Open navigation menu"
          aria-expanded={mobileDrawerOpen}
          onClick={() => setMobileDrawerOpen(true)}
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        {/* Sign In (unauthenticated) */}
        {!user && (
          <button
            type="button"
            className="btn-primary header-signin-btn hover-lift interactive-transition"
            id="header-signin-btn"
            onClick={handleOpenAuth}
          >
            Sign In <span aria-hidden="true">→</span>
          </button>
        )}

        {/* Profile Pill (authenticated) */}
        {user && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`profile-pill-btn hover-lift interactive-transition${isProfileActive ? ' active' : ''}`}
              id="header-profile-btn"
              aria-label="User account actions"
              aria-haspopup="true"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            >
              <div className="profile-avatar" id="header-user-avatar">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'Member'}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  avatarInitial
                )}
              </div>
              <ChevronDown size={12} style={{ opacity: 0.5 }} aria-hidden="true" />
            </button>

            {profileMenuOpen && (
              <div className="menu-dropdown open reveal-up" id="menu-profile">
                {/* User info */}
                <div className="menu-header" id="menu-profile-header">
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>{user.name || 'Member'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--mute)', wordBreak: 'break-all' }}>{user.email || ''}</div>
                  {user.branch && (
                    <div style={{ marginTop: '3px', fontSize: '11px', color: 'var(--ac)', fontWeight: 600 }}>
                      {user.branch} {user.academicYear ? `• Year ${user.academicYear}` : ''}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="menu-item interactive-transition"
                  id="open-profile-modal-link"
                  data-tab="profile"
                  onClick={() => navigateTo('/profile')}
                >
                  <User size={15} style={{ color: 'var(--ac)' }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px' }}>My Profile</strong>
                    <span style={{ fontSize: '11px', color: 'var(--mute)' }}>Academic &amp; Coding Handles</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="menu-item interactive-transition"
                  data-tab="tasks"
                  onClick={() => navigateTo('/progress')}
                >
                  <Flame size={15} style={{ color: 'var(--ac)' }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px' }}>Daily Tasks &amp; Streak</strong>
                    <span style={{ fontSize: '11px', color: 'var(--mute)' }}>Track Daily Consistency</span>
                  </div>
                </button>

                <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />

                <button
                  type="button"
                  className="menu-item interactive-transition"
                  id="header-logout-btn"
                  onClick={handleLogout}
                  style={{ color: 'var(--hard)' }}
                >
                  <LogOut size={15} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile Drawer Backdrop ── */}
      {mobileDrawerOpen && (
        <div
          className="topx-drawer-backdrop"
          id="topx-drawer-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Navigation Drawer ── */}
      <aside
        className={`topx-mobile-drawer${mobileDrawerOpen ? ' is-open' : ''}`}
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
            <X size={16} />
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

        {/* Streak in mobile drawer */}
        {user && (
          <div
            className="streak-chip"
            role="button"
            tabIndex={0}
            onClick={() => navigateTo('/progress')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('/progress'); } }}
            style={{ alignSelf: 'flex-start' }}
          >
            <Flame size={14} style={{ color: 'var(--ac)' }} aria-hidden="true" />
            <span className="num">{streakCount}</span>
            <span>day streak</span>
          </div>
        )}

        <nav className="topx-drawer-links" aria-label="Mobile navigation">
          <button type="button" className={`nav-tab-btn${isDashboardActive ? ' active' : ''}`} onClick={() => navigateTo('/dashboard')}>Dashboard</button>
          <button type="button" className={`nav-tab-btn${isTasksActive ? ' active' : ''}`} onClick={() => navigateTo('/progress')}>Daily Tasks</button>
          <button type="button" className={`nav-tab-btn${isLeaderboardActive ? ' active' : ''}`} onClick={() => navigateTo('/leaderboard')}>Leaderboard</button>
          <button type="button" className={`nav-tab-btn${isProfileActive ? ' active' : ''}`} onClick={() => navigateTo(user ? '/profile' : '/login')}>Profile</button>
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
