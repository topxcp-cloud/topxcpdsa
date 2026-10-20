'use client';
import { useState, useEffect } from 'react';
import { AdminLayout } from '../../src/components/AdminLayout';
import { getStats, exportUsersCSV } from '../../src/services/api';
import { AdminStats } from '../../src/types';
import { 
  Users, 
  UserCheck, 
  ShieldAlert, 
  CalendarCheck, 
  Code2, 
  Download, 
  TrendingUp, 
  Activity, 
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FolderGit2
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportProOnly, setExportProOnly] = useState(false);

  const fetchStats = async () => {
    try {
      setError('');
      const data = await getStats();
      setStats(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load live database telemetry.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStats();
  };

  const handleExportCSV = async () => {
    try {
      const res = await exportUsersCSV(exportProOnly);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topx-users${exportProOnly ? '-pro-members' : ''}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('CSV export failed: ' + (err?.message || 'Unknown error'));
    }
  };

  return (
    <AdminLayout title="Operational Dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            System Intelligence & Live Metrics
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Live metrics aggregated from Supabase user records, coding platform handles, and daily challenges.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
            <span>Refresh Telemetry</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportCSV}
          >
            <Download size={14} />
            <span>Export User Directory (CSV)</span>
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={exportProOnly} onChange={event => setExportProOnly(event.target.checked)} />
            Pro members only
          </label>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '14px 18px',
          background: 'var(--danger-soft)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger)',
          marginBottom: '24px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-screen">
          <div className="spinner lg"></div>
          <div>Loading database telemetry...</div>
        </div>
      ) : !stats ? (
        <div className="empty-state">
          <div className="empty-state-title">No metrics available</div>
          <div className="empty-state-desc">The database returned an empty telemetry payload.</div>
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="stats-grid">
            <div className="stat-card accent">
              <div className="stat-icon accent">
                <Users size={20} />
              </div>
              <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
              <div className="stat-label">Total Registered Members</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {stats.proUsers} Verified Pro Members
              </div>
            </div>

            <div className="stat-card success">
              <div className="stat-icon success">
                <Activity size={20} />
              </div>
              <div className="stat-value">{stats.activeUsers.toLocaleString()}</div>
              <div className="stat-label">Active Users (7-Day Window)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% 7-day engagement rate
              </div>
            </div>

            <div className="stat-card info">
              <div className="stat-icon info">
                <UserCheck size={20} />
              </div>
              <div className="stat-value">{stats.profileComplete.toLocaleString()}</div>
              <div className="stat-label">Complete Profiles</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {stats.profileIncomplete} Profiles Incomplete
              </div>
            </div>

            <div className="stat-card warning">
              <div className="stat-icon warning">
                <CalendarCheck size={20} />
              </div>
              <div className="stat-value">{stats.totalTasks}</div>
              <div className="stat-label">Daily Challenge Tasks</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Timezone: Asia/Kolkata
              </div>
            </div>

            <div className="stat-card danger">
              <div className="stat-icon danger">
                <ShieldAlert size={20} />
              </div>
              <div className="stat-value">{(stats.suspended + stats.blacklisted).toLocaleString()}</div>
              <div className="stat-label">Moderated Accounts</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {stats.suspended} Suspended, {stats.blacklisted} Blacklisted
              </div>
            </div>
          </div>

          {/* Charts & Breakdown Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Registration Trend (30 Days) */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
                  <span className="card-title">User Registrations (Last 30 Days)</span>
                </div>
                <span className="badge active">Database Logged</span>
              </div>
              <div className="card-body">
                {Object.keys(stats.registrationsByDay).length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                    No registrations recorded in the last 30 days.
                  </div>
                ) : (
                  <div>
                    <div className="chart-bar-container">
                      {Object.entries(stats.registrationsByDay).slice(-20).map(([day, count]) => {
                        const maxVal = Math.max(...Object.values(stats.registrationsByDay), 1);
                        const heightPct = Math.max(8, Math.round((count / maxVal) * 100));
                        return (
                          <div
                            key={day}
                            className="chart-bar"
                            style={{ height: `${heightPct}%` }}
                          >
                            <div className="chart-bar-tooltip">
                              {day}: {count} new {count === 1 ? 'user' : 'users'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      <span>Past 30 Days</span>
                      <span>Today</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Daily Submission Activity Trend (30 Days) */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} style={{ color: 'var(--success)' }} />
                  <span className="card-title">Coding Activity & Submissions (Last 30 Days)</span>
                </div>
                <span className="badge active">Synced Stats</span>
              </div>
              <div className="card-body">
                {Object.keys(stats.activityByDay).length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                    No member platform activity recorded in the past 30 days.
                  </div>
                ) : (
                  <div>
                    <div className="chart-bar-container">
                      {Object.entries(stats.activityByDay).slice(-20).map(([day, count]) => {
                        const maxVal = Math.max(...Object.values(stats.activityByDay), 1);
                        const heightPct = Math.max(8, Math.round((count / maxVal) * 100));
                        return (
                          <div
                            key={day}
                            className="chart-bar"
                            style={{ height: `${heightPct}%`, background: 'var(--success)' }}
                          >
                            <div className="chart-bar-tooltip">
                              {day}: {count} problems solved
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      <span>Submissions Trajectory</span>
                      <span>Current Daily Activity</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Platform Distribution & Academic Split */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Coding Platform Connectivity */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code2 size={16} style={{ color: 'var(--accent)' }} />
                  <span className="card-title">Coding Platform Participation</span>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge leetcode">LeetCode</span>
                      </span>
                      <span style={{ fontWeight: 600 }}>{stats.platforms.leetcode} users</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${stats.totalUsers > 0 ? (stats.platforms.leetcode / stats.totalUsers) * 100 : 0}%`, height: '100%', background: 'var(--leetcode)' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge codeforces">Codeforces</span>
                      </span>
                      <span style={{ fontWeight: 600 }}>{stats.platforms.codeforces} users</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${stats.totalUsers > 0 ? (stats.platforms.codeforces / stats.totalUsers) * 100 : 0}%`, height: '100%', background: 'var(--codeforces)' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge codechef">CodeChef</span>
                      </span>
                      <span style={{ fontWeight: 600 }}>{stats.platforms.codechef} users</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${stats.totalUsers > 0 ? (stats.platforms.codechef / stats.totalUsers) * 100 : 0}%`, height: '100%', background: '#c8a882' }}></div>
                    </div>
                  </div>

                  <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Unlinked Accounts:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{stats.platforms.none} users</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Demographics */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderGit2 size={16} style={{ color: 'var(--warning)' }} />
                  <span className="card-title">Academic Year Distribution</span>
                </div>
              </div>
              <div className="card-body">
                {Object.keys(stats.yearDistribution).length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                    No academic year information registered.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(stats.yearDistribution).map(([year, count]) => {
                      const label = year.toUpperCase();
                      const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
                      return (
                        <div key={year}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600 }}>{label} YEAR</span>
                            <span style={{ color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </AdminLayout>
  );
}
