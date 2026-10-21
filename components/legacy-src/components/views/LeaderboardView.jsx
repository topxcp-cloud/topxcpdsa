'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import ContributionHeatmap from '../../../profile/ContributionHeatmap.jsx';

export default function LeaderboardView({ active = false }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Interactive filters
  const [yearFilter, setYearFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [metricFilter, setMetricFilter] = useState('solved');
  const [query, setQuery] = useState('');

  // Selected student for public preview modal
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (yearFilter !== 'all') params.set('year', yearFilter);
      if (branchFilter !== 'all') params.set('branch', branchFilter);
      if (sectionFilter !== 'all') params.set('section', sectionFilter);
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      if (periodFilter !== 'all') params.set('period', periodFilter);
      if (metricFilter !== 'solved') params.set('metric', metricFilter);
      if (query.trim()) params.set('query', query.trim());

      const data = await api(`/api/leaderboard?${params.toString()}`);
      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch (err) {
      setError(err.message || 'Leaderboard is currently unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [yearFilter, branchFilter, sectionFilter, platformFilter, periodFilter, metricFilter]);

  const resetFilters = () => {
    setYearFilter('all');
    setBranchFilter('all');
    setSectionFilter('all');
    setPlatformFilter('all');
    setPeriodFilter('all');
    setMetricFilter('solved');
    setQuery('');
  };

  const hasActiveFilters = yearFilter !== 'all' || branchFilter !== 'all' || sectionFilter !== 'all' || platformFilter !== 'all' || periodFilter !== 'all' || metricFilter !== 'solved' || query.trim() !== '';

  const filteredMembers = useMemo(() => {
    if (!query.trim()) return members;
    const q = query.toLowerCase().trim();
    return members.filter((m) =>
      String(m.n || '').toLowerCase().includes(q) ||
      String(m.college || '').toLowerCase().includes(q) ||
      String(m.branch || '').toLowerCase().includes(q)
    );
  }, [members, query]);

  const podium = filteredMembers.slice(0, 3);

  const getRankBadgeClass = (index) => {
    if (index === 0) return 'lb-rank-badge rank-gold';
    if (index === 1) return 'lb-rank-badge rank-silver';
    if (index === 2) return 'lb-rank-badge rank-bronze';
    return 'lb-rank-badge rank-default';
  };

  const formatCohort = (m) => {
    if (!m) return 'Not set';
    const parts = [];
    if (m.branch) parts.push(m.branch);
    if (m.academicYear) {
      const yrMap = { 'First': '1st Year', 'Second': '2nd Year', 'Third': '3rd Year', 'Fourth': '4th Year', '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' };
      parts.push(yrMap[m.academicYear] || `Year ${m.academicYear}`);
    }
    if (m.section) parts.push(`Sec ${m.section}`);
    return parts.length > 0 ? parts.join(' • ') : 'Not set';
  };

  const handleSelectStudent = async (member) => {
    setSelectedStudent(member);
    try {
      const publicData = await api(`/api/user/public/${encodeURIComponent(member.id)}`);
      if (publicData) {
        setSelectedStudent((prev) => ({
          ...prev,
          ...publicData,
          dailyActivity: publicData.dailyActivity || {}
        }));
      }
    } catch (_) {}
  };

  return (
    <section className={`tab-view ${active ? 'active' : ''}`} id="view-leaderboard">
      <div className="view-wrap" style={{ maxWidth: '1200px' }}>
        <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2>Top-X Leaderboard</h2>
            <p className="sub">
              Live college rankings backed by real verified platform activity. Compete with peers across batches, branches, and sections.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="bs-ctl-btn"
              style={{ color: 'var(--ac)', borderColor: 'var(--ac)' }}
            >
              ✕ Reset All Filters
            </button>
          )}
        </div>

        {/* Multi-Filter Controls Bar */}
        <div className="lb-filter-bar">
          <div className="lb-filter-grid">
            {/* Academic Year */}
            <div className="auth-field">
              <label htmlFor="lb-filter-year">Year</label>
              <select
                id="lb-filter-year"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="all">All Academic Years</option>
                <option value="First">First Year</option>
                <option value="Second">Second Year</option>
                <option value="Third">Third Year</option>
                <option value="Fourth">Fourth Year</option>
              </select>
            </div>

            {/* Branch */}
            <div className="auth-field">
              <label htmlFor="lb-filter-branch">Branch</label>
              <select
                id="lb-filter-branch"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">All Branches</option>
                <option value="CSE">CSE</option>
                <option value="IT">IT</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="CSBS">CSBS</option>
                <option value="AIDS">AI &amp; Data Science</option>
                <option value="MECH">Mechanical</option>
                <option value="CIVIL">Civil</option>
                <option value="CHEMICAL">Chemical</option>
              </select>
            </div>

            {/* Section */}
            <div className="auth-field">
              <label htmlFor="lb-filter-section">Section</label>
              <select
                id="lb-filter-section"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
              >
                <option value="all">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
              </select>
            </div>

            {/* Platform */}
            <div className="auth-field">
              <label htmlFor="lb-filter-platform">Platform</label>
              <select
                id="lb-filter-platform"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
              >
                <option value="all">Combined (All Platforms)</option>
                <option value="leetcode">LeetCode Only</option>
                <option value="codeforces">Codeforces Only</option>
                <option value="codechef">CodeChef Only</option>
              </select>
            </div>

            {/* Time Period */}
            <div className="auth-field">
              <label htmlFor="lb-filter-period">Time Period</label>
              <select
                id="lb-filter-period"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="monthly">Past 30 Days</option>
                <option value="weekly">Past 7 Days</option>
              </select>
            </div>

            {/* Ranking Metric */}
            <div className="auth-field">
              <label htmlFor="lb-filter-metric">Rank By</label>
              <select
                id="lb-filter-metric"
                value={metricFilter}
                onChange={(e) => setMetricFilter(e.target.value)}
              >
                <option value="solved">Problems Solved</option>
                <option value="streak">Current Streak</option>
                <option value="longest">Longest Streak</option>
                <option value="rating">Competitive Rating</option>
              </select>
            </div>
          </div>

          <div className="lb-search-row">
            <input
              id="lb-search-input"
              className="lb-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students by name..."
            />
            <span className="num" id="lb-count-txt" style={{ color: 'var(--mute)', fontSize: '13px' }}>
              Showing {filteredMembers.length} active {filteredMembers.length === 1 ? 'student' : 'students'}
            </span>
          </div>
        </div>

        {/* Podium for Top 3 */}
        {podium.length > 0 && (
          <div className="lb-podium" id="lb-podium-wrap" style={{ marginBottom: '24px' }}>
            {podium.map((member, index) => (
              <div
                className={`lb-podium-card podium-${index + 1}`}
                key={member.id}
                onClick={() => handleSelectStudent(member)}
                style={{ cursor: 'pointer' }}
              >
                <span className="lb-podium-rank">#{index + 1}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--surface-alt)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.n || 'Member'} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (member.n || 'M').slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <strong style={{ fontSize: '16px' }}>{member.n}</strong>
                </div>
                <span className="sm" style={{ color: 'var(--mute)' }}>
                  {formatCohort(member)}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--ink)', marginTop: '4px' }}>
                  {metricFilter === 'streak' ? `🔥 ${member.streak} day streak` : (member.solvesComplete === false ? 'Stats pending' : `${Number(member.s) || 0} solved`)}
                </span>
                <small className="num" style={{ color: 'var(--mute)' }}>
                  {member.streak ? `${member.streak}d streak` : 'Getting started'} • Rating: {Number(member.k) || 0}
                </small>
              </div>
            ))}
          </div>
        )}

        {/* Error or Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mute)' }}>
            <span className="pulse-dot" style={{ display: 'inline-block', marginRight: '8px' }} />
            <span>Fetching live verified rankings...</span>
          </div>
        )}
        {error && (
          <div className="profile-feedback error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '20px' }}>
            <span>{error}</span>
            <button type="button" className="bs-ctl-btn" onClick={fetchLeaderboard} style={{ fontSize: '12px', padding: '4px 10px' }}>Retry</button>
          </div>
        )}

        {/* Leaderboard Table */}
        {!loading && filteredMembers.length > 0 ? (
          <div className="lb-table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Rank</th>
                  <th>Student</th>
                  <th>Cohort</th>
                  <th>Problems Solved</th>
                  <th>Breakdown (LC / CF / CC)</th>
                  <th>Streak</th>
                  <th style={{ textAlign: 'right' }}>Profile</th>
                </tr>
              </thead>
              <tbody id="lb-tbody">
                {filteredMembers.map((member, index) => (
                  <tr key={member.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectStudent(member)}>
                    <td>
                      <span className={getRankBadgeClass(index)}>
                        {member.rank || index + 1}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-alt)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', flexShrink: 0, overflow: 'hidden' }}>
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.n || 'Member'} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            (member.n || 'M').slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div>
                          <strong>{member.n || 'Member'}</strong>
                          {member.isPro && <span className="badge-pill" style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(249,115,22,0.1)', color: '#ea580c' }}>PRO</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="sm">
                        {formatCohort(member)}
                      </span>
                    </td>
                    <td>
                      <strong className="num" style={{ fontSize: '15px' }}>{member.solvesComplete === false ? '—' : (Number(member.s) || 0)}</strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', fontSize: '12px' }}>
                        <span className="lb-platform-pill" title="LeetCode Solved">
                          LC: {member.leetcodeSolved ?? 0}
                        </span>
                        <span className="lb-platform-pill" title="Codeforces Accepted">
                          CF: {member.codeforcesSolved ?? 0}
                        </span>
                        <span className="lb-platform-pill" title="CodeChef Solved">
                          CC: {member.codechefSolved ?? 0}
                        </span>
                      </div>
                    </td>
                    <td>
                      {member.streak > 0 ? (
                        <span style={{ color: 'var(--ac)', fontWeight: 600 }}>🔥 {member.streak} days</span>
                      ) : (
                        <span className="sm">No active streak</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="bs-ctl-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectStudent(member);
                        }}
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                      >
                        View Stats →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !loading ? (
          members.length === 0 ? (
            <div className="lb-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏆</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700 }}>No members on the leaderboard yet</h3>
              <p style={{ maxWidth: '480px', margin: '8px auto 20px', color: 'var(--mute)' }}>
                Connect your LeetCode, Codeforces, or CodeChef handles in My Profile and click Sync to lead the college ranking!
              </p>
              <a href="/profile" className="btn-primary" style={{ display: 'inline-flex', padding: '10px 24px', textDecoration: 'none' }}>
                Go to My Profile →
              </a>
            </div>
          ) : (
            <div className="lb-empty-state">
              <h3>No students match the selected filters</h3>
              <p>
                Try adjusting your Academic Year, Branch, or Section filter to see students from other cohorts.
              </p>
              <button type="button" className="btn-primary" onClick={resetFilters}>
                Reset All Filters
              </button>
            </div>
          )
        ) : null}
      </div>

      {/* Public Student Modal */}
      {selectedStudent && (
        <div
          className="student-modal-overlay"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="student-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="student-modal-header">
              <div className="student-modal-identity">
                <div className="student-modal-avatar">
                  {selectedStudent.avatar ? (
                    <img src={selectedStudent.avatar} alt={selectedStudent.n || selectedStudent.name || 'Student'} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (selectedStudent.n || selectedStudent.name || 'M').slice(0, 1).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedStudent.n || selectedStudent.name || 'Student Member'}</h3>
                  <span className="sm" style={{ color: 'var(--mute)' }}>
                    {formatCohort(selectedStudent)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="student-modal-close"
                onClick={() => setSelectedStudent(null)}
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="student-modal-metrics">
              <div className="student-modal-metric">
                <span className="sm">Total Solved</span>
                <div className="metric-val">{selectedStudent.s || 0}</div>
              </div>
              <div className="student-modal-metric">
                <span className="sm">Current Streak</span>
                <div className="metric-val" style={{ color: 'var(--ac)' }}>🔥 {selectedStudent.streak || 0}d</div>
              </div>
              <div className="student-modal-metric">
                <span className="sm">Longest Streak</span>
                <div className="metric-val">🏆 {selectedStudent.longestStreak || 0}d</div>
              </div>
            </div>

            {/* Platform Handles */}
            <div className="student-modal-handles">
              {selectedStudent.handles?.leetcode && (
                <a
                  href={`https://leetcode.com/${encodeURIComponent(selectedStudent.handles.leetcode)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="student-handle-link"
                >
                  <span>LeetCode: <b>{selectedStudent.handles.leetcode}</b></span>
                  <span className="arrow">↗</span>
                </a>
              )}
              {selectedStudent.handles?.codeforces && (
                <a
                  href={`https://codeforces.com/profile/${encodeURIComponent(selectedStudent.handles.codeforces)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="student-handle-link"
                >
                  <span>Codeforces: <b>{selectedStudent.handles.codeforces}</b></span>
                  <span className="arrow">↗</span>
                </a>
              )}
              {selectedStudent.handles?.codechef && (
                <a
                  href={`https://www.codechef.com/users/${encodeURIComponent(selectedStudent.handles.codechef)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="student-handle-link"
                >
                  <span>CodeChef: <b>{selectedStudent.handles.codechef}</b></span>
                  <span className="arrow">↗</span>
                </a>
              )}
            </div>

            {/* Daily Activity Heatmap */}
            <ContributionHeatmap dailyActivity={selectedStudent.dailyActivity || {}} />
          </div>
        </div>
      )}
    </section>
  );
}
