'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../features/auth/useAuth.js';
import {
  Flame,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  Sparkles,
  Layers,
  Compass,
  BookOpen,
  CalendarDays
} from 'lucide-react';

function NavRollText({ text }) {
  const chars = text.split('');
  return (
    <span className="roll" aria-label={text}>
      <span className="roll-track" aria-hidden="true">
        <span className="roll-line roll-primary">
          {chars.map((c, i) => (
            <span key={i} className="ch" style={{ '--i': i }}>
              {c === ' ' ? '\u00A0' : c}
            </span>
          ))}
        </span>
        <span className="roll-line roll-secondary">
          {chars.map((c, i) => (
            <span key={i} className="ch" style={{ '--i': i }}>
              {c === ' ' ? '\u00A0' : c}
            </span>
          ))}
        </span>
      </span>
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        {text}
      </span>
    </span>
  );
}

export default function AppHeader({ onOpenAuth }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const { user, logout } = auth;

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [resourcesMenuOpen, setResourcesMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const headerRef = useRef(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [initialEntrance, setInitialEntrance] = useState(true);
  const lastScrollY = useRef(0);
  const profileHoverTimerRef = useRef(null);

  // Smooth Apple-style hover handlers with gentle grace period
  const handleProfileMouseEnter = useCallback(() => {
    if (profileHoverTimerRef.current) {
      clearTimeout(profileHoverTimerRef.current);
      profileHoverTimerRef.current = null;
    }
    setProfileMenuOpen(true);
  }, []);

  const handleProfileMouseLeave = useCallback(() => {
    if (profileHoverTimerRef.current) {
      clearTimeout(profileHoverTimerRef.current);
    }
    profileHoverTimerRef.current = setTimeout(() => {
      setProfileMenuOpen(false);
    }, 180); // Apple grace period allows smooth glide into dropdown
  }, []);

  useEffect(() => {
    return () => {
      if (profileHoverTimerRef.current) clearTimeout(profileHoverTimerRef.current);
    };
  }, []);

  // Initial smooth entrance
  useEffect(() => {
    const t = setTimeout(() => setInitialEntrance(false), 700);
    return () => clearTimeout(t);
  }, []);

  // Hide on scroll down, reveal on scroll up
  // NEVER hide if menu/drawer or profile dropdown is open
  useEffect(() => {
    let frame = 0;
    const updateHeader = () => {
      frame = 0;
      const currentScrollY = window.scrollY;
      const visible = profileMenuOpen || resourcesMenuOpen || mobileDrawerOpen ||
        currentScrollY <= 70 || currentScrollY < lastScrollY.current;
      setHeaderVisible(current => current === visible ? current : visible);
      lastScrollY.current = currentScrollY;
    };
    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateHeader);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [profileMenuOpen, resourcesMenuOpen, mobileDrawerOpen]);

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

  // Sliding indicator state & measurements
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const navTabsRef = useRef(null);

  const updateIndicatorToEl = useCallback((element) => {
    if (!element || !navTabsRef.current) return;
    const navRect = navTabsRef.current.getBoundingClientRect();
    const elemRect = element.getBoundingClientRect();
    setIndicatorStyle({
      left: elemRect.left - navRect.left,
      width: elemRect.width,
      opacity: 1
    });
  }, []);

  const resetIndicatorToActive = useCallback(() => {
    if (!navTabsRef.current) return;
    const activeEl = navTabsRef.current.querySelector('.nav-tab-btn.active');
    if (activeEl) {
      updateIndicatorToEl(activeEl);
    } else {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [updateIndicatorToEl]);

  useEffect(() => {
    resetIndicatorToActive();
    const t = setTimeout(resetIndicatorToActive, 60);
    window.addEventListener('resize', resetIndicatorToActive);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', resetIndicatorToActive);
    };
  }, [pathname, resetIndicatorToActive]);

  const handleStreakClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setProfileMenuOpen(false);
    setResourcesMenuOpen(false);
    setMobileDrawerOpen(false);

    if (user) {
      if (pathname === '/profile') {
        const el = document.getElementById('streak') || document.getElementById('current-streak');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      router.push('/profile#streak');
    } else {
      if (pathname === '/') {
        const el = document.getElementById('rewards') || document.getElementById('current-streak');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      router.push('/#rewards');
    }
  };

  // Active check helpers
  const isHomeActive = pathname === '/';
  const isTasksActive = pathname === '/progress';
  const isLeaderboardActive = pathname === '/leaderboard';
  const isEventsActive = pathname === '/events';
  const isGuidesActive = pathname === '/contests';
  const isResourcesActive = pathname === '/problems' || pathname === '/roadmap';
  const isProfileActive = pathname === '/profile' || pathname === '/settings';

  const logoRef = useRef(null);

  const replayLogoAnim = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (!logoRef.current) return;
    const polygons = logoRef.current.querySelectorAll('.lg polygon');
    polygons.forEach((p) => {
      p.style.animation = 'none';
    });
    void logoRef.current.offsetWidth;
    polygons.forEach((p) => {
      p.style.animation = '';
    });
  }, []);

  return (
    <header className={`app-header ${headerVisible ? 'header-visible' : 'header-hidden'} ${initialEntrance ? 'navbar-initial-entrance' : ''}`} ref={headerRef}>
      {/* Brand Logo with Preserved Geometric Animation & Premium Wordmark */}
      <div className="brand-wrap">
        <Link
          ref={logoRef}
          className="brand-logo logo"
          href="/"
          onMouseEnter={replayLogoAnim}
          onFocus={replayLogoAnim}
          onClick={() => { setProfileMenuOpen(false); setResourcesMenuOpen(false); setMobileDrawerOpen(false); }}
          aria-label="Top-X Home"
        >
          {/* Preserved 8-Polygon Angular Geometric Mark */}
          <svg className="lg" viewBox="340 150 910 500" aria-hidden="true">
            <polygon style={{ '--i': 0, '--dx': '-260px', '--dy': '0px', '--r': '-25deg' }} fill="currentColor" points="538,208 587,254 449,393 579,527 529,577 354,395" />
            <polygon style={{ '--i': 1, '--dx': '260px', '--dy': '0px', '--r': '25deg' }} fill="currentColor" points="1059,208 1239,392 1059,575 1011,527 1143,391 1009,254" />
            <polygon style={{ '--i': 2, '--dx': '-300px', '--dy': '300px', '--r': '0deg' }} fill="var(--ac)" points="988,159 1027,159 547,640 508,640" />
            <polygon style={{ '--i': 3, '--dx': '0px', '--dy': '-220px', '--r': '-30deg' }} fill="#5F5F5F" points="625,255 717,255 796,334 745,383 678,313" />
            <polygon style={{ '--i': 4, '--dx': '-200px', '--dy': '-60px', '--r': '40deg' }} fill="var(--ac)" points="625,367 678,313 745,383 694,438" />
            <polygon style={{ '--i': 5, '--dx': '240px', '--dy': '160px', '--r': '30deg' }} fill="var(--ac)" points="942,334 989,382 897,478 850,430" />
            <polygon style={{ '--i': 6, '--dx': '-60px', '--dy': '240px', '--r': '-30deg' }} fill="#5F5F5F" points="770,433 813,390 850,430 897,478 959,544 871,544" />
            <polygon style={{ '--i': 7, '--dx': '0px', '--dy': '-120px', '--r': '90deg' }} fill="#FFA477" points="832,369 870,410 850,430 813,390" />
          </svg>
          <span className="brand-wordmark">
            <span className="brand-name-group">
              <span className="brand-top">TOP-</span>
              <span className="brand-x">X</span>
            </span>
          </span>
        </Link>
      </div>

      {/* Primary Navigation with Fluid Sliding Underline & Letter Roll */}
      <nav
        className="app-nav-tabs"
        ref={navTabsRef}
        onMouseLeave={resetIndicatorToActive}
        aria-label="Main navigation"
      >
        <span
          className="nav-sliding-underline"
          style={{
            transform: `translate3d(${indicatorStyle.left}px, 0, 0)`,
            width: `${indicatorStyle.width}px`,
            opacity: indicatorStyle.opacity
          }}
          aria-hidden="true"
        />
        <Link
          href="/"
          className={`nav-tab-btn ${isHomeActive ? 'active' : ''}`}
          onMouseEnter={(e) => updateIndicatorToEl(e.currentTarget)}
          onFocus={(e) => updateIndicatorToEl(e.currentTarget)}
          onBlur={resetIndicatorToActive}
          onClick={() => { setProfileMenuOpen(false); setResourcesMenuOpen(false); setMobileDrawerOpen(false); }}
        >
          <NavRollText text="Home" />
        </Link>
        <Link
          href="/progress"
          className={`nav-tab-btn ${isTasksActive ? 'active' : ''}`}
          onMouseEnter={(e) => updateIndicatorToEl(e.currentTarget)}
          onFocus={(e) => updateIndicatorToEl(e.currentTarget)}
          onBlur={resetIndicatorToActive}
          onClick={() => { setProfileMenuOpen(false); setResourcesMenuOpen(false); setMobileDrawerOpen(false); }}
        >
          <NavRollText text="Weekly Tasks" />
        </Link>
        <Link
          href="/leaderboard"
          className={`nav-tab-btn ${isLeaderboardActive ? 'active' : ''}`}
          onMouseEnter={(e) => updateIndicatorToEl(e.currentTarget)}
          onFocus={(e) => updateIndicatorToEl(e.currentTarget)}
          onBlur={resetIndicatorToActive}
          onClick={() => { setProfileMenuOpen(false); setResourcesMenuOpen(false); setMobileDrawerOpen(false); }}
        >
          <NavRollText text="Leaderboard" />
        </Link>
        <Link
          href="/events"
          className={`nav-tab-btn ${isEventsActive ? 'active' : ''}`}
          onMouseEnter={(e) => updateIndicatorToEl(e.currentTarget)}
          onFocus={(e) => updateIndicatorToEl(e.currentTarget)}
          onBlur={resetIndicatorToActive}
          onClick={() => { setProfileMenuOpen(false); setResourcesMenuOpen(false); setMobileDrawerOpen(false); }}
        >
          <NavRollText text="Events" />
        </Link>
        <Link
          href={user ? '/profile' : '/login'}
          className={`nav-tab-btn ${isProfileActive ? 'active' : ''}`}
          onMouseEnter={(e) => {
            updateIndicatorToEl(e.currentTarget);
            handleProfileMouseEnter();
          }}
          onFocus={(e) => updateIndicatorToEl(e.currentTarget)}
          onBlur={resetIndicatorToActive}
          onMouseLeave={handleProfileMouseLeave}
          onClick={() => { setProfileMenuOpen(false); setResourcesMenuOpen(false); setMobileDrawerOpen(false); }}
        >
          <NavRollText text="Profile" />
        </Link>
      </nav>

      {/* Header Right Utility Controls */}
      <div className="header-right">
        {/* Consistency Streak Chip */}
        <div
          className="streak-chip"
          id="header-streak-chip"
          role="button"
          tabIndex={0}
          title="Active practice streak — Click to view current streak"
          onClick={handleStreakClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStreakClick(e); } }}
        >
          <Flame size={17} className="streak-flame-svg" aria-hidden="true" />
          <span className="num" id="header-streak-num">{streakCount}</span>
          <span className="streak-label">streak</span>
        </div>

        {/* Menu button to open overlay on any screen size */}
        <button
          type="button"
          className="topx-mobile-menu topx-menu-btn"
          id="topx-mobile-menu"
          aria-label="Open navigation menu"
          aria-expanded={mobileDrawerOpen}
          onClick={() => setMobileDrawerOpen(true)}
        >
          <span className="topx-menu-text" style={{ fontSize: '12px', fontWeight: 650 }}>Menu</span>
          <Menu size={16} aria-hidden="true" />
        </button>

        {/* Profile / Account Control with Apple-Style Smooth Dropdown */}
        {user ? (
          <div
            className={`profile-dropdown-wrapper ${profileMenuOpen ? 'is-open' : ''}`}
            onMouseEnter={handleProfileMouseEnter}
            onMouseLeave={handleProfileMouseLeave}
          >
            <button
              type="button"
              className={`profile-pill-btn ${isProfileActive ? 'active' : ''} ${profileMenuOpen ? 'menu-active' : ''}`}
              id="header-profile-btn"
              aria-label="User account actions"
              aria-haspopup="true"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((prev) => !prev)}
            >
              <div
                className="profile-avatar"
                id="header-user-avatar"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'Member'}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  (user.name || 'U').slice(0, 1).toUpperCase()
                )}
              </div>
              <ChevronDown size={14} className={`profile-chevron-arrow ${profileMenuOpen ? 'rotate' : ''}`} aria-hidden="true" />
            </button>

            {/* Apple-Style Smooth Dropdown Menu */}
            <div
              className={`apple-profile-dropdown ${profileMenuOpen ? 'open' : ''}`}
              id="menu-profile"
              role="menu"
              aria-orientation="vertical"
            >
              {/* Profile Card Header */}
              <div className="apple-dropdown-header" id="menu-profile-header">
                <div className="apple-header-avatar-wrap">
                  <div className="apple-header-avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name || 'Member'} referrerPolicy="no-referrer" />
                    ) : (
                      (user.name || 'U').slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <span className="apple-status-dot" title="Active Member" />
                </div>
                <div className="apple-header-info">
                  <div className="apple-user-name">{user.name || 'Member'}</div>
                  <div className="apple-user-email">{user.email || ''}</div>
                  <div className="apple-streak-badge">
                    <Flame size={12} className="streak-flame-icon" />
                    <span>{streakCount} Day Active Streak</span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="apple-dropdown-items">
                <button
                  type="button"
                  className="apple-menu-item"
                  id="open-profile-modal-link"
                  data-tab="profile"
                  onClick={() => navigateTo('/profile')}
                >
                  <div className="apple-item-icon apple-icon-profile">
                    <User size={15} />
                  </div>
                  <div className="apple-item-content">
                    <strong className="apple-item-title">My Profile</strong>
                    <span className="apple-item-sub">Academic &amp; Coding Handles</span>
                  </div>
                  <span className="apple-item-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="apple-menu-item"
                  data-tab="tasks"
                  onClick={() => navigateTo('/progress')}
                >
                  <div className="apple-item-icon apple-icon-tasks">
                    <Flame size={15} />
                  </div>
                  <div className="apple-item-content">
                    <strong className="apple-item-title">Weekly Tasks &amp; Streak</strong>
                    <span className="apple-item-sub">Track Weekly Consistency</span>
                  </div>
                  <span className="apple-item-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="apple-menu-item"
                  data-tab="leaderboard"
                  onClick={() => navigateTo('/leaderboard')}
                >
                  <div className="apple-item-icon apple-icon-leaderboard">
                    <Sparkles size={15} />
                  </div>
                  <div className="apple-item-content">
                    <strong className="apple-item-title">Batch Leaderboard</strong>
                    <span className="apple-item-sub">Rankings &amp; Performance</span>
                  </div>
                  <span className="apple-item-arrow">→</span>
                </button>

                <div className="apple-dropdown-divider" />

                <button
                  type="button"
                  className="apple-menu-item apple-signout-item"
                  id="header-logout-btn"
                  onClick={handleLogout}
                >
                  <div className="apple-item-icon apple-icon-logout">
                    <LogOut size={15} />
                  </div>
                  <div className="apple-item-content">
                    <strong className="apple-item-title">Sign Out</strong>
                    <span className="apple-item-sub">End current session</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`profile-dropdown-wrapper unauth-profile-wrapper ${profileMenuOpen ? 'is-open' : ''}`}
            onMouseEnter={handleProfileMouseEnter}
            onMouseLeave={handleProfileMouseLeave}
          >
            <button
              type="button"
              className="btn-primary header-signin-btn"
              id="header-signin-btn"
              onClick={handleOpenAuth}
            >
              <span>Sign In</span>
              <span style={{ fontSize: '14px', lineHeight: 1 }}>→</span>
            </button>

            {/* Apple-Style Smooth Dropdown for Guest Visitors */}
            <div
              className={`apple-profile-dropdown ${profileMenuOpen ? 'open' : ''}`}
              id="menu-profile"
              role="menu"
              aria-orientation="vertical"
              style={{ width: '270px' }}
            >
              <div className="apple-dropdown-header">
                <div className="apple-header-avatar-wrap">
                  <div className="apple-header-avatar guest-avatar">
                    <User size={18} />
                  </div>
                </div>
                <div className="apple-header-info">
                  <div className="apple-user-name">Welcome to Top-X</div>
                  <div className="apple-user-email">Join the competitive batch</div>
                </div>
              </div>

              <div className="apple-dropdown-items">
                <button
                  type="button"
                  className="apple-menu-item"
                  onClick={handleOpenAuth}
                >
                  <div className="apple-item-icon apple-icon-profile">
                    <User size={15} />
                  </div>
                  <div className="apple-item-content">
                    <strong className="apple-item-title">Sign In / Register</strong>
                    <span className="apple-item-sub">Access your CP dashboard</span>
                  </div>
                  <span className="apple-item-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="apple-menu-item"
                  onClick={() => navigateTo('/progress')}
                >
                  <div className="apple-item-icon apple-icon-tasks">
                    <Flame size={15} />
                  </div>
                  <div className="apple-item-content">
                    <strong className="apple-item-title">Weekly Tasks Preview</strong>
                    <span className="apple-item-sub">Curated problem sets</span>
                  </div>
                  <span className="apple-item-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="apple-menu-item"
                  onClick={() => navigateTo('/leaderboard')}
                >
                  <div className="apple-item-icon apple-icon-leaderboard">
                    <Sparkles size={15} />
                  </div>
                  <div className="apple-item-content">
                    <strong className="apple-item-title">Hall of Fame</strong>
                    <span className="apple-item-sub">Batch leaderboard standings</span>
                  </div>
                  <span className="apple-item-arrow">→</span>
                </button>
              </div>
            </div>
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
          <strong>Top-X</strong>
          <button
            type="button"
            id="topx-drawer-close"
            aria-label="Close navigation"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <X size={18} />
          </button>
        </div>


        <nav className="topx-drawer-links" aria-label="Mobile navigation">
          <button type="button" className={`nav-tab-btn ${isHomeActive ? 'active' : ''}`} onClick={() => navigateTo('/')}>Home</button>
          <button type="button" className={`nav-tab-btn ${isTasksActive ? 'active' : ''}`} onClick={() => navigateTo('/progress')}>Weekly Tasks</button>
          <button type="button" className={`nav-tab-btn ${isLeaderboardActive ? 'active' : ''}`} onClick={() => navigateTo('/leaderboard')}>Leaderboard</button>
          <button type="button" className={`nav-tab-btn ${isEventsActive ? 'active' : ''}`} onClick={() => navigateTo('/events')}><CalendarDays size={16} /> Event Registration</button>
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
