'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '../../src/components/AdminLayout';
import { getTasks, getTaskProgress, createTask, updateTask, deleteTask } from '../../src/services/api';
import { DailyTask, TaskProgress } from '../../src/types';
import { 
  CalendarCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Download,
  Globe,
  Tag,
  BookOpen,
  Users
} from 'lucide-react';

export default function TasksPage() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<TaskProgress | null>(null);
  const [progressError, setProgressError] = useState('');
  const [proOnly, setProOnly] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    platform: 'LeetCode' as 'LeetCode' | 'Codeforces' | 'CodeChef' | 'Custom',
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    points: 50,
    problemCode: '',
    url: '',
    status: 'published' as 'draft' | 'scheduled' | 'published' | 'expired',
    publishAt: '',
    expiresAt: '',
    description: '',
    tags: '',
    targetAudience: 'Everyone',
    editorialUrl: '',
  });

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    setProgressError('');
    try {
      const res = await getTasks();
      setTasks(res.tasks || res || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch daily coding challenges.');
    } finally {
      setLoading(false);
    }
    try {
      setProgress(await getTaskProgress(proOnly ? { proOnly: 'true' } : {}));
    } catch (err: any) {
      setProgressError(err?.message || 'Could not load weekly task completion counts.');
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const openCreateModal = () => {
    setEditingTask(null);
    const now = new Date();
    // Default expiration: midnight or 2:00 AM next day IST
    const tomorrowMidnight = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    tomorrowMidnight.setHours(23, 59, 0, 0);

    setFormData({
      title: '',
      platform: 'LeetCode',
      difficulty: 'Medium',
      points: 50,
      problemCode: '',
      url: '',
      status: 'published',
      publishAt: now.toISOString().slice(0, 16),
      expiresAt: tomorrowMidnight.toISOString().slice(0, 16),
      description: '',
      tags: 'Algorithms, Data Structures',
      targetAudience: 'Everyone',
      editorialUrl: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: DailyTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      platform: task.platform || 'LeetCode',
      difficulty: task.difficulty || 'Medium',
      points: task.points || 50,
      problemCode: task.problemCode || '',
      url: task.url || '',
      status: task.status || 'published',
      publishAt: task.publishAt ? task.publishAt.slice(0, 16) : '',
      expiresAt: task.expiresAt ? task.expiresAt.slice(0, 16) : '',
      description: task.description || '',
      tags: Array.isArray(task.tags) ? task.tags.join(', ') : '',
      targetAudience: task.targetAudience || 'Everyone',
      editorialUrl: task.editorialUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Task title is required.');
      return;
    }
    if (!formData.url.trim() || !/^https:\/\//i.test(formData.url.trim())) {
      alert('A valid HTTPS problem URL is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        title: formData.title.trim(),
        url: formData.url.trim(),
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        editorialUrl: formData.editorialUrl.trim() || undefined,
        points: Number(formData.points) || 50,
      };

      if (editingTask) {
        await updateTask(editingTask.id, payload);
      } else {
        await createTask(payload);
      }

      setIsModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      alert(err?.message || 'Failed to save task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (task: DailyTask) => {
    if (!confirm(`Are you sure you want to retire and delete task "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      fetchTasks();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete task.');
    }
  };

  const handleProOnlyChange = async (checked: boolean) => {
    setProOnly(checked);
    setProgressError('');
    try {
      setProgress(await getTaskProgress(checked ? { proOnly: 'true' } : {}));
    } catch (err: any) {
      setProgressError(err?.message || 'Could not load weekly task completion counts.');
    }
  };

  const handleExportWeeklyCsv = async () => {
    setExportingCsv(true);
    try {
      const response = await fetch(`/api/admin/export/users${proOnly ? '?proOnly=true' : ''}`, { credentials: 'same-origin' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `CSV export failed (${response.status}).`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `topx-weekly-tasks${proOnly ? '-pro-members' : ''}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || 'Could not export weekly task CSV.');
    } finally {
      setExportingCsv(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  return (
    <AdminLayout title="Daily Coding Challenges & Scheduling">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '2px' }}>
            Daily Problem Tasks & Timed Expirations
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
            Curate daily competitive problems, set publication & midnight expiration windows (Timezone: Asia/Kolkata).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={fetchTasks}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={15} />
            <span>Create Daily Challenge</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses ({tasks.length})</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="draft">Drafts</option>
          <option value="expired">Expired</option>
        </select>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          System Clock: Asia/Kolkata (IST, UTC+5:30)
        </span>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <section style={{ marginBottom: '24px' }} aria-labelledby="weekly-progress-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <div>
            <h2 id="weekly-progress-title" style={{ fontSize: '17px', fontWeight: 800, marginBottom: '4px' }}>
              Weekly Task Progress
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              Verified task questions completed in the last 7 days.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: 'var(--text-secondary)', fontSize: '12.5px', cursor: 'pointer' }}>
              <input type="checkbox" checked={proOnly} onChange={event => handleProOnlyChange(event.target.checked)} />
              Pro members only
            </label>
            <button type="button" className="btn btn-secondary" onClick={handleExportWeeklyCsv} disabled={exportingCsv}>
              <Download size={14} />
              <span>{exportingCsv ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {progressError && (
          <div role="alert" style={{ padding: '12px 16px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '12px', fontSize: '13px' }}>
            {progressError}
          </div>
        )}

        {progress && (
          <>
            <div className="stats-grid" style={{ marginBottom: '16px' }}>
              <div className="stat-card accent">
                <div className="stat-icon accent"><CheckCircle2 size={20} /></div>
                <div className="stat-value">{progress.totalCompletions.toLocaleString()}</div>
                <div className="stat-label">Questions Completed This Week</div>
              </div>
              <div className="stat-card success">
                <div className="stat-icon success"><Users size={20} /></div>
                <div className="stat-value">{progress.participatingMembers.toLocaleString()}</div>
                <div className="stat-label">Members Who Participated</div>
              </div>
              <div className="stat-card info">
                <div className="stat-icon info"><BookOpen size={20} /></div>
                <div className="stat-value">{progress.totalTasks.toLocaleString()}</div>
                <div className="stat-label">Tracked Questions</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '16px' }}>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Completions by Question</span>
                  <span className="badge active">Last 7 Days</span>
                </div>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Question</th><th>Platform</th><th>Members Completed</th></tr></thead>
                    <tbody>
                      {progress.tasks.length === 0 ? (
                        <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No tasks are being tracked.</td></tr>
                      ) : progress.tasks.map((task) => (
                        <tr key={task.id}>
                          <td>{task.title}</td>
                          <td>{task.platform}</td>
                          <td><strong>{task.completedCount}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Questions Completed by Member</span>
                  <span className="badge active">{progress.members.length} participants</span>
                </div>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Member</th><th>Questions This Week</th></tr></thead>
                    <tbody>
                      {progress.members.length === 0 ? (
                        <tr><td colSpan={2} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No verified task completions in the last 7 days.</td></tr>
                      ) : progress.members.map((member) => (
                        <tr key={member.id}>
                          <td><Link href={`/users/${encodeURIComponent(member.id)}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>{member.name}</Link></td>
                          <td><strong>{member.completedCount}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Task List Table */}
      <div className="card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Challenge Title</th>
                <th>Platform</th>
                <th>Difficulty</th>
                <th>Points</th>
                <th>Schedule & Boundaries (IST)</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                    Loading scheduled challenges...
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    No daily tasks found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{t.title}</div>
                      {t.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.description}
                        </div>
                      )}
                      {t.tags && t.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          {t.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} style={{ fontSize: '9.5px', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td>
                      <span className={`badge ${t.platform ? t.platform.toLowerCase() : 'draft'}`}>
                        {t.platform || 'Custom'}
                      </span>
                    </td>

                    <td>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: t.difficulty === 'Easy' ? 'var(--success)' : t.difficulty === 'Medium' ? 'var(--warning)' : 'var(--danger)'
                      }}>
                        {t.difficulty}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontWeight: 700 }}>{t.points} pts</span>
                    </td>

                    <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      <div>
                        <strong>Pub:</strong> {t.publishAt ? new Date(t.publishAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' }) : 'Immediate'}
                      </div>
                      <div>
                        <strong>Exp:</strong> {t.expiresAt ? new Date(t.expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' }) : 'No expiration'}
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${t.status || 'published'}`}>
                        {(t.status || 'published').toUpperCase()}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {t.url && (
                          <a
                            href={t.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                            title="Open problem link"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(t)}
                          title="Edit Task"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(t)}
                          title="Delete Task"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingTask ? 'Edit Daily Coding Challenge' : 'Schedule New Daily Challenge'}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Challenge Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Subarray Sum Equals K"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row" style={{ marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Platform</label>
                    <select
                      className="form-select"
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                    >
                      <option value="LeetCode">LeetCode</option>
                      <option value="Codeforces">Codeforces</option>
                      <option value="CodeChef">CodeChef</option>
                      <option value="Custom">Custom Source</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select
                      className="form-select"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Points Awarded</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                      min={10}
                      max={500}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Problem URL (HTTPS) *</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://leetcode.com/problems/..."
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row" style={{ marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Publish At (IST)</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={formData.publishAt}
                      onChange={(e) => setFormData({ ...formData, publishAt: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expires At (Midnight/Boundary IST)</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Lifecycle Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="published">Published (Active)</option>
                      <option value="scheduled">Scheduled for Future</option>
                      <option value="draft">Draft (Hidden)</option>
                      <option value="expired">Expired (Closed)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Audience</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Everyone or specific batch"
                      value={formData.targetAudience}
                      onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Topic Tags (Comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Prefix Sum, Hash Map, Arrays"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Editorial / Solution Walkthrough URL (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={formData.editorialUrl}
                    onChange={(e) => setFormData({ ...formData, editorialUrl: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Task Instructions / Hints</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Optional hints or problem constraints..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingTask ? 'Save Updates' : 'Publish Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
