'use client';
import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import ContributionHeatmap from '../../../profile/ContributionHeatmap.jsx';
import {
  User,
  School,
  GraduationCap,
  Layers,
  Flame,
  Trophy,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  Sparkles
} from 'lucide-react';

export default function ProfileView({ active = false, user: initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [branch, setBranch] = useState('');
  const [section, setSection] = useState('');
  const [classDivision, setClassDivision] = useState('');

  const [leetcode, setLeetcode] = useState('');
  const [codeforces, setCodeforces] = useState('');
  const [codechef, setCodechef] = useState('');

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Hydrate user state without fabricating fake defaults
  useEffect(() => {
    const applyUser = (u) => {
      if (!u) return;
      setUser(u);
      setName(u.name || '');
      setCollege(u.college || '');
      setAcademicYear(u.academicYear || '');
      setBranch(u.branch || '');
      setSection(u.section || '');
      setClassDivision(u.classDivision || '');
      setLeetcode(u.handles?.leetcode || '');
      setCodeforces(u.handles?.codeforces || '');
      setCodechef(u.handles?.codechef || '');
    };

    if (initialUser) {
      applyUser(initialUser);
    } else {
      let storedUser = null;
      try {
        const raw = window.localStorage.getItem('topx_user');
        if (raw) storedUser = JSON.parse(raw);
      } catch (_) {}

      if (storedUser?.id) {
        api(`/api/user/profile/${encodeURIComponent(storedUser.id)}`)
          .then(({ user: u }) => applyUser(u))
          .catch(() => applyUser(storedUser));
      }
    }
  }, [initialUser]);

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!user?.id) {
      setError('Please sign in to update your profile.');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const { user: updated } = await api(`/api/user/profile/${encodeURIComponent(user.id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          college: college.trim(),
          academicYear,
          branch,
          section,
          classDivision
        })
      });
      setUser(updated);
      try { window.localStorage.setItem('topx_user', JSON.stringify(updated)); } catch (_) {}
      setMessage('Profile details updated and saved successfully.');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save profile details.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHandles = async () => {
    if (!user?.id) return;
    try {
      const { user: updated } = await api(`/api/user/handles/${encodeURIComponent(user.id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          leetcode: leetcode.trim(),
          codeforces: codeforces.trim(),
          codechef: codechef.trim()
        })
      });
      setUser(updated);
      try { window.localStorage.setItem('topx_user', JSON.stringify(updated)); } catch (_) {}
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to save coding handles.');
      throw err;
    }
  };

  const handleSyncAll = async () => {
    if (!user?.id) {
      setError('Please sign in to sync platform data.');
      return;
    }
    setSyncing(true);
    setMessage('');
    setError('');

    try {
      await handleSaveHandles();
      const res = await api(`/api/sync/all/${encodeURIComponent(user.id)}`, { method: 'POST' });
      setUser(res.user);
      try { window.localStorage.setItem('topx_user', JSON.stringify(res.user)); } catch (_) {}
      setMessage('Coding platform stats and consistency streak synchronized successfully.');
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setError(err.message || 'Synchronization failed. Please verify handle names and try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (platform) => {
    if (!user?.id) return;
    const nextHandles = {
      leetcode: platform === 'leetcode' ? '' : leetcode,
      codeforces: platform === 'codeforces' ? '' : codeforces,
      codechef: platform === 'codechef' ? '' : codechef
    };
    if (platform === 'leetcode') setLeetcode('');
    if (platform === 'codeforces') setCodeforces('');
    if (platform === 'codechef') setCodechef('');

    try {
      const { user: updated } = await api(`/api/user/handles/${encodeURIComponent(user.id)}`, {
        method: 'PUT',
        body: JSON.stringify(nextHandles)
      });
      setUser(updated);
      try { window.localStorage.setItem('topx_user', JSON.stringify(updated)); } catch (_) {}
      setMessage(`${platform.toUpperCase()} disconnected.`);
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Disconnect failed.');
    }
  };

  const stats = user?.syncedStats || {};
  const lcStats = stats.leetcode;
  const cfStats = stats.codeforces;
  const ccStats = stats.codechef;

  const totalUniqueSolved = Number(user?.totalUniqueSolved) || ((Number(lcStats?.solved) || 0) + (Number(cfStats?.acceptedProblemsLast10000) || 0) + (Number(ccStats?.solved) || 0));
  const currentStreak = Number(user?.currentStreak) || 0;
  const longestStreak = Number(user?.longestStreak) || 0;
  const totalActiveDays = Number(user?.totalActiveDays) || 0;

  return (
    <section className={`tab-view ${active ? 'active' : ''}`} id="view-profile">
      <div className="view-wrap" style={{ maxWidth: '1120px' }}>
        {/* Editorial Page Header */}
        <div className="section-head" style={{ paddingTop: '0', marginBottom: '28px' }}>
          <h2>My Profile</h2>
          <p className="sub">
            Manage your academic cohort details, connect verified competitive programming handles, and maintain your practice consistency.
          </p>
        </div>

        {/* Guest sign-in prompt when unauthenticated */}
        {!user?.id && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '24px',
              padding: '16px 20px',
              borderRadius: '12px',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--sh-sm)'
            }}
          >
            <div>
              <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>Sign in to manage your profile</strong>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--mute)' }}>
                Sign in with Google to save your academic cohort, connect verified coding handles, and join the college leaderboard.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              id="profile-guest-signin-btn"
              onClick={() => {
                const signinBtn = document.getElementById('header-signin-btn');
                if (signinBtn) signinBtn.click();
                else window.location.href = '/login';
              }}
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              Sign In with Google →
            </button>
          </div>
        )}

        {/* Identity & Status Card */}
        <div className="profile-banner" style={{ marginBottom: '24px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px' }}>
          <div className="profile-banner-avatar-wrap">
            <div
              className="profile-banner-avatar"
              id="page-profile-avatar"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 700,
                background: 'var(--surface-alt)',
                border: '2px solid var(--line)',
                color: 'var(--ink)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'Member'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (user?.name || 'M').slice(0, 1).toUpperCase()
              )}
            </div>
          </div>

          <div className="profile-banner-info" style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 id="page-profile-name" style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>
                {user?.name || 'Student Member'}
              </h3>
              {user?.isPro && (
                <span className="badge-pill" style={{ background: 'rgba(255,90,54,0.1)', color: 'var(--ac)', fontWeight: 700 }}>
                  <Sparkles size={11} style={{ display: 'inline', marginRight: '4px' }} />
                  Top-X Pro
                </span>
              )}
            </div>
            <p id="page-profile-email" style={{ margin: '4px 0 10px', color: 'var(--mute)', fontSize: '13px' }}>
              {user?.email || 'Signed-in member'}
            </p>

            {/* Academic Cohort Pill Summary */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12px' }}>
              <span className="profile-cohort-chip" style={{ padding: '3px 9px', borderRadius: '6px', background: 'var(--surface-alt)', border: '1px solid var(--line)' }}>
                🏫 {user?.college ? user.college : <i style={{ opacity: 0.6 }}>College not set</i>}
              </span>
              <span className="profile-cohort-chip" style={{ padding: '3px 9px', borderRadius: '6px', background: 'var(--surface-alt)', border: '1px solid var(--line)' }}>
                🎓 {user?.branch ? user.branch : <i style={{ opacity: 0.6 }}>Branch not set</i>}
              </span>
              <span className="profile-cohort-chip" style={{ padding: '3px 9px', borderRadius: '6px', background: 'var(--surface-alt)', border: '1px solid var(--line)' }}>
                📅 {user?.academicYear ? `Year ${user.academicYear}` : <i style={{ opacity: 0.6 }}>Year not set</i>}
              </span>
              <span className="profile-cohort-chip" style={{ padding: '3px 9px', borderRadius: '6px', background: 'var(--surface-alt)', border: '1px solid var(--line)' }}>
                🏷️ {user?.section ? `Sec ${user.section}` : <i style={{ opacity: 0.6 }}>Sec not set</i>}
              </span>
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn-primary"
              type="button"
              id="page-profile-sync"
              onClick={handleSyncAll}
              disabled={syncing}
              style={{ minHeight: '40px', padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
            >
              <RefreshCw size={14} className={syncing ? 'spin-icon' : ''} />
              {syncing ? 'Synchronizing...' : 'Sync Platforms'}
            </button>
            <button
              className="bs-ctl-btn"
              id="page-profile-logout"
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const logoutBtn = document.getElementById('header-logout-btn');
                  if (logoutBtn) logoutBtn.click();
                  else {
                    window.localStorage.removeItem('topx_token');
                    window.localStorage.removeItem('topx_user');
                    window.location.href = '/';
                  }
                }
              }}
              style={{ minHeight: '40px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        </div>

        {/* Feedback Alert Banners */}
        {message && (
          <div className="profile-feedback success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}>
            <CheckCircle2 size={16} /> <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="profile-feedback error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}

        {/* Consistency Streak & Metrics Grid */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Coding Consistency &amp; Momentum</h3>
            <span className="sm" style={{ color: 'var(--mute)' }}>Backed by verified platform submissions</span>
          </div>

          <div className="profile-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
            <div className="profile-metric-card" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px' }}>
              <div className="metric-label" style={{ fontSize: '12px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Streak</div>
              <div className="metric-value-row" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <Flame size={22} style={{ color: 'var(--ac)' }} />
                <span className="metric-number" style={{ fontSize: '28px', fontWeight: 800 }}>{currentStreak}</span>
                <span className="metric-unit" style={{ color: 'var(--mute)', fontSize: '13px' }}>days</span>
              </div>
            </div>

            <div className="profile-metric-card" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px' }}>
              <div className="metric-label" style={{ fontSize: '12px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Longest Streak</div>
              <div className="metric-value-row" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <Trophy size={22} style={{ color: '#eab308' }} />
                <span className="metric-number" style={{ fontSize: '28px', fontWeight: 800 }}>{longestStreak}</span>
                <span className="metric-unit" style={{ color: 'var(--mute)', fontSize: '13px' }}>days</span>
              </div>
            </div>

            <div className="profile-metric-card" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px' }}>
              <div className="metric-label" style={{ fontSize: '12px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Practice Days</div>
              <div className="metric-value-row" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <Calendar size={22} style={{ color: '#3b82f6' }} />
                <span className="metric-number" style={{ fontSize: '28px', fontWeight: 800 }}>{totalActiveDays}</span>
                <span className="metric-unit" style={{ color: 'var(--mute)', fontSize: '13px' }}>days</span>
              </div>
            </div>

            <div className="profile-metric-card" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px' }}>
              <div className="metric-label" style={{ fontSize: '12px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Problems Solved</div>
              <div className="metric-value-row" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <Sparkles size={22} style={{ color: 'var(--ink)' }} />
                <span className="metric-number" style={{ fontSize: '28px', fontWeight: 800 }}>{totalUniqueSolved}</span>
                <span className="metric-unit" style={{ color: 'var(--mute)', fontSize: '13px' }}>solved</span>
              </div>
            </div>
          </div>
        </div>

        {/* GitHub-style Coding Contribution Heatmap */}
        <div style={{ marginBottom: '28px' }}>
          <ContributionHeatmap dailyActivity={user?.dailyActivity || {}} />
        </div>

        {/* Academic and Institutional Details Form */}
        <div className="profile-form-card" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px', marginBottom: '28px' }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Academic &amp; College Information</h3>
            <p className="form-sub" style={{ margin: '4px 0 0', color: 'var(--mute)', fontSize: '13px' }}>
              Your academic year, branch, and section determine your cohort rankings on the Top X Club leaderboard.
            </p>
          </div>

          <form id="page-profile-form" onSubmit={handleSaveProfile} className="profile-form-grid">
            <div className="auth-field">
              <label htmlFor="page-profile-name-input">Full Name</label>
              <input
                id="page-profile-name-input"
                maxLength="80"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="page-profile-college-input">College / Institution</label>
              <input
                id="page-profile-college-input"
                maxLength="120"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. Stanford University or IIIT"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="page-profile-year-input">Academic Year</label>
              <select
                id="page-profile-year-input"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              >
                <option value="">Not set</option>
                <option value="First">First Year (1st)</option>
                <option value="Second">Second Year (2nd)</option>
                <option value="Third">Third Year (3rd)</option>
                <option value="Fourth">Fourth Year (4th)</option>
              </select>
            </div>

            <div className="auth-field">
              <label htmlFor="page-profile-branch-input">Branch / Degree</label>
              <select
                id="page-profile-branch-input"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                <option value="">Not set</option>
                <option value="CSE">Computer Science (CSE)</option>
                <option value="IT">Information Technology (IT)</option>
                <option value="ECE">Electronics &amp; Comm (ECE)</option>
                <option value="EEE">Electrical Engineering (EEE)</option>
                <option value="CSBS">CS &amp; Business Systems (CSBS)</option>
                <option value="AIDS">AI &amp; Data Science (AIDS)</option>
                <option value="MECH">Mechanical Engineering</option>
                <option value="CIVIL">Civil Engineering</option>
                <option value="CHEMICAL">Chemical Engineering</option>
                <option value="IP">Industrial Production (IP)</option>
              </select>
            </div>

            <div className="auth-field">
              <label htmlFor="page-profile-section-input">Section / Class</label>
              <select
                id="page-profile-section-input"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                <option value="">Not set</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
              </select>
            </div>

            <div className="auth-field">
              <label htmlFor="page-profile-division-input">Class Division</label>
              <select
                id="page-profile-division-input"
                value={classDivision}
                onChange={(e) => setClassDivision(e.target.value)}
              >
                <option value="">Not set</option>
                <option value="A">Division A</option>
                <option value="B">Division B</option>
                <option value="C">Division C</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
              <button className="btn-primary" type="submit" id="page-profile-save" disabled={saving}>
                {saving ? 'Saving changes...' : 'Save Profile Details'}
              </button>
            </div>
          </form>
        </div>

        {/* Connected Coding Platforms Section */}
        <div className="profile-form-card" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Connected Coding Platforms</h3>
              <p className="form-sub" style={{ margin: '4px 0 0', color: 'var(--mute)', fontSize: '13px' }}>
                Enter your public handles. No passwords or tokens are ever requested.
              </p>
            </div>
          </div>

          <div className="cp-platform-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            {/* LeetCode Card */}
            <div className="cp-card" style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px' }}>
              <div className="cp-card-head lc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <b style={{ fontSize: '15px' }}>LeetCode</b>
                  <span className="sm" style={{ display: 'block', color: 'var(--mute)' }}>Public account lookup</span>
                </div>
                <span className={`badge-pill ${leetcode ? 'connected' : ''}`} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: leetcode ? 'rgba(34,197,94,0.15)' : 'var(--line)', color: leetcode ? '#16a34a' : 'var(--mute)' }}>
                  {leetcode ? 'Linked' : 'Not linked'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', margin: '10px 0' }}>
                <input
                  id="page-handle-leetcode"
                  value={leetcode}
                  onChange={(e) => setLeetcode(e.target.value)}
                  placeholder="LeetCode username"
                  autoComplete="off"
                  style={{ flex: 1 }}
                />
                {leetcode && (
                  <button
                    type="button"
                    onClick={() => handleDisconnect('leetcode')}
                    className="bs-ctl-btn"
                    title="Disconnect LeetCode"
                    style={{ padding: '0 8px', color: 'var(--hard)' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="cp-card-stat-box" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--mute)' }}>Total solved</span>
                  <b id="page-lc-solved" className="num" style={{ fontSize: '13px' }}>{lcStats?.solved ?? '—'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--mute)' }}>Easy / Med / Hard</span>
                  <b id="page-lc-breakdown" className="num" style={{ fontSize: '12px' }}>{lcStats ? `${lcStats.easy || 0} / ${lcStats.medium || 0} / ${lcStats.hard || 0}` : '—'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--mute)' }}>Global Ranking</span>
                  <b id="page-lc-rank" className="num" style={{ fontSize: '12px' }}>{lcStats?.ranking ? `#${lcStats.ranking}` : '—'}</b>
                </div>
              </div>

              {leetcode && (
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  <a
                    href={`https://leetcode.com/u/${encodeURIComponent(leetcode)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--ac)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>View LeetCode Profile</span> <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>

            {/* Codeforces Card */}
            <div className="cp-card" style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px' }}>
              <div className="cp-card-head cf" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <b style={{ fontSize: '15px' }}>Codeforces</b>
                  <span className="sm" style={{ display: 'block', color: 'var(--mute)' }}>Official public API</span>
                </div>
                <span className={`badge-pill ${codeforces ? 'connected' : ''}`} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: codeforces ? 'rgba(34,197,94,0.15)' : 'var(--line)', color: codeforces ? '#16a34a' : 'var(--mute)' }}>
                  {codeforces ? 'Linked' : 'Not linked'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', margin: '10px 0' }}>
                <input
                  id="page-handle-codeforces"
                  value={codeforces}
                  onChange={(e) => setCodeforces(e.target.value)}
                  placeholder="Codeforces handle"
                  autoComplete="off"
                  style={{ flex: 1 }}
                />
                {codeforces && (
                  <button
                    type="button"
                    onClick={() => handleDisconnect('codeforces')}
                    className="bs-ctl-btn"
                    title="Disconnect Codeforces"
                    style={{ padding: '0 8px', color: 'var(--hard)' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="cp-card-stat-box" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--mute)' }}>Rating</span>
                  <b id="page-cf-rating" className="num" style={{ fontSize: '13px' }}>{cfStats?.rating ? cfStats.rating : '—'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--mute)' }}>Rank Title</span>
                  <b id="page-cf-rank" style={{ fontSize: '12px' }}>{cfStats?.rank || '—'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--mute)' }}>Max Rating</span>
                  <b id="page-cf-max" className="num" style={{ fontSize: '12px' }}>{cfStats?.maxRating || '—'}</b>
                </div>
              </div>

              {codeforces && (
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  <a
                    href={`https://codeforces.com/profile/${encodeURIComponent(codeforces)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--ac)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>View Codeforces Profile</span> <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>

            {/* CodeChef Card */}
            <div className="cp-card" style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)', borderRadius: '12px', padding: '18px' }}>
              <div className="cp-card-head cc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <b style={{ fontSize: '15px' }}>CodeChef</b>
                  <span className="sm" style={{ display: 'block', color: 'var(--mute)' }}>Community stats service</span>
                </div>
                <span className={`badge-pill ${codechef ? 'connected' : ''}`} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: codechef ? 'rgba(34,197,94,0.15)' : 'var(--line)', color: codechef ? '#16a34a' : 'var(--mute)' }}>
                  {codechef ? 'Linked' : 'Not linked'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', margin: '10px 0' }}>
                <input
                  id="page-handle-codechef"
                  value={codechef}
                  onChange={(e) => setCodechef(e.target.value)}
                  placeholder="CodeChef username"
                  autoComplete="off"
                  style={{ flex: 1 }}
                />
                {codechef && (
                  <button
                    type="button"
                    onClick={() => handleDisconnect('codechef')}
                    className="bs-ctl-btn"
                    title="Disconnect CodeChef"
                    style={{ padding: '0 8px', color: 'var(--hard)' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="cp-card-stat-box" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--mute)' }}>Rating</span>
                  <b id="page-cc-rating" className="num" style={{ fontSize: '13px' }}>{ccStats?.currentRating || ccStats?.rating || '—'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--mute)' }}>Stars</span>
                  <b id="page-cc-stars" style={{ fontSize: '12px' }}>{ccStats?.stars || '—'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--mute)' }}>Global Rank</span>
                  <b id="page-cc-rank" className="num" style={{ fontSize: '12px' }}>{ccStats?.globalRank ? `#${ccStats.globalRank}` : '—'}</b>
                </div>
              </div>

              {codechef && (
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  <a
                    href={`https://www.codechef.com/users/${encodeURIComponent(codechef)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--ac)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>View CodeChef Profile</span> <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <p className="sm" id="page-profile-sync-status" aria-live="polite" style={{ color: 'var(--mute)', margin: 0 }}>
              {user?.lastSyncedAt ? `Last synchronized on ${new Date(user.lastSyncedAt).toLocaleString()}` : 'Connect your handles and click Sync to pull verified accepted submissions.'}
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSyncAll}
              disabled={syncing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 20px' }}
            >
              <RefreshCw size={14} className={syncing ? 'spin-icon' : ''} />
              {syncing ? 'Synchronizing Handles...' : 'Sync All Platforms Now'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
