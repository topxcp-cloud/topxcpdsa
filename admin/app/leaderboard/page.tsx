'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '../../src/components/AdminLayout';
import { getLeaderboard } from '../../src/services/api';
import { 
  Trophy, 
  Flame, 
  RefreshCw, 
  ExternalLink, 
  Eye, 
  Medal, 
  Calendar,
  Filter,
  UserCheck
} from 'lucide-react';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [platform, setPlatform] = useState('all');
  const [period, setPeriod] = useState('all');
  const [year, setYear] = useState('all');
  const [branch, setBranch] = useState('all');
  const [section, setSection] = useState('all');

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (platform !== 'all') params.platform = platform;
      if (period !== 'all') params.period = period;
      if (year !== 'all') params.year = year;
      if (branch !== 'all') params.branch = branch;
      if (section !== 'all') params.section = section;

      const data = await getLeaderboard(params);
      setEntries(Array.isArray(data) ? data : data.leaderboard || data.users || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to query live leaderboard rankings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [platform, period, year, branch, section]);

  return (
    <AdminLayout title="Platform Rankings & Leaderboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '2px' }}>
            Live Leaderboard & Competitive Scoring ({entries.length} Ranked)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Deterministic ranking calculated across LeetCode, Codeforces, and CodeChef real submission history.
          </p>
        </div>

        <button type="button" className="btn btn-secondary" onClick={fetchLeaderboard}>
          <RefreshCw size={14} />
          <span>Refresh Rankings</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="filter-bar">
        <select className="form-select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="all">All Platforms Combined</option>
          <option value="leetcode">LeetCode Only</option>
          <option value="codeforces">Codeforces Only</option>
          <option value="codechef">CodeChef Only</option>
        </select>

        <select className="form-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="all">All Time History</option>
          <option value="month">This Month</option>
          <option value="week">This Week</option>
        </select>

        <select className="form-select" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="all">All Academic Years</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </select>

        <select className="form-select" value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="all">All Branches</option>
          <option value="CSE">CSE</option>
          <option value="CS-DS">CS-DS</option>
          <option value="CS-AI">CS-AI</option>
          <option value="IT">IT</option>
          <option value="ECE">ECE</option>
        </select>

        <select className="form-select" value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="all">All Sections</option>
          <option value="A">Section A</option>
          <option value="B">Section B</option>
          <option value="C">Section C</option>
        </select>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Member / Scholar</th>
                <th>Academic Track</th>
                <th>Handles</th>
                <th>Active Streak</th>
                <th style={{ textAlign: 'right' }}>Total Solved</th>
                <th style={{ textAlign: 'right' }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                    Computing leaderboard standings...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    No members meet the selected ranking filter.
                  </td>
                </tr>
              ) : (
                entries.map((item, idx) => {
                  const rank = idx + 1;
                  return (
                    <tr key={item.id || idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {rank === 1 ? (
                            <Medal size={20} style={{ color: '#eab308' }} />
                          ) : rank === 2 ? (
                            <Medal size={20} style={{ color: '#94a3b8' }} />
                          ) : rank === 3 ? (
                            <Medal size={20} style={{ color: '#b45309' }} />
                          ) : (
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-muted)', width: '20px' }}>
                              #{rank}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {item.avatar ? (
                              <img src={item.avatar} alt={item.name} />
                            ) : (
                              (item.name || 'User').slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Link href={`/users/${item.id}`} className="user-name">
                                {item.name || 'Anonymous Member'}
                              </Link>
                              {item.isPro && <span className="badge pro">PRO</span>}
                            </div>
                            <div className="user-email">{item.email}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{item.college || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {[
                            item.academicYear ? `${item.academicYear.toUpperCase()} YR` : '',
                            item.branch || '',
                            item.section ? `Sec ${item.section}` : ''
                          ].filter(Boolean).join(' • ') || 'General'}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {item.handles?.leetcode && (
                            <a
                              href={`https://leetcode.com/u/${item.handles.leetcode}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="badge leetcode"
                            >
                              LC: {item.handles.leetcode}
                            </a>
                          )}
                          {item.handles?.codeforces && (
                            <a
                              href={`https://codeforces.com/profile/${item.handles.codeforces}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="badge codeforces"
                            >
                              CF: {item.handles.codeforces}
                            </a>
                          )}
                          {item.handles?.codechef && (
                            <a
                              href={`https://www.codechef.com/users/${item.handles.codechef}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="badge codechef"
                            >
                              CC: {item.handles.codechef}
                            </a>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)', fontWeight: 600 }}>
                          <Flame size={14} />
                          <span>{item.currentStreak || 0}d streak</span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {item.totalUniqueSolved || item.score || 0}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Problems</div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/users/${item.id}`} className="btn btn-secondary btn-sm">
                          <Eye size={13} />
                          <span>Dossier</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
