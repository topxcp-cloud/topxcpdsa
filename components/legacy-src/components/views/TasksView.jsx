'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api.js';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  RefreshCw,
  Flame,
  Zap,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

/**
 * TasksView — Phase 3: Weekly Tasks UI Refinement
 * Professional competitive programming practice workspace.
 * Clean typography, single-surface task flow, real verification feedback, and clear completion hierarchy.
 */
export default function TasksView({ active = false, user = null }) {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info'); // 'info' | 'success' | 'error'
  const [busy, setBusy] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Navigate helper
  const navigateTo = useCallback((path) => {
    if (typeof window !== 'undefined') {
      const tabName = path.replace(/^\//, '').replace(/^#/, '');
      window.dispatchEvent(new CustomEvent('topx:navigate', { detail: { tab: tabName } }));
    }
    router.push(path);
  }, [router]);

  // Current formatted date
  const todayDateString = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      }).format(new Date());
    } catch {
      return 'Today';
    }
  }, []);

  // Load and verify tasks
  const load = useCallback(async (verify = false) => {
    if (!user?.id) {
      setTasks([]);
      setStatus('Sign in to view tasks assigned to your account.');
      setStatusType('info');
      setInitialLoaded(true);
      return;
    }

    setBusy(true);
    if (verify) {
      setStatus('Checking accepted submissions on connected platforms…');
      setStatusType('busy');
    }

    try {
      if (verify) {
        const checked = await api(`/api/tasks/verify-all/${encodeURIComponent(user.id)}`, { method: 'POST' });
        if (Array.isArray(checked?.tasks)) {
          setTasks(checked.tasks);
        }
        if (checked?.streak?.current != null) {
          setStreak(checked.streak.current);
        }
      } else {
        const data = await api(`/api/tasks/daily/${encodeURIComponent(user.id)}`);
        const loadedTasks = Array.isArray(data?.tasks) ? data.tasks : [];
        setTasks(loadedTasks);
        setStreak(data?.streak?.current || 0);
      }

      if (verify) {
        setStatus('Submission verification finished. Only accepted solutions mark tasks complete.');
        setStatusType('success');
      } else {
        setStatus('');
      }
    } catch (error) {
      setStatus(error.message || 'Could not load weekly tasks.');
      setStatusType('error');
    } finally {
      setBusy(false);
      setInitialLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    const refresh = () => load(true);
    window.addEventListener('topx:tasks-refresh', refresh);
    return () => window.removeEventListener('topx:tasks-refresh', refresh);
  }, [load]);

  // Derived metrics
  const completed = tasks.filter(task => task.isCompleted || task.completed).length;
  const total = tasks.length;
  const xp = tasks
    .filter(task => task.isCompleted || task.completed)
    .reduce((sum, task) => sum + (Number(task.points) || 0), 0);
  const totalXp = tasks.reduce((sum, task) => sum + (Number(task.points) || 0), 0) || 165;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allCompleted = total > 0 && completed === total;

  return (
    <section className={`tab-view ${active ? 'active' : ''}`} id="view-tasks">
      <div className="tasks-page-container">
        {/* ====================================================================
           1. PAGE HEADER
           ==================================================================== */}
        <header className="tasks-header reveal-up">
          <div>
            <div className="tasks-header-meta">
              <span className="meta-pill badge-flip">Weekly Drills</span>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} aria-hidden="true" />
                {todayDateString}
              </span>
            </div>
            <h1 className="tasks-header-title">Weekly Tasks</h1>
            <p className="tasks-header-sub">
              Curated competitive programming problems verified automatically against your accepted submissions on LeetCode, Codeforces, and CodeChef.
            </p>
          </div>

          <div className="tasks-header-actions">
            <button
              type="button"
              className="btn-verify-sync hover-lift interactive-transition"
              id="btn-sync-all-tasks"
              disabled={busy || !user?.id}
              onClick={() => load(true)}
              aria-label="Verify accepted submissions and refresh tasks"
            >
              <RefreshCw size={14} className={busy ? 'spin-icon' : ''} aria-hidden="true" />
              <span>{busy ? 'Verifying Submissions…' : 'Verify & Refresh'}</span>
            </button>
          </div>
        </header>

        {/* ====================================================================
           2. PROGRESS SUMMARY STRIP
           ==================================================================== */}
        <div className="tasks-summary-strip reveal-up" data-scroll-reveal="true">
          <div className="tasks-metrics-grid">
            {/* Metric 1: Tasks Completed */}
            <div className="tasks-metric-col hover-lift interactive-transition">
              <span className="tasks-metric-label">Completed Tasks</span>
              <div className="tasks-metric-val">
                <b id="tasks-done-stat">{completed} / {total}</b>
                <span className="tasks-metric-sub">({progressPct}%)</span>
              </div>
            </div>

            {/* Metric 2: Current Streak */}
            <div className="tasks-metric-col hover-lift interactive-transition">
              <span className="tasks-metric-label">Weekly Task Streak</span>
              <div className="tasks-metric-val accent">
                <Flame size={20} aria-hidden="true" fill="currentColor" />
                <b id="tasks-streak-stat">{streak}</b>
                <span className="tasks-metric-sub">Days</span>
              </div>
            </div>

            {/* Metric 3: XP Earned This Week */}
            <div className="tasks-metric-col hover-lift interactive-transition">
              <span className="tasks-metric-label">XP Earned This Week</span>
              <div className="tasks-metric-val">
                <Zap size={18} aria-hidden="true" fill="currentColor" style={{ color: 'var(--task-ac)' }} />
                <b id="tasks-xp-stat">{xp}</b>
                <span className="tasks-metric-sub">/ {totalXp} XP</span>
              </div>
            </div>
          </div>

          {/* Understated Progress Bar */}
          <div className="tasks-progress-wrap">
            <div
              className="tasks-progress-track"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Weekly task completion percentage"
            >
              <div
                className={`tasks-progress-fill ${allCompleted ? 'complete' : ''}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* ====================================================================
           STATUS NOTICE / FEEDBACK BANNER
           ==================================================================== */}
        {status && (
          <div className={`tasks-status-notice ${statusType}`} role="status">
            {statusType === 'busy' && <RefreshCw size={15} className="spin-icon" aria-hidden="true" />}
            {statusType === 'success' && <CheckCircle2 size={16} aria-hidden="true" />}
            {statusType === 'error' && <AlertCircle size={16} aria-hidden="true" />}
            <span>{status}</span>
          </div>
        )}

        {/* Celebratory Completion Banner */}
        {allCompleted && (
          <div className="tasks-celebrate-banner" role="alert">
            <Sparkles size={20} aria-hidden="true" style={{ color: '#16A34A', flexShrink: 0 }} />
            <div>
              <span className="tasks-celebrate-title">All weekly tasks completed!</span>
              <p className="tasks-celebrate-sub">
                You&apos;ve verified all {total} problems, collected {xp} XP, and kept your {streak}-day streak alive. New drills unlock next week.
              </p>
            </div>
          </div>
        )}

        {/* ====================================================================
           3. MAIN TASK LIST
           ==================================================================== */}
        <section className="tasks-main-module" data-reveal="fade-up">
          <div className="tasks-module-head">
            <h2 className="tasks-module-title">Assigned Problems for This Week</h2>
            <span className="tasks-module-count">{completed} of {total} verified</span>
          </div>

          <div className="tasks-list-surface" id="tasks-cards-grid">
            {!initialLoaded ? (
              <div className="tasks-empty-box">
                <RefreshCw size={24} className="spin-icon" style={{ color: 'var(--task-mute)' }} aria-hidden="true" />
                <p>Loading your assigned practice problems…</p>
              </div>
            ) : !user?.id ? (
              <div className="tasks-empty-box">
                <h3>Sign in to access Weekly Tasks</h3>
                <p>Track your consistency, earn XP, and climb the campus leaderboard by completing verified platform drills.</p>
                <button
                  type="button"
                  className="btn-verify-sync"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('topx:open-auth'));
                    }
                  }}
                  style={{ marginTop: '8px' }}
                >
                  Sign In to Continue
                </button>
              </div>
            ) : tasks.length === 0 ? (
              <div className="tasks-empty-box">
                <h3>No weekly tasks assigned right now</h3>
                <p>Check back next week for a new set of curated competitive programming challenges.</p>
              </div>
            ) : (
              tasks.map((task, index) => {
                const isDone = Boolean(task.isCompleted || task.completed);
                const platKey = String(task.platform || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const diffKey = String(task.difficulty || 'medium').toLowerCase();

                let diffClass = 'diff-medium';
                if (diffKey.includes('easy')) diffClass = 'diff-easy';
                if (diffKey.includes('hard') || diffKey.includes('1400') || diffKey.includes('1500') || diffKey.includes('1600')) {
                  diffClass = 'diff-hard';
                }

                let platClass = 'plat-default';
                if (platKey.includes('leetcode')) platClass = 'plat-leetcode';
                if (platKey.includes('codeforces')) platClass = 'plat-codeforces';
                if (platKey.includes('codechef')) platClass = 'plat-codechef';

                return (
                  <article
                    key={task.id || `task-${index}`}
                    className={`task-row interactive-transition ${isDone ? 'is-done' : 'is-pending'}`}
                  >
                    {/* Status Circle */}
                    <div
                      className="task-status-box"
                      title={isDone ? 'Submission verified' : 'Pending completion'}
                      aria-label={isDone ? 'Completed' : 'Pending'}
                    >
                      {isDone ? (
                        <CheckCircle2 size={16} fill="currentColor" stroke="#FFFFFF" />
                      ) : (
                        <Circle size={15} stroke="currentColor" />
                      )}
                    </div>

                    {/* Problem Title & Metadata Badges */}
                    <div className="task-details">
                      <span className="task-title" title={task.title || task.name}>
                        {task.title || task.name}
                      </span>
                      <div className="task-tags">
                        <span className={`task-badge ${platClass}`}>
                          {task.platform || 'Platform'}
                        </span>
                        <span className={`task-badge ${diffClass}`}>
                          {task.difficulty || 'Standard'}
                        </span>
                        {task.problemCode && (
                          <span className="task-badge code-badge">
                            #{task.problemCode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* XP Score */}
                    <div className="task-xp-pill badge-flip">
                      +{Number(task.points) || 20} XP
                    </div>

                    {/* Action */}
                    <div className="task-action-cell">
                      {isDone ? (
                        <>
                          <span className="task-verified-tag">
                            <CheckCircle2 size={12} aria-hidden="true" />
                            Verified
                          </span>
                          {task.url && (
                            <a
                              href={task.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-task-review hover-lift interactive-transition"
                              aria-label={`Review ${task.title || 'problem'} on ${task.platform || 'platform'}`}
                            >
                              <span>Review</span>
                              <ExternalLink size={12} aria-hidden="true" />
                            </a>
                          )}
                        </>
                      ) : task.url ? (
                        <a
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-task-solve hover-lift interactive-transition"
                          aria-label={`Open and solve ${task.title || 'problem'} on ${task.platform || 'platform'}`}
                        >
                          <span>Solve</span>
                          <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* ====================================================================
           4. USEFUL SECONDARY INFORMATION
           ==================================================================== */}
        <div className="tasks-secondary-grid reveal-up">
          {/* Card 1: Verification Rules */}
          <div className="tasks-info-card hover-lift interactive-transition">
            <h4>
              <ShieldCheck size={16} style={{ color: 'var(--task-ac)' }} aria-hidden="true" />
              Automatic Verification Rules
            </h4>
            <p>
              Submissions are checked directly against your connected LeetCode, Codeforces, and CodeChef accounts. Only accepted submissions with matching problem codes count toward your weekly streak and XP.
            </p>
            <button
              type="button"
              className="tasks-info-link interactive-transition"
              onClick={() => navigateTo('/profile')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span>Manage coding platform handles</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>

          {/* Card 2: Campus Standing */}
          <div className="tasks-info-card hover-lift interactive-transition">
            <h4>
              <Flame size={16} style={{ color: 'var(--task-ac)' }} aria-hidden="true" />
              Streak & Leaderboard Impact
            </h4>
            <p>
              Your position on the campus leaderboard is determined by consistent practice. Complete all assigned drills this week to preserve your active streak.
            </p>
            <button
              type="button"
              className="tasks-info-link interactive-transition"
              onClick={() => navigateTo('/leaderboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span>View campus standings</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
