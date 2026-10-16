import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function TasksView({ active = false, user = null }) {
  const [tasks, setTasks] = useState([]);
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (verify = false) => {
    if (!user?.id) { setTasks([]); setStatus('Sign in to view tasks assigned to your account.'); return; }
    setBusy(true); setStatus(verify ? 'Checking accepted submissions on connected platforms…' : 'Loading your tasks…');
    try {
      if (verify) {
        const checked = await api(`/api/tasks/verify-all/${encodeURIComponent(user.id)}`, { method: 'POST' });
        if (checked.streak) setStreak(checked.streak.current || 0);
      }
      const data = await api(`/api/tasks/daily/${encodeURIComponent(user.id)}`);
      setTasks(Array.isArray(data.tasks) ? data.tasks : []); setStreak(data.streak?.current || 0);
      setStatus(verify ? 'Submission verification finished. Only accepted submissions count as complete.' : '');
    } catch (error) { setStatus(error.message || 'Could not load daily tasks.'); }
    finally { setBusy(false); }
  }, [user?.id]);
  useEffect(() => { load(false); }, [load]);
  useEffect(() => { const refresh = () => load(true); window.addEventListener('topx:tasks-refresh', refresh); return () => window.removeEventListener('topx:tasks-refresh', refresh); }, [load]);
  const completed = tasks.filter(task => task.isCompleted || task.completed).length;
  const xp = tasks.filter(task => task.isCompleted || task.completed).reduce((sum, task) => sum + (Number(task.points) || 0), 0);
  return (
    <section className={`tab-view ${active ? 'active' : ''}`} id="view-tasks">
      <div className="view-wrap tasks-wrap"><div className="section-head" style={{paddingTop:0}}><h2>Daily Member Tasks</h2><p className="sub">Curated daily drills synced with LeetCode, Codeforces, and CodeChef. Completion is verified against platform submissions.</p></div>
        <div className="vault-progress-card" style={{marginBottom:24}}><div><h4 style={{fontSize:18,fontWeight:700}}>Today's Practice Quests</h4><span className="sm">Tasks and verification status are loaded from your TOP-X account.</span></div><div style={{display:'flex',gap:32,alignItems:'center',flexWrap:'wrap'}}><div><span className="sm">Completed:</span><b className="num" id="tasks-done-stat" style={{display:'block',fontSize:20,color:'var(--easy)'}}>{completed} / {tasks.length}</b></div><div><span className="sm">Daily Streak:</span><b className="num" id="tasks-streak-stat" style={{display:'block',fontSize:20,color:'var(--ac)'}}>{streak} days</b></div><div><span className="sm">XP Earned:</span><b className="num" id="tasks-xp-stat" style={{display:'block',fontSize:20,color:'var(--ink)'}}>{xp} XP</b></div></div><button className="btn-primary" id="btn-sync-all-tasks" disabled={busy} onClick={() => load(true)} style={{padding:'9px 18px',fontSize:13}}>{busy ? 'Verifying…' : '🔄 Verify & Refresh'}</button></div>
        {status && <p className="sm" role="status" style={{marginBottom:16}}>{status}</p>}
        <div className="tasks-cards-grid" id="tasks-cards-grid">{tasks.map(task => <article className="task-card" key={task.id}><div className="task-card-top"><span className="phase-badge">{task.platform || 'Practice'}</span><span className="sm">{task.isCompleted || task.completed ? '✓ Verified' : task.difficulty || 'Practice'}</span></div><h3>{task.title || task.name}</h3><p className="sm">{task.description || 'Open the original platform problem and submit an accepted solution.'}</p><div className="task-card-actions"><a className="btn-link" href={task.url || '#'} target="_blank" rel="noreferrer">Open problem ↗</a><strong>{Number(task.points)||0} XP</strong></div></article>)}</div>
        {!tasks.length && !busy && user?.id && <p className="sm">No tasks are assigned right now.</p>}
      </div>
    </section>
  );
}
