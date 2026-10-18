'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api.js';
import AnimatedCodeEditor from '../../../home/AnimatedCodeEditor.jsx';
import ContributionHeatmap from '../../../profile/ContributionHeatmap.jsx';
import {
  Flame,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  Code2,
  Zap,
  Clock
} from 'lucide-react';

/**
 * DashboardView — Professional UI Refinement
 * Editorial-style competitive programming workspace.
 * Clean typography, intentional spacing scale, no card-in-card nesting, and no micro-label clutter.
 */
export default function DashboardView({ active = false, user = null }) {
  const router = useRouter();

  // Navigation helper compatible with Next.js App Router and AppShell tabs
  const navigateTo = useCallback((path) => {
    if (typeof window !== 'undefined') {
      const tabName = path.replace(/^\//, '').replace(/^#/, '');
      window.dispatchEvent(new CustomEvent('topx:navigate', { detail: { tab: tabName } }));
    }
    router.push(path);
  }, [router]);

  // Platform metric selector (satisfies tests/stats-heatmap.test.js)
  const [statsPlatform, setStatsPlatform] = useState('all');

  // Daily Tasks state
  const [tasks, setTasks] = useState([]);
  const [taskStreak, setTaskStreak] = useState(0);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksVerifying, setTasksVerifying] = useState(false);
  const [taskNotice, setTaskNotice] = useState('');

  // Campus Leaderboard state
  const [leaderboardMembers, setLeaderboardMembers] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Load Daily Tasks for current user
  const loadTasks = useCallback(async (verify = false) => {
    if (!user?.id) {
      setTasks([]);
      return;
    }
    if (verify) {
      setTasksVerifying(true);
      setTaskNotice('Verifying accepted submissions on connected platforms…');
    } else {
      setTasksLoading(true);
    }

    try {
      if (verify) {
        const verifyRes = await api(`/api/tasks/verify-all/${encodeURIComponent(user.id)}`, { method: 'POST' });
        if (Array.isArray(verifyRes?.tasks)) {
          setTasks(verifyRes.tasks);
        }
        if (verifyRes?.streak?.current != null) {
          setTaskStreak(verifyRes.streak.current);
        }
      } else {
        const data = await api(`/api/tasks/daily/${encodeURIComponent(user.id)}`);
        if (Array.isArray(data?.tasks)) {
          setTasks(data.tasks);
        }
        if (data?.streak?.current != null) {
          setTaskStreak(data.streak.current);
        }
      }
      if (verify) {
        setTaskNotice('Verification complete. Only accepted solutions count.');
        window.setTimeout(() => setTaskNotice(''), 3500);
      }
    } catch (err) {
      if (verify) setTaskNotice(err.message || 'Could not verify tasks.');
    } finally {
      setTasksLoading(false);
      setTasksVerifying(false);
    }
  }, [user?.id]);

  // Load Campus Leaderboard
  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const data = await api('/api/leaderboard?metric=streak');
      if (Array.isArray(data?.members)) {
        setLeaderboardMembers(data.members);
      }
    } catch (_) {
      // Keep empty array on error
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  // Activity / Contests state
  const [activityTab, setActivityTab] = useState('submissions');
  const [upcomingContests, setUpcomingContests] = useState([]);
  const [contestsLoading, setContestsLoading] = useState(false);

  // Load Upcoming Contests
  const loadContests = useCallback(async () => {
    setContestsLoading(true);
    try {
      const data = await api('/api/contests/upcoming');
      if (Array.isArray(data?.contests)) {
        setUpcomingContests(data.contests);
      }
    } catch (_) {
      // Keep empty array on error
    } finally {
      setContestsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) {
      loadTasks(false);
      loadLeaderboard();
      loadContests();
    }
  }, [active, loadTasks, loadLeaderboard, loadContests]);

  // Solved problems calculation per platform (satisfies tests/stats-heatmap.test.js)
  const platformStats = user?.syncedStats || {};
  const solvedByPlatform = useMemo(() => ({
    leetcode: Number(platformStats.leetcode?.solved) || 0,
    codeforces: Number(platformStats.codeforces?.acceptedProblemsLifetime ?? platformStats.codeforces?.acceptedProblemsLast10000) || 0,
    codechef: Number(platformStats.codechef?.solved) || 0
  }), [platformStats]);

  const codeforcesSolvedKnown = !user?.handles?.codeforces || platformStats.codeforces?.solvedCountComplete === true;

  const shownSolved = statsPlatform === 'all'
    ? (codeforcesSolvedKnown ? solvedByPlatform.leetcode + solvedByPlatform.codeforces + solvedByPlatform.codechef : '—')
    : (statsPlatform === 'codeforces' && !codeforcesSolvedKnown ? '—' : solvedByPlatform[statsPlatform]);

  const ratingSummary = statsPlatform === 'all'
    ? `LC rank ${platformStats.leetcode?.ranking ? `#${platformStats.leetcode.ranking}` : '—'} · CF ${platformStats.codeforces?.rating || '—'} · CC ${platformStats.codechef?.currentRating || platformStats.codechef?.rating || '—'}`
    : statsPlatform === 'leetcode'
      ? `Global rank ${platformStats.leetcode?.ranking ? `#${platformStats.leetcode.ranking}` : '—'}`
      : statsPlatform === 'codeforces'
        ? `${platformStats.codeforces?.rank || 'Unrated'} · max ${platformStats.codeforces?.maxRating || 0}`
        : `${platformStats.codechef?.stars || 'Unrated'} · global rank ${platformStats.codechef?.globalRank || '—'}`;

  // Current Streak & Metric calculations
  const currentStreak = Number(user?.currentStreak || user?.taskCurrentStreak || taskStreak || 0);
  const longestStreak = Number(user?.taskLongestStreak || 0);
  const activeDays = Number(user?.totalActiveDays || 0);
  const totalVerifiedSolves = Number(user?.totalUniqueSolved) > 0
    ? Number(user.totalUniqueSolved)
    : (solvedByPlatform.leetcode + solvedByPlatform.codeforces + solvedByPlatform.codechef);

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Today's formatted date
  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      }).format(new Date());
    } catch (_) {
      return new Date().toLocaleDateString();
    }
  }, []);

  // Tasks completed count & XP
  const completedTasksCount = tasks.filter(t => t.isCompleted || t.completed).length;
  const totalXp = tasks.reduce((sum, t) => sum + (Number(t.points) || 0), 0);
  const earnedXp = tasks.filter(t => t.isCompleted || t.completed).reduce((sum, t) => sum + (Number(t.points) || 0), 0);
  const practiceProgressPct = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  // Student's standing in Leaderboard
  const userRankIndex = useMemo(() => {
    if (!user || !leaderboardMembers.length) return -1;
    return leaderboardMembers.findIndex(m => m.id === user.id || (m.n && m.n.toLowerCase() === String(user.name || '').toLowerCase()));
  }, [user, leaderboardMembers]);

  const userRank = userRankIndex !== -1 ? (leaderboardMembers[userRankIndex]?.rank || userRankIndex + 1) : null;

  // Leaderboard entries without duplicates
  const rankingRows = useMemo(() => {
    if (!leaderboardMembers.length) return { list: [], userExtraRow: null };
    const topCount = 4;
    const topList = leaderboardMembers.slice(0, topCount);
    let extraRow = null;
    if (userRankIndex >= topCount) {
      extraRow = leaderboardMembers[userRankIndex];
    }
    return { list: topList, userExtraRow: extraRow };
  }, [leaderboardMembers, userRankIndex]);

  // Recent submissions from user's synced history
  const recentSubmissions = useMemo(() => {
    if (Array.isArray(user?.activitySubmissions) && user.activitySubmissions.length > 0) {
      return user.activitySubmissions.slice(0, 5);
    }
    return tasks.filter(t => t.isCompleted).map(t => ({
      title: t.title || t.name,
      platform: t.platform || 'Practice',
      verdict: 'Accepted',
      timestamp: t.verification?.verifiedAt || 'Today'
    }));
  }, [user?.activitySubmissions, tasks]);

  return (
    <section className={`tab-view ${active ? 'active' : ''}`} id="view-dashboard" aria-label="TOP-X Dashboard">
      <div className="dash-container">
        {/* ====================================================================
           1. HERO SECTION — Full-screen Editorial + Animated C++ Editor
           ==================================================================== */}
        <section className="home-editorial-hero dash-editorial-hero reveal-up" data-reveal="fade-up">
          <div className="hero-editorial-container">
            {/* Left: Editorial Headline */}
            <div className="hero-editorial-content">
              <div className="hero-eyebrow-tag reveal-up">
                <span className="eyebrow-slash">//</span> STUDENT CODING COMMUNITY
              </div>

              <h1 className="hero-editorial-headline reveal-up">
                Show up. Solve problems.<br />
                <span className="hero-headline-accent">Become unstoppable.</span>
              </h1>

              <p className="hero-editorial-desc reveal-up">
                Top X Club helps students build consistent coding habits, improve their problem-solving skills, challenge themselves, and grow alongside a motivated community of developers.
              </p>

              <div className="hero-cta-group reveal-up">
                <button
                  type="button"
                  className="hero-btn-primary hover-lift interactive-transition"
                  onClick={() => navigateTo('/progress')}
                  id="hero-cta-practice"
                >
                  <span>Start Your Streak</span>
                  <span aria-hidden="true">→</span>
                </button>
                <button
                  type="button"
                  className="hero-btn-secondary hover-lift interactive-transition"
                  onClick={() => navigateTo('/leaderboard')}
                  id="hero-cta-leaderboard"
                >
                  <span>Explore Community</span>
                </button>
              </div>

              <div className="hero-platform-strip reveal-up">
                <span className="strip-label">Tracking accepted problems across:</span>
                <div className="strip-pills">
                  <span className="platform-pill pill-lc badge-flip">
                    <span className="pill-dot" aria-hidden="true" />
                    LeetCode
                  </span>
                  <span className="strip-sep" aria-hidden="true">|</span>
                  <span className="platform-pill pill-cf badge-flip">
                    <span className="pill-dot" aria-hidden="true" />
                    Codeforces
                  </span>
                  <span className="strip-sep" aria-hidden="true">|</span>
                  <span className="platform-pill pill-cc badge-flip">
                    <span className="pill-dot" aria-hidden="true" />
                    CodeChef
                  </span>
                  <span className="strip-sep" aria-hidden="true">|</span>
                  <span className="platform-pill pill-hr badge-flip">
                    <span className="pill-dot" aria-hidden="true" />
                    HackerRank
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Animated C++ Code Editor */}
            <div className="hero-editorial-visual reveal-left">
              <AnimatedCodeEditor />
            </div>
          </div>
        </section>

        {/* ====================================================================
           2. DAILY PRACTICE — MAIN ACTIONABLE SECTION
           ==================================================================== */}
        <section className="dash-module dash-practice-module reveal-up" id="dash-practice-zone" data-reveal="fade-up">
          <div className="dash-module-head">
            <div>
              <h2 className="dash-module-title">Daily Practice Drills</h2>
              <p className="dash-module-sub">Platform drills verified automatically against accepted submissions.</p>
            </div>

            <div className="dash-practice-meta-pill badge-flip">
              <span>{completedTasksCount} of {tasks.length || 3} completed</span>
              <span className="meta-separator">·</span>
              <span className="meta-xp">
                <Zap size={13} aria-hidden="true" fill="currentColor" />
                {earnedXp} / {totalXp || 60} XP
              </span>
            </div>
          </div>

          {/* Understated progress indicator */}
          <div className="dash-practice-progress" role="progressbar" aria-valuenow={practiceProgressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Daily task completion">
            <div className="dash-practice-progress-bar" style={{ width: `${practiceProgressPct}%` }} />
          </div>

          {/* Clean horizontal task rows */}
          <div className="dash-tasks-flow">
            {tasksLoading ? (
              <div className="dash-empty-message">
                <p>Loading your daily tasks…</p>
              </div>
            ) : tasks.length > 0 ? (
              tasks.slice(0, 3).map((task) => {
                const isDone = task.isCompleted || task.completed;
                const platKey = String(task.platform || '').toLowerCase();
                const diffKey = String(task.difficulty || 'medium').toLowerCase();
                return (
                  <div key={task.id} className={`dash-task-item interactive-transition ${isDone ? 'is-completed' : ''}`}>
                    <div className="dash-task-status-indicator" title={isDone ? 'Verified completed' : 'Pending completion'}>
                      {isDone && <CheckCircle2 size={16} fill="currentColor" />}
                    </div>

                    <div className="dash-task-detail">
                      <span className="dash-task-heading">{task.title || task.name}</span>
                      <div className="dash-task-attributes">
                        <span className={`tag-plat ${platKey}`}>{task.platform || 'LeetCode'}</span>
                        <span className={`tag-diff ${diffKey}`}>{task.difficulty || 'Medium'}</span>
                        {task.problemCode && <span className="tag-code">#{task.problemCode}</span>}
                      </div>
                    </div>

                    <span className="dash-task-score badge-flip">+{Number(task.points) || 20} XP</span>

                    {task.url && (
                      <a
                        href={task.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-solve hover-lift interactive-transition"
                        aria-label={`Open ${task.title || 'problem'} on ${task.platform || 'platform'}`}
                      >
                        <span>Solve</span>
                        <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="dash-empty-message">
                <Code2 size={24} style={{ color: 'var(--dash-mute)' }} aria-hidden="true" />
                <b>No practice tasks assigned today</b>
                <p>Curated drills refresh daily at midnight IST. Link your handles on Profile to verify automatically.</p>
              </div>
            )}
          </div>

          {taskNotice && (
            <p className="dash-practice-notice">{taskNotice}</p>
          )}

          <div className="dash-practice-foot">
            <button
              type="button"
              className="btn-verify hover-lift interactive-transition"
              onClick={() => loadTasks(true)}
              disabled={tasksVerifying || tasksLoading}
            >
              <RefreshCw size={13} className={tasksVerifying ? 'spin-icon' : ''} aria-hidden="true" />
              <span>{tasksVerifying ? 'Verifying Submissions…' : 'Verify Completed Tasks'}</span>
            </button>

            <button
              type="button"
              className="btn-link hover-lift interactive-transition"
              onClick={() => navigateTo('/progress')}
            >
              <span>Open Daily Tasks Console</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* ====================================================================
           3 & 4. BALANCED WORKSPACE: PROGRESS & CAMPUS RANKINGS
           ==================================================================== */}
        <div className="dash-workspace-split">
          {/* Section 3: Verified Progress & Heatmap */}
          <section className="dash-module dash-progress-module reveal-up" data-reveal="fade-up">
            <div className="dash-module-head">
              <div>
                <h2 className="dash-module-title">Verified Progress</h2>
                <p className="dash-module-sub">Unified cross-platform metrics tracked in real time.</p>
              </div>

              {/* Platform Selector (satisfies tests/stats-heatmap.test.js) */}
              <div className="dash-platform-filter-group" role="radiogroup" aria-label="Dashboard stats platform">
                {[['all', 'All platforms'], ['leetcode', 'LeetCode'], ['codeforces', 'Codeforces'], ['codechef', 'CodeChef']].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatsPlatform(key)}
                    aria-pressed={statsPlatform === key}
                    className={`btn-platform-pill interactive-transition ${statsPlatform === key ? 'active' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Horizontal Metrics Row */}
            <div className="dash-metrics-strip">
              <div className="dash-metric-block hover-lift interactive-transition">
                <span className="metric-title">Active Streak</span>
                <div className="metric-val accent">{currentStreak} <small>days</small></div>
                <span className="metric-caption">All platforms</span>
              </div>

              <div className="dash-metric-block hover-lift interactive-transition">
                <span className="metric-title">Longest Streak</span>
                <div className="metric-val">{longestStreak} <small>days</small></div>
                <span className="metric-caption">All-time record</span>
              </div>

              <div className="dash-metric-block hover-lift interactive-transition">
                <span className="metric-title">{statsPlatform === 'all' ? 'Solved' : `${statsPlatform} Solved`}</span>
                <div className="metric-val" id="stat-solved-num">{shownSolved}</div>
                <span className="metric-caption" id="stat-solved-delta">
                  {statsPlatform === 'all' ? `LC: ${solvedByPlatform.leetcode} · CF: ${solvedByPlatform.codeforces} · CC: ${solvedByPlatform.codechef}` : ratingSummary}
                </span>
              </div>

              <div className="dash-metric-block hover-lift interactive-transition">
                <span className="metric-title">Practice Days</span>
                <div className="metric-val">{activeDays} <small>days</small></div>
                <span className="metric-caption">IST calendar</span>
              </div>
            </div>

            {/* Seamlessly Integrated Heatmap */}
            <div className="dash-heatmap-wrapper">
              <ContributionHeatmap
                dailyActivity={user?.dailyActivity || {}}
                platformFilter={statsPlatform}
                onFilterChange={setStatsPlatform}
              />
            </div>

            <div className="dash-module-foot">
              <span className="foot-caption">Continuous submissions verified via platform APIs</span>
              <button
                type="button"
                className="btn-link hover-lift interactive-transition"
                onClick={() => navigateTo('/profile')}
              >
                <span>Detailed Analysis in Profile</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          </section>

          {/* Section 4: Campus Rankings */}
          <section className="dash-module dash-rankings-module reveal-up" data-reveal="fade-up">
            <div className="dash-module-head">
              <div>
                <h2 className="dash-module-title">Campus Rankings</h2>
                <p className="dash-module-sub">Students ranked live by verified streak.</p>
              </div>
              <button
                type="button"
                className="btn-link hover-lift interactive-transition"
                onClick={() => navigateTo('/leaderboard')}
                id="dash-btn-view-leaderboard"
              >
                <span>Full Board</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>

            {/* User Standing Callout — Shown Once */}
            <div className="dash-position-banner hover-lift interactive-transition">
              <div>
                <span className="position-eyebrow">Your Position</span>
                <span className="position-name">{user?.name || 'Your Account'}</span>
              </div>
              <span className="position-rank badge-flip">
                {userRank ? `#${userRank}` : 'Unranked'}
              </span>
            </div>

            {/* Concise list without duplicates */}
            <div className="dash-leaderboard-flow">
              <span className="leaderboard-heading">Campus Leaders</span>
              <div className="dash-leader-table">
                {leaderboardLoading ? (
                  <div className="dash-empty-message"><p>Loading campus standings…</p></div>
                ) : rankingRows.list.length > 0 ? (
                  <>
                    {rankingRows.list.map((m, idx) => {
                      const isMe = user?.id ? m.id === user.id : (m.n === user?.name);
                      return (
                        <div key={m.id || idx} className={`dash-leader-row hover-lift interactive-transition ${isMe ? 'is-self' : ''}`}>
                          <span className={`rank-badge badge-flip rank-${m.rank || idx + 1}`}>#{m.rank || idx + 1}</span>
                          <div className="student-profile">
                            <span className="student-full-name">{m.n || 'Member'}</span>
                            <span className="student-department">{m.b || m.branch || 'CSE'}</span>
                            {isMe && <span className="self-tag">YOU</span>}
                          </div>
                          <div className="student-scores">
                            <span className="streak-badge">
                              <Flame size={12} aria-hidden="true" />
                              {m.streak ?? m.currentStreak ?? 0}d
                            </span>
                            <span className="solved-badge">{m.s || 0} solved</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Gap indicator and user row if ranked beyond top list */}
                    {rankingRows.userExtraRow && (
                      <>
                        <div className="dash-leader-gap" aria-hidden="true">···</div>
                        <div className="dash-leader-row hover-lift interactive-transition is-self">
                          <span className="rank-badge badge-flip">#{rankingRows.userExtraRow.rank || userRankIndex + 1}</span>
                          <div className="student-profile">
                            <span className="student-full-name">{rankingRows.userExtraRow.n || user?.name || 'You'}</span>
                            <span className="student-department">{rankingRows.userExtraRow.b || rankingRows.userExtraRow.branch || 'CSE'}</span>
                            <span className="self-tag">YOU</span>
                          </div>
                          <div className="student-scores">
                            <span className="streak-badge">
                              <Flame size={12} aria-hidden="true" />
                              {rankingRows.userExtraRow.streak ?? rankingRows.userExtraRow.currentStreak ?? 0}d
                            </span>
                            <span className="solved-badge">{rankingRows.userExtraRow.s || 0} solved</span>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="dash-empty-message">
                    <p>No campus members yet. Be the first to join the leaderboard.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="dash-module-foot">
              <button
                type="button"
                className="btn-accent hover-lift interactive-transition"
                onClick={() => navigateTo('/leaderboard')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>View Full Campus Rankings</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>

        {/* ====================================================================
           5. CONNECTED PLATFORMS & RECENT ACTIVITY
           ==================================================================== */}
        <div className="dash-bottom-split">
          {/* Connected Platforms: Clean Aligned List */}
          <section className="dash-module dash-platforms-module reveal-up" data-reveal="fade-up">
            <div className="dash-module-head">
              <div>
                <h2 className="dash-module-title">Connected Platforms</h2>
                <p className="dash-module-sub">Synchronized competitive programming profiles.</p>
              </div>
              <button
                type="button"
                className="btn-link hover-lift interactive-transition"
                onClick={() => navigateTo('/profile')}
              >
                <span>Manage Handles</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>

            <div className="dash-platforms-list">
              {/* LeetCode */}
              <div className="dash-platform-row hover-lift interactive-transition lc">
                <div className="platform-id">
                  <span className="platform-title">LeetCode</span>
                  <span className={`platform-status-tag badge-flip ${user?.handles?.leetcode ? 'is-linked' : ''}`}>
                    {user?.handles?.leetcode ? 'Connected' : 'Unlinked'}
                  </span>
                </div>
                <div className="platform-account">
                  {user?.handles?.leetcode ? `@${user.handles.leetcode}` : (
                    <button type="button" onClick={() => navigateTo('/profile')} className="btn-link-action hover-lift interactive-transition">Link handle →</button>
                  )}
                </div>
                <div className="platform-stats-group">
                  <div className="stat-unit-box"><span>Solved</span><b>{solvedByPlatform.leetcode || '—'}</b></div>
                  <div className="stat-unit-box"><span>Rank</span><b>{platformStats.leetcode?.ranking ? `#${platformStats.leetcode.ranking}` : '—'}</b></div>
                </div>
              </div>

              {/* Codeforces */}
              <div className="dash-platform-row hover-lift interactive-transition cf">
                <div className="platform-id">
                  <span className="platform-title">Codeforces</span>
                  <span className={`platform-status-tag badge-flip ${user?.handles?.codeforces ? 'is-linked' : ''}`}>
                    {user?.handles?.codeforces ? 'Connected' : 'Unlinked'}
                  </span>
                </div>
                <div className="platform-account">
                  {user?.handles?.codeforces ? `@${user.handles.codeforces}` : (
                    <button type="button" onClick={() => navigateTo('/profile')} className="btn-link-action hover-lift interactive-transition">Link handle →</button>
                  )}
                </div>
                <div className="platform-stats-group">
                  <div className="stat-unit-box"><span>Rating</span><b>{platformStats.codeforces?.rating || '—'}</b></div>
                  <div className="stat-unit-box"><span>Title</span><b style={{ textTransform: 'capitalize' }}>{platformStats.codeforces?.rank || 'Unrated'}</b></div>
                </div>
              </div>

              {/* CodeChef */}
              <div className="dash-platform-row hover-lift interactive-transition cc">
                <div className="platform-id">
                  <span className="platform-title">CodeChef</span>
                  <span className={`platform-status-tag badge-flip ${user?.handles?.codechef ? 'is-linked' : ''}`}>
                    {user?.handles?.codechef ? 'Connected' : 'Unlinked'}
                  </span>
                </div>
                <div className="platform-account">
                  {user?.handles?.codechef ? `@${user.handles.codechef}` : (
                    <button type="button" onClick={() => navigateTo('/profile')} className="btn-link-action hover-lift interactive-transition">Link handle →</button>
                  )}
                </div>
                <div className="platform-stats-group">
                  <div className="stat-unit-box"><span>Stars</span><b>{platformStats.codechef?.stars || '—'}</b></div>
                  <div className="stat-unit-box"><span>Rating</span><b>{platformStats.codechef?.currentRating || platformStats.codechef?.rating || '—'}</b></div>
                </div>
              </div>
            </div>
          </section>

          {/* Activity / Contests */}
          <section className="dash-module dash-activity-module reveal-up" data-reveal="fade-up">
            <div className="dash-module-head">
              <div className="dash-tab-switcher">
                <button
                  type="button"
                  className={`tab-btn interactive-transition ${activityTab === 'submissions' ? 'active' : ''}`}
                  onClick={() => setActivityTab('submissions')}
                >
                  Recent Submissions
                </button>
                <button
                  type="button"
                  className={`tab-btn interactive-transition ${activityTab === 'contests' ? 'active' : ''}`}
                  onClick={() => setActivityTab('contests')}
                >
                  Upcoming Contests
                </button>
              </div>
            </div>

            {activityTab === 'submissions' ? (
              <div className="dash-activity-flow">
                {recentSubmissions.length > 0 ? (
                  recentSubmissions.map((sub, i) => (
                    <div key={sub.id || i} className="dash-activity-row hover-lift interactive-transition">
                      <div className="activity-item-main">
                        <CheckCircle2 size={15} color="#10B981" style={{ flexShrink: 0 }} aria-hidden="true" />
                        <span className="activity-item-title" title={sub.title}>{sub.title}</span>
                      </div>
                      <span className="activity-item-platform">{sub.platform || 'Accepted'}</span>
                    </div>
                  ))
                ) : (
                  <div className="dash-empty-message">
                    <Clock size={20} style={{ color: 'var(--dash-mute)' }} aria-hidden="true" />
                    <p>No recent submissions synced yet. Connect your handles on Profile to stream your accepted solutions.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="dash-activity-flow">
                {contestsLoading ? (
                  <div className="dash-empty-message"><p>Fetching official Codeforces schedule…</p></div>
                ) : upcomingContests.length > 0 ? (
                  upcomingContests.slice(0, 4).map((c) => {
                    const startTime = new Date(c.startTimeSeconds * 1000);
                    const timeStr = startTime.toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return (
                      <div key={c.id} className="dash-activity-row hover-lift interactive-transition">
                        <div className="activity-item-main">
                          <span className="activity-item-title" title={c.name}>{c.name}</span>
                          <span className="contest-time-tag">{timeStr} · {Math.round(c.durationSeconds / 3600)}h</span>
                        </div>
                        <a
                          href="https://codeforces.com/contests"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-link hover-lift interactive-transition"
                          style={{ fontSize: '11px', flexShrink: 0 }}
                        >
                          Register ↗
                        </a>
                      </div>
                    );
                  })
                ) : (
                  <div className="dash-empty-message">
                    <p>Could not load contest schedule. Check Codeforces official site.</p>
                  </div>
                )}
              </div>
            )}

            <div className="dash-module-foot">
              <span className="foot-caption">Activity synced live with campus leaderboard</span>
              <button
                type="button"
                className="btn-link hover-lift interactive-transition"
                onClick={() => navigateTo('/contests')}
              >
                <span>Contest Guides</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
