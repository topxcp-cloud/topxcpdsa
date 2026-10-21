'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '../../src/components/AdminLayout';
import { 
  getUsers, 
  suspendUser, 
  restoreUser, 
  blacklistUser, 
  setVerificationStatus,
  exportUsersCSV 
} from '../../src/services/api';
import { User } from '../../src/types';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Download, 
  RefreshCw, 
  ExternalLink, 
  Eye, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  MoreVertical,
  Flame,
  Shield,
  UserX
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportProOnly, setExportProOnly] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Action Modals State
  const [activeModal, setActiveModal] = useState<{
    type: 'suspend' | 'blacklist' | 'verify';
    user: User;
  } | null>(null);
  const [modalReason, setModalReason] = useState('');
  const [modalStatus, setModalStatus] = useState<string>('verified');
  const [actionBusy, setActionBusy] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      };
      if (search.trim()) params.search = search.trim();
      if (yearFilter !== 'all') params.year = yearFilter;
      if (branchFilter !== 'all') params.branch = branchFilter;
      if (sectionFilter !== 'all') params.section = sectionFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (platformFilter !== 'all') params.platform = platformFilter;

      const res = await getUsers(params);
      setUsers(res.users || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve user database.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, yearFilter, branchFilter, sectionFilter, statusFilter, platformFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleActionSubmit = async () => {
    if (!activeModal) return;
    const { type, user } = activeModal;
    setActionBusy(true);
    try {
      if (type === 'suspend') {
        if (!modalReason.trim()) throw new Error('A reason is required to suspend an account.');
        await suspendUser(user.id, modalReason.trim());
      } else if (type === 'blacklist') {
        if (!modalReason.trim()) throw new Error('A reason is required to blacklist an account.');
        await blacklistUser(user.id, modalReason.trim());
      } else if (type === 'verify') {
        await setVerificationStatus(user.id, modalStatus, modalReason.trim() || `Marked as ${modalStatus} by admin`);
      }
      setActiveModal(null);
      setModalReason('');
      fetchUsers();
    } catch (err: any) {
      alert(err?.message || 'Operation failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async (user: User) => {
    if (!confirm(`Restore ${user.name}'s account to active standing?`)) return;
    try {
      await restoreUser(user.id);
      fetchUsers();
    } catch (err: any) {
      alert(err?.message || 'Failed to restore user.');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await exportUsersCSV(exportProOnly);
      if (!res.ok) throw new Error('CSV export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topx-users-export${exportProOnly ? '-pro-members' : ''}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + (err?.message || 'Error'));
    }
  };

  return (
    <AdminLayout
      title="User Management & Verification"
      searchValue={search}
      onSearchChange={(val) => { setSearch(val); setPage(1); }}
      searchPlaceholder="Search by name, email, UID, or handle..."
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '2px' }}>
            Member Directory & Governance ({total.toLocaleString()} Records)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Search, inspect platform handles, verify contest profiles, and apply administrative controls.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={exportProOnly} onChange={event => setExportProOnly(event.target.checked)} />
            Export Pro members only
          </label>
          <button type="button" className="btn btn-secondary" onClick={() => fetchUsers()}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={handleExportCSV}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={yearFilter}
          onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Years</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </select>

        <select
          className="form-select"
          value={branchFilter}
          onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Branches</option>
          <option value="CSE">CSE</option>
          <option value="CS-DS">CS-DS</option>
          <option value="CS-AI">CS-AI</option>
          <option value="IT">IT</option>
          <option value="ECE">ECE</option>
          <option value="EE">EE</option>
          <option value="ME">ME</option>
        </select>

        <select
          className="form-select"
          value={sectionFilter}
          onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Sections</option>
          <option value="A">Section A</option>
          <option value="B">Section B</option>
          <option value="C">Section C</option>
          <option value="D">Section D</option>
        </select>

        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Account Statuses</option>
          <option value="active">Active Only</option>
          <option value="suspended">Suspended</option>
          <option value="blacklisted">Blacklisted</option>
        </select>

        <select
          className="form-select"
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Platforms</option>
          <option value="leetcode">Has LeetCode</option>
          <option value="codeforces">Has Codeforces</option>
          <option value="codechef">Has CodeChef</option>
        </select>

        <select
          className="form-select"
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
        >
          <option value="25">25 per page</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
        </select>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--danger-soft)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger)',
          marginBottom: '18px',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      {/* User Table */}
      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className={sortBy === 'name' ? 'sorted' : ''}>
                  User Profile <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                </th>
                <th onClick={() => handleSort('college')} className={sortBy === 'college' ? 'sorted' : ''}>
                  Academic Info <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                </th>
                <th>Connected Handles</th>
                <th onClick={() => handleSort('totalUniqueSolved')} className={sortBy === 'totalUniqueSolved' ? 'sorted' : ''}>
                  Solved / Streak <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                </th>
                <th>Status</th>
                <th>Verification</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                    Querying member records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    No members match the query or filter criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} />
                          ) : (
                            u.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Link href={`/users/${u.id}`} className="user-name" style={{ color: 'var(--text-primary)' }}>
                              {u.name}
                            </Link>
                            {u.isPro && <span className="badge pro">PRO</span>}
                          </div>
                          <div className="user-email">{u.email}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ID: {u.id.slice(0, 14)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                        {u.college || '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {[
                          u.academicYear ? `${u.academicYear.toUpperCase()} YR` : '',
                          u.branch || '',
                          u.section ? `Sec ${u.section}` : ''
                        ].filter(Boolean).join(' • ') || 'No academic tags'}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {u.handles?.leetcode ? (
                          <a
                            href={`https://leetcode.com/u/${u.handles.leetcode}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="badge leetcode"
                            title={`LeetCode: ${u.handles.leetcode}`}
                          >
                            LC: {u.handles.leetcode}
                            <ExternalLink size={10} style={{ marginLeft: '2px' }} />
                          </a>
                        ) : null}

                        {u.handles?.codeforces ? (
                          <a
                            href={`https://codeforces.com/profile/${u.handles.codeforces}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="badge codeforces"
                            title={`Codeforces: ${u.handles.codeforces}`}
                          >
                            CF: {u.handles.codeforces}
                            <ExternalLink size={10} style={{ marginLeft: '2px' }} />
                          </a>
                        ) : null}

                        {u.handles?.codechef ? (
                          <a
                            href={`https://www.codechef.com/users/${u.handles.codechef}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="badge codechef"
                            title={`CodeChef: ${u.handles.codechef}`}
                          >
                            CC: {u.handles.codechef}
                            <ExternalLink size={10} style={{ marginLeft: '2px' }} />
                          </a>
                        ) : null}

                        {!u.handles?.leetcode && !u.handles?.codeforces && !u.handles?.codechef && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>None</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>
                        {u.totalUniqueSolved} solved
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--warning)' }}>
                        <Flame size={12} />
                        <span>{u.currentStreak}d streak ({u.totalActiveDays}d total)</span>
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${u.accountStatus}`}>
                        {u.accountStatus.toUpperCase()}
                      </span>
                    </td>

                    <td>
                      <span className={`badge ${u.verificationStatus}`}>
                        {u.verificationStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <Link
                          href={`/users/${u.id}`}
                          className="btn btn-secondary btn-sm"
                          title="View Full Profile and Audit Trail"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </Link>

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setActiveModal({ type: 'verify', user: u });
                            setModalStatus(u.verificationStatus || 'verified');
                            setModalReason('');
                          }}
                          title="Review verification"
                        >
                          <CheckCircle2 size={13} />
                        </button>

                        {u.accountStatus === 'active' ? (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              setActiveModal({ type: 'suspend', user: u });
                              setModalReason('');
                            }}
                            title="Suspend user"
                          >
                            <ShieldAlert size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => handleRestore(u)}
                            title="Restore active status"
                          >
                            Restore
                          </button>
                        )}
                        {u.accountStatus !== 'blacklisted' && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              setActiveModal({ type: 'blacklist', user: u });
                              setModalReason('');
                            }}
                            title="Blacklist user"
                            aria-label={`Blacklist ${u.name}`}
                          >
                            <UserX size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="pagination">
          <div>
            Showing {users.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of {total} members
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ padding: '0 8px', fontSize: '12px' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="pagination-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Moderation / Verification Action Modal */}
      {activeModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">
                {activeModal.type === 'suspend' && `Suspend ${activeModal.user.name}`}
                {activeModal.type === 'blacklist' && `Blacklist ${activeModal.user.name}`}
                {activeModal.type === 'verify' && `Verify Handles for ${activeModal.user.name}`}
              </h3>
            </div>
            <div className="modal-body">
              {activeModal.type === 'verify' && (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Review Status</label>
                  <select
                    className="form-select"
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                  >
                    <option value="verified">Verified (Approved)</option>
                    <option value="needs_review">Needs Review</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  {activeModal.type === 'verify' ? 'Reviewer Audit Notes / Reason' : 'Required Justification (Audit Log)'}
                </label>
                <textarea
                  className="form-textarea"
                  placeholder={
                    activeModal.type === 'verify'
                      ? 'Note why handle was approved or requested review...'
                      : 'State explicit justification for account restriction...'
                  }
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveModal(null)}
                disabled={actionBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${activeModal.type === 'verify' ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleActionSubmit}
                disabled={actionBusy || (activeModal.type !== 'verify' && !modalReason.trim())}
              >
                {actionBusy ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
