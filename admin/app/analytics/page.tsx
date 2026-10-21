'use client';
import { useState, useEffect } from 'react';
import { AdminLayout } from '../../src/components/AdminLayout';
import { getStats, exportUsersCSV } from '../../src/services/api';
import { AdminStats } from '../../src/types';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Download, 
  RefreshCw, 
  Activity, 
  PieChart, 
  Award,
  CheckCircle2,
  Layers
} from 'lucide-react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStats();
      setStats(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load telemetry stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExportCSV = async () => {
    try {
      const res = await exportUsersCSV();
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topx-analytics-users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('CSV export error: ' + (err?.message || ''));
    }
  };

  return (
    <AdminLayout title="System Analytics & Telemetry">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '2px' }}>
            Telemetry, Demographic Splits & Platform Engagement
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Comprehensive reporting derived from real-time Supabase records and platform submission caches.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={fetchStats}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={handleExportCSV}>
            <Download size={14} />
            <span>Export User Report (CSV)</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-screen">
          <div className="spinner lg"></div>
          <div>Aggregating platform telemetry...</div>
        </div>
      ) : !stats ? (
        <div className="empty-state">
          <div className="empty-state-title">No analytics available</div>
        </div>
      ) : (
        <>
          {/* Key KPI summary strip */}
          <div className="stats-grid">
            <div className="stat-card accent">
              <div className="stat-icon accent">
                <Users size={18} />
              </div>
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Registered</div>
            </div>

            <div className="stat-card success">
              <div className="stat-icon success">
                <Activity size={18} />
              </div>
              <div className="stat-value">{stats.activeUsers}</div>
              <div className="stat-label">Active Users (7 Days)</div>
            </div>

            <div className="stat-card info">
              <div className="stat-icon info">
                <CheckCircle2 size={18} />
              </div>
              <div className="stat-value">
                {stats.totalUsers > 0 ? Math.round((stats.profileComplete / stats.totalUsers) * 100) : 0}%
              </div>
              <div className="stat-label">Profile Completion Rate</div>
            </div>

            <div className="stat-card warning">
              <div className="stat-icon warning">
                <Award size={18} />
              </div>
              <div className="stat-value">
                {stats.platforms.leetcode + stats.platforms.codeforces + stats.platforms.codechef}
              </div>
              <div className="stat-label">Total Connected Profiles</div>
            </div>
          </div>

          {/* Deep Analytics Visualizations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Registrations Trajectory */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
                  <span className="card-title">Registration Velocity (Past 30 Days)</span>
                </div>
              </div>
              <div className="card-body">
                {Object.keys(stats.registrationsByDay).length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No recent registration records.
                  </div>
                ) : (
                  <div>
                    <div className="chart-bar-container" style={{ height: '140px' }}>
                      {Object.entries(stats.registrationsByDay).slice(-25).map(([day, count]) => {
                        const maxVal = Math.max(...Object.values(stats.registrationsByDay), 1);
                        const heightPct = Math.max(10, Math.round((count / maxVal) * 100));
                        return (
                          <div key={day} className="chart-bar" style={{ height: `${heightPct}%` }}>
                            <div className="chart-bar-tooltip">
                              {day}: {count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      <span>Past 30 Days</span>
                      <span>Latest</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submission Activity Density */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={16} style={{ color: 'var(--success)' }} />
                  <span className="card-title">Submission Activity Velocity</span>
                </div>
              </div>
              <div className="card-body">
                {Object.keys(stats.activityByDay).length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No submission activity logged in this window.
                  </div>
                ) : (
                  <div>
                    <div className="chart-bar-container" style={{ height: '140px' }}>
                      {Object.entries(stats.activityByDay).slice(-25).map(([day, count]) => {
                        const maxVal = Math.max(...Object.values(stats.activityByDay), 1);
                        const heightPct = Math.max(10, Math.round((count / maxVal) * 100));
                        return (
                          <div key={day} className="chart-bar" style={{ height: `${heightPct}%`, background: 'var(--success)' }}>
                            <div className="chart-bar-tooltip">
                              {day}: {count} solves
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      <span>Daily Activity Trend</span>
                      <span>Today</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Demographics & Branch Split */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Engineering Branch Distribution</span>
              </div>
              <div className="card-body">
                {Object.keys(stats.branchDistribution).length === 0 ? (
                  <div style={{ padding: '20px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No branch data recorded.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(stats.branchDistribution).map(([branch, count]) => {
                      const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
                      return (
                        <div key={branch}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                            <span style={{ fontWeight: 600 }}>{branch}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{count} ({pct}%)</span>
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

            <div className="card">
              <div className="card-header">
                <span className="card-title">College / Institution Representation</span>
              </div>
              <div className="card-body">
                {Object.keys(stats.collegeDistribution).length === 0 ? (
                  <div style={{ padding: '20px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No institution data recorded.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(stats.collegeDistribution).slice(0, 6).map(([college, count]) => {
                      const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
                      return (
                        <div key={college}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                            <span style={{ fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {college}
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#8b5cf6' }}></div>
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
