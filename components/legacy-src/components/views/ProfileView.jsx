'use client';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../features/auth/useAuth.js';
import {
  hasRequiredStudentProfile,
  STUDENT_PROFILE_BRANCHES,
  STUDENT_PROFILE_SECTIONS,
  STUDENT_PROFILE_YEARS
} from '../../features/profile/studentProfileOptions.js';
import ContributionHeatmap from '../../../profile/ContributionHeatmap.jsx';
import {
  User,
  GraduationCap,
  Flame,
  Trophy,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  Sparkles,
  Edit3,
  Layers,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

const STREAK_REWARD_MILESTONES = [30, 50, 75, 100];

function formatAcademicYear(yr) {
  if (!yr) return 'Year not set';
  const str = String(yr).trim();
  if (/year$/i.test(str)) return str;
  if (/^year\s+/i.test(str)) {
    const val = str.replace(/^year\s+/i, '');
    return `${val} Year`;
  }
  return `${str} Year`;
}

/**
 * ProfileView — Phase 4: Profile and Streak UI Refinement
 * Professional competitive programming profile workspace.
 * Clean typographic hierarchy, single-surface modules, 1280px container, and seamless streak integration.
 */
export default function ProfileView({ active = false, user: initialUser = null }) {
  const { setUser: updateAuthUser, logout } = useAuth();
  const [user, setUser] = useState(initialUser);
  const [editingProfile, setEditingProfile] = useState(() => !hasRequiredStudentProfile(initialUser));
  const [profileSaved, setProfileSaved] = useState(() => hasRequiredStudentProfile(initialUser));
  const hydratedUserId = useRef(initialUser?.id || null);
  const profileWasComplete = useRef(hasRequiredStudentProfile(initialUser));
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [branch, setBranch] = useState('');
  const [section, setSection] = useState('');

  const [leetcode, setLeetcode] = useState('');
  const [codeforces, setCodeforces] = useState('');
  const [codechef, setCodechef] = useState('');

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const handleSaveQueue = useRef(Promise.resolve());
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [statsPlatform, setStatsPlatform] = useState('all');
  const [streakRewardClaims, setStreakRewardClaims] = useState([]);
  const [claimingMilestone, setClaimingMilestone] = useState(null);
  const [claimCelebration, setClaimCelebration] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setStreakRewardClaims([]);
      return undefined;
    }
    let active = true;
    api('/api/streak-rewards/mine')
      .then(result => {
        if (active) setStreakRewardClaims(result.claims || []);
      })
      .catch(err => {
        if (active) setError(err.message || 'Could not load your reward claims.');
      });
    return () => { active = false; };
  }, [user?.id]);

  const handleClaimStreakReward = async milestone => {
    setClaimingMilestone(milestone);
    setError('');
    try {
      const result = await api('/api/streak-rewards/claim', {
        method: 'POST',
        body: JSON.stringify({ milestone })
      });
      setStreakRewardClaims(current => [
        ...current,
        { milestone: result.claim.milestone, claimedAt: result.claim.claimedAt }
      ]);
      setClaimCelebration(milestone);
    } catch (err) {
      setError(err.message || 'Could not claim this streak reward.');
    } finally {
      setClaimingMilestone(null);
    }
  };

  // Hydrate user state without fabricating fake defaults
  useEffect(() => {
    const applyUser = (u) => {
      if (!u) return;
      const isNewUser = hydratedUserId.current !== u.id;
      const isComplete = hasRequiredStudentProfile(u);
      const completedDuringSetup = !profileWasComplete.current && isComplete;
      const shouldHydrateFields = isNewUser || !editingProfile || completedDuringSetup;
      hydratedUserId.current = u.id;
      profileWasComplete.current = isComplete;
      setUser(u);
      if (isNewUser || completedDuringSetup) setEditingProfile(!isComplete);
      setProfileSaved(isComplete);
      if (!shouldHydrateFields) return;
      setName(u.name || '');
      setAcademicYear(u.academicYear || '');
      setBranch(u.branch || '');
      setSection(u.section || '');
      setLeetcode(u.handles?.leetcode || '');
      setCodeforces(u.handles?.codeforces || '');
      setCodechef(u.handles?.codechef || '');
    };

    if (initialUser) {
      applyUser(initialUser);
    } else setUser(null);
  }, [initialUser, editingProfile]);

  const handleSaveProfile = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!user?.id) {
      setError('Please sign in to update your profile.');
      return;
    }
    if (!name.trim() || !academicYear || !branch || !section) {
      setError('Please complete your name, year, branch, and section.');
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
          academicYear,
          branch,
          section
        })
      });
      setUser(updated);
      setProfileSaved(hasRequiredStudentProfile(updated));
      setEditingProfile(false);
      window.dispatchEvent(new CustomEvent('topx:profile-updated', { detail: { user: updated } }));
      setMessage('Profile details updated and saved successfully.');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save profile details.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHandles = async (nextHandles = {
    leetcode: leetcode.trim(),
    codeforces: codeforces.trim(),
    codechef: codechef.trim()
  }) => {
    if (!user?.id) throw new Error('Please sign in to save coding handles.');
    try {
      const saveRequest = handleSaveQueue.current.catch(() => {}).then(() =>
        api(`/api/user/handles/${encodeURIComponent(user.id)}`, {
          method: 'PUT',
          body: JSON.stringify(nextHandles)
        })
      );
      handleSaveQueue.current = saveRequest;
      const { user: updated } = await saveRequest;
      setUser(updated);
      updateAuthUser(updated);
      window.dispatchEvent(new CustomEvent('topx:profile-updated', { detail: { user: updated } }));
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
      updateAuthUser(res.user);
      window.dispatchEvent(new CustomEvent('topx:profile-updated', { detail: { user: res.user } }));
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
      updateAuthUser(updated);
      window.dispatchEvent(new CustomEvent('topx:profile-updated', { detail: { user: updated } }));
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

  const platformSolved = {
    leetcode: Number(lcStats?.solved) || 0,
    codeforces: Number(cfStats?.acceptedProblemsLifetime ?? cfStats?.acceptedProblemsLast10000) || 0,
    codechef: Number(ccStats?.solved) || 0
  };
  const combinedPlatformSolved = platformSolved.leetcode + platformSolved.codeforces + platformSolved.codechef;
  const codeforcesSolvedKnown = !user?.handles?.codeforces || cfStats?.solvedCountComplete === true;
  const displayedCombinedPlatformSolved = codeforcesSolvedKnown ? combinedPlatformSolved : '—';
  const selectedPlatformSolved = statsPlatform === 'all'
    ? displayedCombinedPlatformSolved
    : (statsPlatform === 'codeforces' && !codeforcesSolvedKnown ? '—' : platformSolved[statsPlatform]);
  const selectedPlatformStats = statsPlatform === 'all' ? null : stats[statsPlatform];
  const currentStreak = Number(user?.currentStreak) || 0;
  const longestStreak = Number(user?.longestStreak) || 0;
  const totalActiveDays = Number(user?.totalActiveDays) || 0;
  const hasConnectedHandle = Boolean(user?.handles?.leetcode || user?.handles?.codeforces || user?.handles?.codechef);

  const scrollToHandles = () => {
    document.getElementById('connected-coding-platforms')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section className={`tab-view ${active ? 'active' : ''}`} id="view-profile">
      <div className="profile-page-container">
        {/* ====================================================================
           1. COMPACT PROFILE HEADER
           ==================================================================== */}
        <div className="profile-header-card reveal-up" data-reveal="fade-up">
          <div className="profile-identity-group">
            <div className="profile-avatar-circle" id="page-profile-avatar">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'Member'}
                  referrerPolicy="no-referrer"
                />
              ) : (
                (user?.name || 'M').slice(0, 1).toUpperCase()
              )}
            </div>

            <div className="profile-identity-text">
              <div className="profile-name-row">
                <h1 className="profile-member-name" id="page-profile-name">
                  {user?.name || 'Student Member'}
                </h1>
                {user?.isPro && (
                  <span className="profile-pro-badge badge-flip">
                    <Sparkles size={11} aria-hidden="true" />
                    Top-X Pro
                  </span>
                )}
              </div>
              <p className="profile-member-email" id="page-profile-email">
                {user?.email || 'Signed-in member'}
              </p>

              {/* Academic Cohort Metadata Chips */}
              <div className="profile-cohort-row">
                <span className="profile-cohort-tag interactive-transition">
                  <GraduationCap size={12} aria-hidden="true" />
                  {user?.branch || 'Branch not set'}
                </span>
                <span className="profile-cohort-tag interactive-transition">
                  {user?.academicYear ? formatAcademicYear(user.academicYear) : 'Year not set'}
                </span>
                <span className="profile-cohort-tag interactive-transition">
                  {user?.section ? `Sec ${user.section}` : 'Section not set'}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-header-actions">
            <button
              className="btn-prof-sync hover-lift interactive-transition"
              type="button"
              id="page-profile-sync"
              onClick={handleSyncAll}
              disabled={syncing || !user?.id}
              aria-label="Synchronize coding platform statistics"
            >
              <RefreshCw size={13} className={syncing ? 'spin-icon' : ''} aria-hidden="true" />
              <span>{syncing ? 'Synchronizing…' : 'Sync Platforms'}</span>
            </button>
            <button
              className="btn-prof-logout hover-lift interactive-transition"
              id="page-profile-logout"
              type="button"
              onClick={logout}
              aria-label="Sign out from Top-X"
            >
              <LogOut size={13} aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* Nudge banner if no handles are linked */}
        {!hasConnectedHandle && (
          <div className="profile-handle-nudge">
            <div>
              <strong>Next: connect your coding profile</strong>
              <p>Add a Codeforces, CodeChef, or LeetCode handle below to see your coding stats here.</p>
            </div>
            <button type="button" onClick={scrollToHandles} aria-label="Scroll down to coding profile handles">
              Scroll down <span aria-hidden="true">↓</span>
            </button>
          </div>
        )}

        {/* Feedback Alert Banners */}
        {message && (
          <div className="profile-feedback-banner success" role="status">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="profile-feedback-banner error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* ====================================================================
           2. UNIFIED CODING STATISTICS
           ==================================================================== */}
        <section className="profile-section-module reveal-up" data-reveal="fade-up">
          <div className="profile-section-head">
            <div>
              <h2 className="profile-section-title">Unified Coding Stats</h2>
              <p className="profile-section-sub">Verified solve totals and ratings across connected platforms.</p>
            </div>
            <div role="group" aria-label="Stats platform" className="profile-filter-pills">
              {[['all', 'All platforms'], ['leetcode', 'LeetCode'], ['codeforces', 'Codeforces'], ['codechef', 'CodeChef']].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatsPlatform(key)}
                  aria-pressed={statsPlatform === key}
                  className={`pill-filter-btn interactive-transition ${statsPlatform === key ? 'active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="profile-stats-surface">
            <div className="profile-stats-grid-row">
              {/* Primary Solved Box */}
              <div className="profile-stat-box primary-total hover-lift interactive-transition">
                <span className="profile-stat-box-label">
                  {statsPlatform === 'all' ? 'Combined platform solves' : `${statsPlatform === 'leetcode' ? 'LeetCode' : statsPlatform === 'codeforces' ? 'Codeforces' : 'CodeChef'} solved`}
                </span>
                <span className="profile-stat-box-val">
                  {selectedPlatformSolved || 0}
                </span>
                <span className="profile-stat-box-meta">
                  {statsPlatform === 'all' ? 'Sum of verified platform counts; overlap may exist.' : 'Reported directly by platform provider.'}
                </span>
              </div>

              {statsPlatform === 'all' ? (
                <>
                  <div className="profile-stat-box hover-lift interactive-transition">
                    <span className="profile-stat-box-label">LeetCode</span>
                    <span className="profile-stat-box-val">{platformSolved.leetcode}</span>
                    <span className="profile-stat-box-meta">
                      Rank {lcStats?.ranking ? `#${lcStats.ranking}` : '—'}
                    </span>
                  </div>

                  <div className="profile-stat-box hover-lift interactive-transition">
                    <span className="profile-stat-box-label">Codeforces</span>
                    <span className="profile-stat-box-val">
                      {codeforcesSolvedKnown ? platformSolved.codeforces : '—'}
                    </span>
                    <span className="profile-stat-box-meta">
                      Rating {cfStats?.rating || '—'} · {cfStats?.rank || 'Unrated'} · {cfStats?.submissionCountComplete === true ? `${Number(cfStats.totalSubmissionsLifetime) || 0} submissions` : 'submissions —'}
                    </span>
                  </div>

                  <div className="profile-stat-box hover-lift interactive-transition">
                    <span className="profile-stat-box-label">CodeChef</span>
                    <span className="profile-stat-box-val">{platformSolved.codechef}</span>
                    <span className="profile-stat-box-meta">
                      Rating {ccStats?.currentRating || ccStats?.rating || '—'} · {ccStats?.stars || 'Unrated'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="profile-stat-box hover-lift interactive-transition" style={{ gridColumn: 'span 3' }}>
                  <span className="profile-stat-box-label">Rating / Rank Classification</span>
                  <span className="profile-stat-box-val">
                    {statsPlatform === 'leetcode'
                      ? (selectedPlatformStats?.ranking ? `#${selectedPlatformStats.ranking}` : '—')
                      : statsPlatform === 'codeforces'
                      ? (selectedPlatformStats?.rating || '—')
                      : (selectedPlatformStats?.currentRating || selectedPlatformStats?.rating || '—')}
                  </span>
                  <span className="profile-stat-box-meta">
                    {statsPlatform === 'leetcode'
                      ? 'Global LeetCode standing'
                      : statsPlatform === 'codeforces'
                      ? `${selectedPlatformStats?.rank || 'Unrated'} · max rating ${selectedPlatformStats?.maxRating || 0}`
                      : `${selectedPlatformStats?.stars || 'Unrated'} · global rank ${selectedPlatformStats?.globalRank ? `#${selectedPlatformStats.globalRank}` : '—'}`}
                  </span>
                </div>
              )}
            </div>

            {statsPlatform === 'all' && (
              <p className="profile-stat-footnote">
                Note: Codeforces solved count reflects unique accepted problems in the provider history fetched by TOP-X (up to the latest 10,000 submissions), not a guaranteed lifetime total.
              </p>
            )}
          </div>
        </section>

        {/* ====================================================================
           3. STREAK AND PRACTICE CONSISTENCY (METRICS + HEATMAP)
           ==================================================================== */}
        <section className="profile-section-module reveal-up" data-reveal="fade-up">
          <div className="profile-section-head">
            <div>
              <h2 className="profile-section-title">Streak &amp; Practice Consistency</h2>
              <p className="profile-section-sub">
                Calculated strictly from verified accepted submissions across connected platforms, not login or website visits.
              </p>
            </div>
          </div>

          <div className="profile-streak-surface">
            {/* 4-Metric Consistency Strip */}
            <div className="profile-streak-metrics-strip">
              <div className="profile-streak-metric-item hover-lift interactive-transition">
                <span className="profile-streak-label">Current Streak</span>
                <div className="profile-streak-num-row">
                  <Flame size={20} aria-hidden="true" style={{ color: 'var(--prof-ac)' }} fill="currentColor" />
                  <span>{currentStreak}</span>
                  <span className="profile-streak-unit">Days</span>
                </div>
              </div>

              <div className="profile-streak-metric-item hover-lift interactive-transition">
                <span className="profile-streak-label">Longest Streak</span>
                <div className="profile-streak-num-row">
                  <Trophy size={19} aria-hidden="true" style={{ color: '#EAB308' }} />
                  <span>{longestStreak}</span>
                  <span className="profile-streak-unit">Days</span>
                </div>
              </div>

              <div className="profile-streak-metric-item hover-lift interactive-transition">
                <span className="profile-streak-label">Verified Active Days</span>
                <div className="profile-streak-num-row">
                  <Calendar size={19} aria-hidden="true" style={{ color: '#0284C7' }} />
                  <span>{totalActiveDays}</span>
                  <span className="profile-streak-unit">Days</span>
                </div>
              </div>

              <div className="profile-streak-metric-item hover-lift interactive-transition">
                <span className="profile-streak-label">Combined Platform Solves</span>
                <div className="profile-streak-num-row">
                  <Sparkles size={19} aria-hidden="true" style={{ color: 'var(--prof-ink)' }} />
                  <span>{displayedCombinedPlatformSolved}</span>
                  <span className="profile-streak-unit">Solved</span>
                </div>
              </div>
            </div>

            <div className="streak-rewards">
              <div className="streak-rewards-heading">
                <div>
                  <span className="profile-streak-label">CONSISTENCY MILESTONES</span>
                  <h3>Keep your streak going</h3>
                  <p>Reach a milestone and claim your reward. Your progress is based on verified activity.</p>
                </div>
                <Trophy size={23} aria-hidden="true" />
              </div>
              <div className="streak-reward-grid">
                {STREAK_REWARD_MILESTONES.map(milestone => {
                  const claimed = streakRewardClaims.some(claim => Number(claim.milestone) === milestone);
                  const achieved = currentStreak >= milestone;
                  const progress = Math.min(100, Math.round((currentStreak / milestone) * 100));
                  const daysToGo = Math.max(0, milestone - currentStreak);
                  return (
                    <article className={`streak-reward-card ${achieved ? 'is-achieved' : ''} ${claimed ? 'is-claimed' : ''}`} key={milestone}>
                      <div className="streak-reward-card-top">
                        <span className="streak-reward-icon"><Trophy size={17} aria-hidden="true" /></span>
                        <span className="streak-reward-days">{milestone} <small>DAY STREAK</small></span>
                      </div>
                      <div className="streak-reward-progress" role="progressbar" aria-label={`${milestone}-day streak progress`} aria-valuemin={0} aria-valuemax={milestone} aria-valuenow={Math.min(currentStreak, milestone)}>
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <p className="streak-reward-status">
                        {claimed ? 'Reward claimed' : achieved ? 'Milestone reached!' : `${daysToGo} ${daysToGo === 1 ? 'day' : 'days'} to go`}
                      </p>
                      {achieved && !claimed ? (
                        <button
                          className="streak-reward-claim"
                          type="button"
                          onClick={() => handleClaimStreakReward(milestone)}
                          disabled={claimingMilestone !== null}
                        >
                          {claimingMilestone === milestone ? 'Claiming…' : 'Claim reward'}
                        </button>
                      ) : claimed ? (
                        <span className="streak-reward-claimed"><CheckCircle2 size={15} /> Claimed</span>
                      ) : (
                        <span className="streak-reward-up-next">Keep it up</span>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Integrated Submission Activity Heatmap */}
            <div className="profile-heatmap-container reveal-up">
              <ContributionHeatmap dailyActivity={user?.dailyActivity || {}} />
            </div>
          </div>
          {claimCelebration ? (
            <div className="streak-reward-modal-backdrop" role="presentation" onClick={() => setClaimCelebration(null)}>
              <section
                className="streak-reward-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="streak-reward-modal-title"
                onClick={event => event.stopPropagation()}
              >
                <div className="streak-reward-confetti" aria-hidden="true">
                  {Array.from({ length: 18 }, (_, index) => <span key={index} style={{ '--confetti-index': index }} />)}
                </div>
                <span className="streak-reward-celebration-icon"><Trophy size={31} aria-hidden="true" /></span>
                <span className="profile-streak-label">MILESTONE CLAIMED</span>
                <h2 id="streak-reward-modal-title">{claimCelebration}-day streak unlocked!</h2>
                <p>Your name is recorded. You will receive your reward soon.</p>
                <button type="button" className="streak-reward-claim" onClick={() => setClaimCelebration(null)}>Awesome!</button>
              </section>
            </div>
          ) : null}
        </section>

        {/* ====================================================================
           4. STUDENT INFORMATION
           ==================================================================== */}
        <section className="profile-section-module reveal-up" data-reveal="fade-up">
          <div className="profile-section-head">
            <div>
              <h2 className="profile-section-title">Student Information</h2>
              <p className="profile-section-sub">
                Your academic branch, year, and section determine your cohort standings on the campus leaderboard.
              </p>
            </div>
          </div>

          <div className="profile-form-surface">
            <form id="page-profile-form" onSubmit={handleSaveProfile}>
              <div className="profile-inputs-grid">
                <div className="profile-input-field">
                  <label htmlFor="page-profile-name-input">Full Name</label>
                  <input
                    id="page-profile-name-input"
                    maxLength="80"
                    required
                    disabled={!editingProfile}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </div>

                <div className="profile-input-field">
                  <label htmlFor="page-profile-year-input">Academic Year</label>
                  <select
                    id="page-profile-year-input"
                    required
                    disabled={!editingProfile}
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  >
                    <option value="">Not set</option>
                    {STUDENT_PROFILE_YEARS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="profile-input-field">
                  <label htmlFor="page-profile-branch-input">Branch / Degree</label>
                  <select
                    id="page-profile-branch-input"
                    required
                    disabled={!editingProfile}
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  >
                    <option value="">Not set</option>
                    {STUDENT_PROFILE_BRANCHES.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="profile-input-field">
                  <label htmlFor="page-profile-section-input">Section / Class</label>
                  <select
                    id="page-profile-section-input"
                    required
                    disabled={!editingProfile}
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  >
                    <option value="">Not set</option>
                    {STUDENT_PROFILE_SECTIONS.map((value) => (
                      <option key={value} value={value}>Section {value}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="profile-form-actions">
                <button
                  className="btn-profile-save-action hover-lift interactive-transition"
                  type="button"
                  id="page-profile-save"
                  disabled={saving}
                  onClick={() => {
                    if (editingProfile) {
                      handleSaveProfile();
                    } else {
                      setEditingProfile(true);
                      setMessage('');
                      setError('');
                    }
                  }}
                >
                  {saving ? 'Saving changes...' : (editingProfile ? (profileSaved ? 'Update Profile' : 'Save Profile') : 'Edit Profile')}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ====================================================================
           5. CONNECTED CODING PLATFORMS
           ==================================================================== */}
        <section className="profile-section-module reveal-up" id="connected-coding-platforms" data-reveal="fade-up">
          <div className="profile-section-head">
            <div>
              <h2 className="profile-section-title">Connected Coding Platforms</h2>
              <p className="profile-section-sub">
                Enter your public handles. Handles auto-save when leaving the input field; Sync updates verified submission counts.
              </p>
            </div>
          </div>

          <div className="profile-platforms-surface">
            <div className="profile-platforms-grid">
              {/* LeetCode Card */}
              <div className="platform-card-item hover-lift interactive-transition">
                <div className="platform-card-header">
                  <span className="platform-card-title">LeetCode</span>
                  <span className={`platform-card-status-pill badge-flip ${leetcode ? 'is-connected' : ''}`}>
                    {leetcode ? 'Linked' : 'Not linked'}
                  </span>
                </div>

                <div className="platform-handle-input-box">
                  {user?.handles?.leetcode ? (
                    <div className="platform-handle-display" title={leetcode}>
                      {leetcode}
                    </div>
                  ) : (
                    <input
                      id="page-handle-leetcode"
                      value={leetcode}
                      onChange={(e) => setLeetcode(e.target.value)}
                      onBlur={(e) => handleSaveHandles({
                        leetcode: e.currentTarget.value.trim(),
                        codeforces: codeforces.trim(),
                        codechef: codechef.trim()
                      }).catch(() => {})}
                      placeholder="LeetCode username"
                      autoComplete="off"
                    />
                  )}
                  {leetcode && (
                    <button
                      type="button"
                      onClick={() => handleDisconnect('leetcode')}
                      className="btn-platform-disconnect"
                      title="Disconnect LeetCode"
                      aria-label="Disconnect LeetCode"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="platform-stat-digest">
                  <div className="platform-stat-row">
                    <span>Total solved</span>
                    <b id="page-lc-solved">{lcStats?.solved ?? '—'}</b>
                  </div>
                  <div className="platform-stat-row">
                    <span>Easy / Med / Hard</span>
                    <b id="page-lc-breakdown">{lcStats ? `${lcStats.easy || 0} / ${lcStats.medium || 0} / ${lcStats.hard || 0}` : '—'}</b>
                  </div>
                  <div className="platform-stat-row">
                    <span>Global Ranking</span>
                    <b id="page-lc-rank">{lcStats?.ranking ? `#${lcStats.ranking}` : '—'}</b>
                  </div>
                </div>

                {leetcode && (
                  <a
                    href={`https://leetcode.com/u/${encodeURIComponent(leetcode)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="platform-profile-link hover-lift interactive-transition"
                  >
                    <span>View LeetCode Profile</span>
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                )}
              </div>

              {/* Codeforces Card */}
              <div className="platform-card-item hover-lift interactive-transition">
                <div className="platform-card-header">
                  <span className="platform-card-title">Codeforces</span>
                  <span className={`platform-card-status-pill badge-flip ${codeforces ? 'is-connected' : ''}`}>
                    {codeforces ? 'Linked' : 'Not linked'}
                  </span>
                </div>

                <div className="platform-handle-input-box">
                  {user?.handles?.codeforces ? (
                    <div className="platform-handle-display" title={codeforces}>
                      {codeforces}
                    </div>
                  ) : (
                    <input
                      id="page-handle-codeforces"
                      value={codeforces}
                      onChange={(e) => setCodeforces(e.target.value)}
                      onBlur={(e) => handleSaveHandles({
                        leetcode: leetcode.trim(),
                        codeforces: e.currentTarget.value.trim(),
                        codechef: codechef.trim()
                      }).catch(() => {})}
                      placeholder="Codeforces handle"
                      autoComplete="off"
                    />
                  )}
                  {codeforces && (
                    <button
                      type="button"
                      onClick={() => handleDisconnect('codeforces')}
                      className="btn-platform-disconnect hover-lift interactive-transition"
                      title="Disconnect Codeforces"
                      aria-label="Disconnect Codeforces"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="platform-stat-digest">
                  <div className="platform-stat-row">
                    <span>Rating</span>
                    <b id="page-cf-rating">{cfStats?.rating ? cfStats.rating : '—'}</b>
                  </div>
                  <div className="platform-stat-row">
                    <span>Rank Title</span>
                    <b id="page-cf-rank">{cfStats?.rank || '—'}</b>
                  </div>
                  <div className="platform-stat-row">
                    <span>Max Rating</span>
                    <b id="page-cf-max">{cfStats?.maxRating || '—'}</b>
                  </div>
                </div>

                {codeforces && (
                  <a
                    href={`https://codeforces.com/profile/${encodeURIComponent(codeforces)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="platform-profile-link hover-lift interactive-transition"
                  >
                    <span>View Codeforces Profile</span>
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                )}
              </div>

              {/* CodeChef Card */}
              <div className="platform-card-item hover-lift interactive-transition">
                <div className="platform-card-header">
                  <span className="platform-card-title">CodeChef</span>
                  <span className={`platform-card-status-pill badge-flip ${codechef ? 'is-connected' : ''}`}>
                    {codechef ? 'Linked' : 'Not linked'}
                  </span>
                </div>

                <div className="platform-handle-input-box">
                  {user?.handles?.codechef ? (
                    <div className="platform-handle-display" title={codechef}>
                      {codechef}
                    </div>
                  ) : (
                    <input
                      id="page-handle-codechef"
                      value={codechef}
                      onChange={(e) => setCodechef(e.target.value)}
                      onBlur={(e) => handleSaveHandles({
                        leetcode: leetcode.trim(),
                        codeforces: codeforces.trim(),
                        codechef: e.currentTarget.value.trim()
                      }).catch(() => {})}
                      placeholder="CodeChef username"
                      autoComplete="off"
                    />
                  )}
                  {codechef && (
                    <button
                      type="button"
                      onClick={() => handleDisconnect('codechef')}
                      className="btn-platform-disconnect hover-lift interactive-transition"
                      title="Disconnect CodeChef"
                      aria-label="Disconnect CodeChef"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="platform-stat-digest">
                  <div className="platform-stat-row">
                    <span>Rating</span>
                    <b id="page-cc-rating">{ccStats?.currentRating || ccStats?.rating || '—'}</b>
                  </div>
                  <div className="platform-stat-row">
                    <span>Stars</span>
                    <b id="page-cc-stars">{ccStats?.stars || '—'}</b>
                  </div>
                  <div className="platform-stat-row">
                    <span>Global Rank</span>
                    <b id="page-cc-rank">{ccStats?.globalRank ? `#${ccStats.globalRank}` : '—'}</b>
                  </div>
                </div>

                {codechef && (
                  <a
                    href={`https://www.codechef.com/users/${encodeURIComponent(codechef)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="platform-profile-link hover-lift interactive-transition"
                  >
                    <span>View CodeChef Profile</span>
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>

            {/* Sync Action Footer */}
            <div className="profile-sync-footer">
              <p className="profile-sync-footnote" id="page-profile-sync-status" aria-live="polite">
                {user?.lastSyncedAt
                  ? `Last synchronized on ${new Date(user.lastSyncedAt).toLocaleString()}`
                  : 'Connect your handles and click Sync to pull verified accepted submissions.'}
              </p>
              <button
                type="button"
                className="btn-prof-sync"
                onClick={handleSyncAll}
                disabled={syncing || !user?.id}
                style={{ padding: '10px 22px' }}
              >
                <RefreshCw size={14} className={syncing ? 'spin-icon' : ''} aria-hidden="true" />
                <span>{syncing ? 'Synchronizing Handles…' : 'Sync All Platforms Now'}</span>
              </button>
            </div>

            {/* Account Integrity & Anti-Cheating Warning Alert */}
            <div className="profile-security-alert" role="alert">
              <AlertTriangle size={18} className="profile-security-alert-icon" aria-hidden="true" />
              <div className="profile-security-alert-content">
                <span className="profile-security-alert-title">Strict Account Authenticity Notice:</span>
                <p className="profile-security-alert-text">
                  Please use and sync only your own personal, verified coding accounts. Connecting another student&apos;s handle, sharing accounts, or falsifying submissions is strictly tracked and prohibited. Any unauthorized activity or fraudulent handle association will result in immediate suspension and permanent blacklisting from Top-X, verified certifications, and campus leaderboards.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
