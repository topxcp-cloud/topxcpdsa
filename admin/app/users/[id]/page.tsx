'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../src/components/AdminLayout';
import { 
  getUser, 
  suspendUser, 
  restoreUser, 
  blacklistUser, 
  deleteUser, 
  addModerationNote, 
  setVerificationStatus,
  togglePro 
} from '../../../src/services/api';
import { User, AuditEntry, VerificationData } from '../../../src/types';
import { 
  ArrowLeft, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  Flame, 
  Award, 
  Clock, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle,
  FileText,
  UserX,
  History
} from 'lucide-react';

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Note input
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Verification form
  const [verStatus, setVerStatus] = useState<string>('verified');
  const [verReason, setVerReason] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Destructive modal
  const [confirmModal, setConfirmModal] = useState<{
    action: 'suspend' | 'blacklist' | 'delete';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const fetchUser = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUser(userId);
      setUser(data.user);
      setVerification(data.verification);
      setAuditHistory(data.auditHistory || []);
      if (data.verification?.status) {
        setVerStatus(data.verification.status);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load user profile from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const handleTogglePro = async () => {
    if (!user) return;
    try {
      const res = await togglePro(user.id, !user.isPro);
      setUser({ ...user, isPro: res.user.isPro });
    } catch (err: any) {
      alert(err?.message || 'Failed to update Pro status.');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !user) return;
    setSubmittingNote(true);
    try {
      const res = await addModerationNote(user.id, newNote.trim());
      setUser({ ...user, moderationNotes: res.notes });
      setNewNote('');
    } catch (err: any) {
      alert(err?.message || 'Failed to record moderation note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setVerifying(true);
    try {
      const res = await setVerificationStatus(user.id, verStatus, verReason.trim() || `Set to ${verStatus}`);
      setVerification(res.verification);
      setUser({ ...user, verificationStatus: verStatus as any });
      setVerReason('');
      fetchUser();
    } catch (err: any) {
      alert(err?.message || 'Failed to save verification status.');
    } finally {
      setVerifying(false);
    }
  };

  const handleDestructiveAction = async () => {
    if (!confirmModal || !user) return;
    if (!actionReason.trim()) {
      alert('A valid reason is required for account restrictions and deletions.');
      return;
    }
    setActionBusy(true);
    try {
      if (confirmModal.action === 'suspend') {
        await suspendUser(user.id, actionReason.trim());
        setConfirmModal(null);
        fetchUser();
      } else if (confirmModal.action === 'blacklist') {
        await blacklistUser(user.id, actionReason.trim());
        setConfirmModal(null);
        fetchUser();
      } else if (confirmModal.action === 'delete') {
        await deleteUser(user.id, actionReason.trim());
        alert('User account soft-deleted and archived.');
        router.push('/users');
      }
    } catch (err: any) {
      alert(err?.message || 'Action failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!user) return;
    if (!confirm(`Restore account standing for ${user.name}?`)) return;
    try {
      await restoreUser(user.id);
      fetchUser();
    } catch (err: any) {
      alert(err?.message || 'Failed to restore user.');
    }
  };

  return (
    <AdminLayout title="User Profile Dossier">
      <div style={{ marginBottom: '20px' }}>
        <Link href="/users" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', gap: '6px' }}>
          <ArrowLeft size={14} />
          <span>Back to Member Directory</span>
        </Link>
      </div>

      {error && (
        <div style={{
          padding: '14px 18px',
          background: 'var(--danger-soft)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger)',
          marginBottom: '20px',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-screen">
          <div className="spinner lg"></div>
          <div>Loading user database records and telemetry...</div>
        </div>
      ) : !user ? (
        <div className="empty-state">
          <div className="empty-state-title">User Not Found</div>
          <div className="empty-state-desc">The requested user ID does not exist in the active user records.</div>
        </div>
      ) : (
        <>
          {/* Header Card */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-body">
              <div className="user-detail-header" style={{ marginBottom: 0 }}>
                <div className="user-detail-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    user.name.slice(0, 2).toUpperCase()
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 className="user-detail-name">{user.name}</h2>
                    <span className={`badge ${user.accountStatus}`}>
                      {user.accountStatus.toUpperCase()}
                    </span>
                    {user.isPro ? (
                      <span className="badge pro">TOP-X PRO MEMBER</span>
                    ) : (
                      <span className="badge draft">STANDARD MEMBER</span>
                    )}
                    <span className={`badge ${user.verificationStatus || 'pending'}`}>
                      {(user.verificationStatus || 'pending').replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="user-detail-email">{user.email}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                    UID: {user.id}
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="action-panel" style={{ marginBottom: 0 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleTogglePro}
                  >
                    <Award size={14} />
                    <span>{user.isPro ? 'Revoke Pro' : 'Grant Pro'}</span>
                  </button>

                  {user.accountStatus === 'active' ? (
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={() => { setConfirmModal({ action: 'suspend' }); setActionReason(''); }}
                    >
                      <ShieldAlert size={14} />
                      <span>Suspend</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={handleRestore}
                    >
                      <ShieldCheck size={14} />
                      <span>Restore Account</span>
                    </button>
                  )}

                  {user.accountStatus !== 'blacklisted' && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => { setConfirmModal({ action: 'blacklist' }); setActionReason(''); }}
                    >
                      <UserX size={14} />
                      <span>Blacklist</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => { setConfirmModal({ action: 'delete' }); setActionReason(''); }}
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Status Reason Callout if suspended or blacklisted */}
              {user.accountStatus === 'suspended' && user.suspendedReason && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--warning-soft)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: 'var(--warning)' }}>
                  <strong>Suspension Reason:</strong> {user.suspendedReason}
                  {user.suspendedAt && <span style={{ marginLeft: '8px', opacity: 0.8 }}>({new Date(user.suspendedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})</span>}
                </div>
              )}
              {user.accountStatus === 'blacklisted' && user.blacklistedReason && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: 'var(--danger)' }}>
                  <strong>Blacklist Reason:</strong> {user.blacklistedReason}
                  {user.blacklistedAt && <span style={{ marginLeft: '8px', opacity: 0.8 }}>({new Date(user.blacklistedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})</span>}
                </div>
              )}
            </div>
          </div>

          {/* Grid: Academic Info & Coding Handles */}
          <div className="user-detail-grid" style={{ marginBottom: '20px' }}>
            {/* Academic & Registration Data */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Academic & Institutional Records</span>
                <span className="badge active">Supabase DB</span>
              </div>
              <div className="card-body">
                <div className="detail-field">
                  <span className="detail-field-label">Institution / College</span>
                  <span className="detail-field-value">{user.college || 'Not configured'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Academic Year</span>
                  <span className="detail-field-value">{user.academicYear ? `${user.academicYear.toUpperCase()} YEAR` : 'Not specified'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Branch / Department</span>
                  <span className="detail-field-value">{user.branch || 'Not specified'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Section / Class</span>
                  <span className="detail-field-value">{user.section || user.classDivision || 'Not specified'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Profile Completed</span>
                  <span className="detail-field-value">
                    {user.profileComplete ? (
                      <span style={{ color: 'var(--success)' }}>Complete (100%)</span>
                    ) : (
                      <span style={{ color: 'var(--warning)' }}>Incomplete</span>
                    )}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Registered Date</span>
                  <span className="detail-field-value">
                    {user.createdAt ? new Date(user.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Unknown'}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Last Synced Activity</span>
                  <span className="detail-field-value">
                    {user.lastSyncedAt ? new Date(user.lastSyncedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never synced'}
                  </span>
                </div>
              </div>
            </div>

            {/* Coding Platform Handles & Verification */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Coding Handles & Public Verification</span>
                <span className="badge active">Live URLs</span>
              </div>
              <div className="card-body">
                <div className="detail-field">
                  <span className="detail-field-label">LeetCode Handle</span>
                  <span className="detail-field-value">
                    {user.handles?.leetcode ? (
                      <a href={`https://leetcode.com/u/${user.handles.leetcode}/`} target="_blank" rel="noopener noreferrer">
                        {user.handles.leetcode} <ExternalLink size={11} style={{ display: 'inline' }} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Not linked</span>
                    )}
                  </span>
                </div>

                <div className="detail-field">
                  <span className="detail-field-label">Codeforces Handle</span>
                  <span className="detail-field-value">
                    {user.handles?.codeforces ? (
                      <a href={`https://codeforces.com/profile/${user.handles.codeforces}`} target="_blank" rel="noopener noreferrer">
                        {user.handles.codeforces} <ExternalLink size={11} style={{ display: 'inline' }} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Not linked</span>
                    )}
                  </span>
                </div>

                <div className="detail-field">
                  <span className="detail-field-label">CodeChef Handle</span>
                  <span className="detail-field-value">
                    {user.handles?.codechef ? (
                      <a href={`https://www.codechef.com/users/${user.handles.codechef}`} target="_blank" rel="noopener noreferrer">
                        {user.handles.codechef} <ExternalLink size={11} style={{ display: 'inline' }} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Not linked</span>
                    )}
                  </span>
                </div>

                <div className="detail-field">
                  <span className="detail-field-label">Total Unique Solved</span>
                  <span className="detail-field-value" style={{ color: 'var(--accent)', fontSize: '15px' }}>
                    {user.totalUniqueSolved} Problems
                  </span>
                </div>

                <div className="detail-field">
                  <span className="detail-field-label">Current Streak</span>
                  <span className="detail-field-value" style={{ color: 'var(--warning)' }}>
                    <Flame size={13} style={{ display: 'inline', marginRight: '4px' }} />
                    {user.currentStreak} Days
                  </span>
                </div>

                <div className="detail-field">
                  <span className="detail-field-label">Longest Streak</span>
                  <span className="detail-field-value">{user.longestStreak} Days</span>
                </div>

                <div className="detail-field">
                  <span className="detail-field-label">Total Active Days</span>
                  <span className="detail-field-value">{user.totalActiveDays} Days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Workflow & Moderation Notes */}
          <div className="user-detail-grid" style={{ marginBottom: '20px' }}>
            {/* Handle Verification Review Box */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Handle Verification Review</span>
                <span className={`badge ${user.verificationStatus || 'pending'}`}>
                  {(user.verificationStatus || 'pending').toUpperCase()}
                </span>
              </div>
              <div className="card-body">
                <form onSubmit={handleVerificationSubmit}>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Review Status</label>
                    <select
                      className="form-select"
                      value={verStatus}
                      onChange={(e) => setVerStatus(e.target.value)}
                    >
                      <option value="verified">Verified (Approved)</option>
                      <option value="needs_review">Needs Review</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label">Review Justification / Auditor Notes</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Explain verification decision based on public profile examination..."
                      value={verReason}
                      onChange={(e) => setVerReason(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={verifying}
                  >
                    {verifying ? 'Updating...' : 'Record Verification Decision'}
                  </button>
                </form>

                {verification && (
                  <div style={{ marginTop: '16px', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Last Reviewed: {new Date(verification.reviewedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </div>
                    {verification.reason && <div><strong>Note:</strong> {verification.reason}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* Internal Moderation Notes */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Internal Moderation Notes ({user.moderationNotes?.length || 0})</span>
              </div>
              <div className="card-body">
                <form onSubmit={handleAddNote} style={{ marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <textarea
                      className="form-textarea"
                      placeholder="Add an internal moderation note (only visible to administrators)..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-secondary btn-sm"
                    disabled={submittingNote || !newNote.trim()}
                  >
                    {submittingNote ? 'Saving...' : 'Add Note'}
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {(!user.moderationNotes || user.moderationNotes.length === 0) ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No internal notes recorded yet.</div>
                  ) : (
                    user.moderationNotes.map((note) => (
                      <div key={note.id} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                        <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{note.text}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {new Date(note.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail for this User */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={16} style={{ color: 'var(--accent)' }} />
                <span className="card-title">Administrative Audit Trail ({auditHistory.length} events)</span>
              </div>
            </div>
            <div className="card-body no-pad">
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Reason / Notes</th>
                      <th>Timestamp (Asia/Kolkata)</th>
                      <th>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                          No administrative actions logged for this member.
                        </td>
                      </tr>
                    ) : (
                      auditHistory.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                              {item.action.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontSize: '12.5px' }}>{item.reason || '—'}</td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {new Date(item.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </td>
                          <td>
                            <span className="badge active" style={{ fontSize: '10.5px' }}>
                              {item.outcome.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal for Destructive Actions */}
      {confirmModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">
                {confirmModal.action === 'suspend' && 'Confirm Account Suspension'}
                {confirmModal.action === 'blacklist' && 'Confirm Account Blacklisting'}
                {confirmModal.action === 'delete' && 'Confirm Account Deletion'}
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                {confirmModal.action === 'suspend' && `Suspending ${user?.name} will temporarily block portal access and contest participation.`}
                {confirmModal.action === 'blacklist' && `Blacklisting ${user?.name} will strictly restrict this user from the platform.`}
                {confirmModal.action === 'delete' && `Are you sure you want to soft-delete ${user?.name}? Platform statistics and linked records will be archived.`}
              </p>

              <div className="form-group">
                <label className="form-label">Mandatory Audit Justification</label>
                <textarea
                  className="form-textarea"
                  placeholder="State the exact violation or justification for this action..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmModal(null)}
                disabled={actionBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDestructiveAction}
                disabled={actionBusy || !actionReason.trim()}
              >
                {actionBusy ? 'Executing...' : 'Confirm & Log Audit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
