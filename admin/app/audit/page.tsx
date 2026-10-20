'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '../../src/components/AdminLayout';
import { getAuditLog } from '../../src/services/api';
import { AuditEntry } from '../../src/types';
import { 
  ShieldAlert, 
  RefreshCw, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Search,
  Filter
} from 'lucide-react';

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      };
      if (actionFilter !== 'all') params.action = actionFilter;

      const res = await getAuditLog(params);
      setEntries(res.entries || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve administrative audit log.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const getActionBadgeClass = (action: string) => {
    if (action.includes('suspend') || action.includes('blacklist') || action.includes('delete')) {
      return 'badge suspended';
    }
    if (action.includes('restore') || action.includes('verified')) {
      return 'badge active';
    }
    return 'badge draft';
  };

  return (
    <AdminLayout title="Security & Governance Audit Trail">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '2px' }}>
            Administrative Audit Trail ({total} Events)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Immutable chronological logging of all privileged administrative decisions, suspensions, and verifications.
          </p>
        </div>

        <button type="button" className="btn btn-secondary" onClick={fetchAudit}>
          <RefreshCw size={14} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Administrative Actions</option>
          <option value="suspend">Suspensions</option>
          <option value="restore">Restorations</option>
          <option value="blacklist">Blacklists</option>
          <option value="delete">Deletions</option>
          <option value="verification_verified">Verifications (Approved)</option>
          <option value="verification_needs_review">Needs Review Flags</option>
          <option value="verification_rejected">Rejections</option>
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
        <div style={{ padding: '12px 16px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Action Type</th>
                <th>Target Member</th>
                <th>Audit Reason / Justification</th>
                <th>Timestamp (Asia/Kolkata)</th>
                <th style={{ textAlign: 'right' }}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                    Querying audit records...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    No audit events match the selected criteria.
                  </td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className={getActionBadgeClass(item.action)}>
                        {item.action.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>

                    <td>
                      {item.targetUserId ? (
                        <div>
                          <Link href={`/users/${item.targetUserId}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.targetUserName || 'Member'}
                          </Link>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {item.targetUserId.slice(0, 16)}...
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>System Wide</span>
                      )}
                    </td>

                    <td style={{ fontSize: '12.5px', maxWidth: '360px' }}>
                      <div style={{ wordBreak: 'break-word' }}>
                        {item.reason || 'No justification recorded.'}
                      </div>
                    </td>

                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(item.timestamp).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'medium'
                      })}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${item.outcome === 'success' ? 'active' : 'blacklisted'}`} style={{ fontSize: '10.5px' }}>
                        {item.outcome.toUpperCase()}
                      </span>
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
            Showing {entries.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of {total} audit records
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
    </AdminLayout>
  );
}
