'use client';
import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import ContributionHeatmap from '../../../profile/ContributionHeatmap.jsx';

export default function ProfileView({ active = false, user: initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [academicYear, setAcademicYear] = useState('First');
  const [branch, setBranch] = useState('CSE');
  const [section, setSection] = useState('A');
  const [classDivision, setClassDivision] = useState('A');

  const [leetcode, setLeetcode] = useState('');
  const [codeforces, setCodeforces] = useState('');
  const [codechef, setCodechef] = useState('');

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Hydrate user state
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setName(initialUser.name || '');
      setCollege(initialUser.college || 'Engineering Institute');
      setAcademicYear(initialUser.academicYear || 'First');
      setBranch(initialUser.branch || 'CSE');
      setSection(initialUser.section || 'A');
      setClassDivision(initialUser.classDivision || 'A');
      setLeetcode(initialUser.handles?.leetcode || '');
      setCodeforces(initialUser.handles?.codeforces || '');
      setCodechef(initialUser.handles?.codechef || '');
    } else {
      let storedUser = null;
      try {
        const raw = window.localStorage.getItem('topx_user');
        if (raw) storedUser = JSON.parse(raw);
      } catch (_) {}

      if (storedUser?.id) {
        api(`/api/user/profile/${encodeURIComponent(storedUser.id)}`)
          .then(({ user: u }) => {
            setUser(u);
            setName(u.name || '');
            setCollege(u.college || 'Engineering Institute');
            setAcademicYear(u.academicYear || 'First');
            setBranch(u.branch || 'CSE');
            setSection(u.section || 'A');
            setClassDivision(u.classDivision || 'A');
            setLeetcode(u.handles?.leetcode || '');
            setCodeforces(u.handles?.codeforces || '');
            setCodechef(u.handles?.codechef || '');
          })
          .catch(() => {});
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
      setMessage('Profile details saved successfully.');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save profile.');
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
      setError(err.message || 'Failed to save handles.');
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
      setMessage('Platform activity and streak synchronized successfully!');
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setError(err.message || 'Synchronization failed. Check handle names and try again.');
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
        <div className="section-head" style={{ paddingTop: '0' }}>
          <h2>My Topics Club Profile</h2>
          <p className="sub">
            Track your personal coding progress, connect your competitive programming handles, and maintain your streak.
          </p>
        </div>

        {/* User Identity Banner */}
        <div className="profile-banner" style={{ marginBottom: '22px' }}>
          <div className="profile-banner-avatar-wrap">
            <div
              className="profile-banner-avatar"
              id="page-profile-avatar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                background: 'var(--card)',
                color: 'var(--ink)'
              }}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'Member'}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                (user?.name || 'M').slice(0, 1).toUpperCase()
              )}
            </div>
          </div>
          <div className="profile-banner-info">
            <h4 id="page-profile-name">{user?.name || 'Student Member'}</h4>
            <p id="page-profile-email">{user?.email || 'Signed-in member'}</p>
            <div className="profile-badge-tag">
              {user?.isPro ? '⚡ Top-X Pro' : 'Student Member'} • {user?.branch || 'CSE'} (Year {user?.academicYear || '1'})
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn-primary"
              type="button"
              id="page-profile-sync"
              onClick={handleSyncAll}
              disabled={syncing}
              style={{ minHeight: '38px', padding: '0 14px' }}
            >
              {syncing ? '↻ Synchronizing...' : '↻ Sync All Platforms'}
            </button>
            <button className="bs-ctl-btn" id="page-profile-logout" type="button">
              Log out
            </button>
          </div>
        </div>

        {/* Feedback messages */}
        {message && (
          <div className="profile-feedback success">
            <span>✓</span> {message}
          </div>
        )}
        {error && (
          <div className="profile-feedback error">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Streak & Metrics Grid */}
        <div className="profile-stat-grid">
          <div className="profile-metric-card">
            <div className="metric-label">Current Streak</div>
            <div className="metric-value-row">
              <span className="metric-emoji">🔥</span>
              <span className="metric-number">{currentStreak}</span>
              <span className="metric-unit">days</span>
            </div>
          </div>
          <div className="profile-metric-card">
            <div className="metric-label">Longest Streak</div>
            <div className="metric-value-row">
              <span className="metric-emoji">🏆</span>
              <span className="metric-number">{longestStreak}</span>
              <span className="metric-unit">days</span>
            </div>
          </div>
          <div className="profile-metric-card">
            <div className="metric-label">Total Active Days</div>
            <div className="metric-value-row">
              <span className="metric-emoji">📅</span>
              <span className="metric-number">{totalActiveDays}</span>
              <span className="metric-unit">active days</span>
            </div>
          </div>
          <div className="profile-metric-card">
            <div className="metric-label">Total Unique Solved</div>
            <div className="metric-value-row">
              <span className="metric-emoji">⚡</span>
              <span className="metric-number">{totalUniqueSolved}</span>
              <span className="metric-unit">problems</span>
            </div>
          </div>
        </div>

        {/* GitHub-style Coding Contribution Heatmap */}
        <ContributionHeatmap dailyActivity={user?.dailyActivity || {}} />

        {/* Academic and Institutional Details Form */}
        <div className="profile-form-card">
          <h3>Academic &amp; College Information</h3>
          <p className="form-sub">
            Your branch, academic year, and section determine your cohort comparisons on the club leaderboard.
          </p>
          <form id="page-profile-form" onSubmit={handleSaveProfile} className="profile-form-grid">
            <div className="auth-field">
              <label htmlFor="page-profile-name-input">Full Name</label>
              <input
                id="page-profile-name-input"
                maxLength="80"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="page-profile-college-input">College / Institute</label>
              <input
                id="page-profile-college-input"
                maxLength="120"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="Engineering Institute"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="page-profile-year-input">Academic Year</label>
              <select
                id="page-profile-year-input"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              >
                <option value="First">First Year (1st)</option>
                <option value="Second">Second Year (2nd)</option>
                <option value="Third">Third Year (3rd)</option>
                <option value="Fourth">Fourth Year (4th)</option>
                <option value="Not specified">Not specified</option>
              </select>
            </div>
            <div className="auth-field">
              <label htmlFor="page-profile-branch-input">Branch / Department</label>
              <select
                id="page-profile-branch-input"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
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
                <option value="Not specified">Not specified</option>
              </select>
            </div>
            <div className="auth-field">
              <label htmlFor="page-profile-section-input">Section</label>
              <select
                id="page-profile-section-input"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
                <option value="Not specified">Not specified</option>
              </select>
            </div>
            <div className="auth-field">
              <label htmlFor="page-profile-division-input">Class Division</label>
              <select
                id="page-profile-division-input"
                value={classDivision}
                onChange={(e) => setClassDivision(e.target.value)}
              >
                <option value="A">Division A</option>
                <option value="B">Division B</option>
                <option value="C">Division C</option>
                <option value="Not specified">Not specified</option>
              </select>
            </div>
            <div>
              <button className="btn-primary" type="submit" id="page-profile-save" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Coding Platforms Connections */}
        <div className="profile-form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div>
              <h3>Connected Coding Platforms</h3>
              <p className="form-sub" style={{ marginBottom: 0 }}>Enter public usernames/handles. No passwords or private tokens required.</p>
            </div>
          </div>

          <div className="cp-platform-cards">
            {/* LeetCode Card */}
            <div className="cp-card">
              <div className="cp-card-head lc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <b>LeetCode</b>
                  <span className="sm">Public profile lookup</span>
                </div>
                <span className={`badge-pill ${leetcode ? 'connected' : ''}`}>
                  {leetcode ? 'Linked' : 'Not linked'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', margin: '8px 0' }}>
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
              <div className="cp-card-stat-box">
                <div><span>Total solved</span><b id="page-lc-solved" className="num">{lcStats?.solved ?? '—'}</b></div>
                <div><span>Easy / Med / Hard</span><b id="page-lc-breakdown" className="num">{lcStats ? `${lcStats.easy || 0} / ${lcStats.medium || 0} / ${lcStats.hard || 0}` : '—'}</b></div>
                <div><span>Ranking</span><b id="page-lc-rank" className="num">{lcStats?.ranking ? `#${lcStats.ranking}` : '—'}</b></div>
              </div>
              <p className="sm" id="page-lc-status" aria-live="polite">
                {lcStats ? `✓ Verified public account (${lcStats.username})` : (leetcode ? 'Handle entered — click Sync All to fetch' : 'Not connected')}
              </p>
            </div>

            {/* Codeforces Card */}
            <div className="cp-card">
              <div className="cp-card-head cf" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <b>Codeforces</b>
                  <span className="sm">Official public API</span>
                </div>
                <span className={`badge-pill ${codeforces ? 'connected' : ''}`}>
                  {codeforces ? 'Linked' : 'Not linked'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', margin: '8px 0' }}>
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
              <div className="cp-card-stat-box">
                <div><span>Rating</span><b id="page-cf-rating" className="num">{cfStats?.rating ? cfStats.rating : '—'}</b></div>
                <div><span>Rank</span><b id="page-cf-rank">{cfStats?.rank || '—'}</b></div>
                <div><span>Max Rating</span><b id="page-cf-max" className="num">{cfStats?.maxRating || '—'}</b></div>
              </div>
              <p className="sm" id="page-cf-status" aria-live="polite">
                {cfStats ? `✓ Verified rating ${cfStats.rating} (${cfStats.handle})` : (codeforces ? 'Handle entered — click Sync All to fetch' : 'Not connected')}
              </p>
            </div>

            {/* CodeChef Card */}
            <div className="cp-card">
              <div className="cp-card-head cc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <b>CodeChef</b>
                  <span className="sm">Community stats service</span>
                </div>
                <span className={`badge-pill ${codechef ? 'connected' : ''}`}>
                  {codechef ? 'Linked' : 'Not linked'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', margin: '8px 0' }}>
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
              <div className="cp-card-stat-box">
                <div><span>Rating</span><b id="page-cc-rating" className="num">{ccStats?.currentRating || ccStats?.rating || '—'}</b></div>
                <div><span>Stars</span><b id="page-cc-stars">{ccStats?.stars || '—'}</b></div>
                <div><span>Global rank</span><b id="page-cc-rank" className="num">{ccStats?.globalRank ? `#${ccStats.globalRank}` : '—'}</b></div>
              </div>
              <p className="sm" id="page-cc-status" aria-live="polite">
                {ccStats ? `✓ Verified stats (${ccStats.handle || codechef})` : (codechef ? 'Handle entered — click Sync All to fetch' : 'Not connected')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <p className="sm" id="page-profile-sync-status" aria-live="polite">
              {user?.lastSyncedAt ? `Last synchronized on ${new Date(user.lastSyncedAt).toLocaleString()}` : 'Click Sync All Platforms to fetch lifetime accepted submissions.'}
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSyncAll}
              disabled={syncing}
            >
              {syncing ? '↻ Syncing handles...' : '↻ Sync All Platforms Now'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
