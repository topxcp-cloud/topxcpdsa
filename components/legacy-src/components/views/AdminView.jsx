import { useCallback, useEffect, useState } from 'react';

async function adminApi(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers, credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}
const blankTask = { title:'', platform:'LeetCode', difficulty:'Medium', points:50, problemCode:'', url:'' };
const blankResource = { title:'', type:'Article', time:'10 min', link:'', desc:'' };
const blankProblem = { title:'', url:'', categoryName:'Arrays', difficulty:2, slug:'', companies:'', intuition:'' };
export default function AdminView({ active = false }) {
  const [token, setToken] = useState(false);
  const [key, setKey] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [tasks, setTasks] = useState([]); const [resources, setResources] = useState([]); const [problems, setProblems] = useState([]); const [users, setUsers] = useState([]);
  const [task, setTask] = useState(blankTask); const [resource, setResource] = useState(blankResource); const [problem, setProblem] = useState(blankProblem); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [t,r,p,u] = await Promise.all([
        adminApi('/api/admin/tasks'), adminApi('/api/admin/resources'),
        adminApi('/api/admin/vault/problems'), adminApi('/api/admin/overview')
      ]);
      setTasks(t.tasks || []); setResources(r.resources || []); setProblems(p.problems || []); setUsers(u.users || []); setError('');
    } catch(e) { setError(e.message); }
  }, [token]);
  useEffect(() => {
    adminApi('/api/admin/overview')
      .then(() => setToken(true))
      .catch(error => { if (error.status !== 401) setError(error.message); });
  }, []);
  useEffect(() => { if (token) load(); }, [token,load]);
  const login = async e => { e.preventDefault(); setBusy(true); setError(''); try { await adminApi('/api/admin/login',{method:'POST',body:JSON.stringify({key})}); setToken(true); setKey(''); setNotice('Admin session started.'); } catch(e){setError(e.message);} finally{setBusy(false);} };
  const logout = async () => { try { await adminApi('/api/admin/logout',{method:'POST'}); setToken(false); setTasks([]); setResources([]); setProblems([]); setUsers([]); setNotice('Admin signed out.'); } catch(e){setError(e.message);} };
  const submit = async (e, endpoint, payload, reset) => { e.preventDefault(); setBusy(true); setError(''); setNotice(''); try { await adminApi(endpoint,{method:'POST',body:JSON.stringify(payload)}); reset(); await load(); setNotice('Saved successfully.'); } catch(e){setError(e.message);} finally{setBusy(false);} };
  const remove = async (endpoint) => { if(!window.confirm('Remove this item? This cannot be undone.')) return; try { await adminApi(endpoint,{method:'DELETE'}); await load(); setNotice('Item removed.'); } catch(e){setError(e.message);} };
  return <section className={`tab-view ${active?'active':''}`} id="view-admin"><div className="view-wrap admin-wrap">
    {!token ? <div className="admin-auth-box"><div className="admin-lock-icon">🔐</div><h3 style={{fontSize:22,fontWeight:700,marginBottom:8}}>Secure Admin Console</h3><p className="sm" style={{marginBottom:20}}>Protected portal to manage tasks, resources, problems and members.</p><form onSubmit={login} className="auth-field"><label htmlFor="admin-pass-input">Admin key</label><input id="admin-pass-input" type="password" value={key} onChange={e=>setKey(e.target.value)} autoComplete="current-password" required/><button className="btn-primary" disabled={busy} style={{width:'100%',justifyContent:'center'}}>{busy?'Authenticating…':'Authenticate as Admin'}</button></form><p className="sm" style={{marginTop:12,fontSize:12}}>Admin access is controlled by the deployment environment secret.</p>{error&&<p role="alert" className="sm" style={{color:'var(--hard)'}}>{error}</p>}</div> : <>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid var(--line)',paddingBottom:18,marginBottom:20}}><div><span className="phase-badge">AUTHENTICATED • ADMIN CONSOLE</span><h2 style={{marginTop:6}}>TOP-X System Management</h2></div><button className="bs-ctl-btn" onClick={logout} style={{color:'var(--hard)'}}>Sign Out Admin</button></div>
      {(error||notice)&&<p role={error?'alert':'status'} className="sm" style={{color:error?'var(--hard)':'var(--easy)',marginBottom:16}}>{error||notice}</p>}
      <div className="admin-stats-summary"><div className="admin-stat-card"><div className="val num">{users.length}</div><h5>Registered Members</h5></div><div className="admin-stat-card"><div className="val num">{users.filter(u=>u.isPro).length}</div><h5>Pro Members</h5></div><div className="admin-stat-card"><div className="val num">{tasks.length}</div><h5>Weekly Tasks</h5></div><div className="admin-stat-card"><div className="val num">{problems.length}</div><h5>Custom Vault Problems</h5></div></div>
      <div className="admin-panel-card"><h4>Add Weekly Task</h4><form onSubmit={e=>submit(e,'/api/admin/tasks',{...task,points:Number(task.points)},()=>setTask(blankTask))} className="admin-form-grid"><label>Task title<input required value={task.title} onChange={e=>setTask({...task,title:e.target.value})}/></label><label>Platform<select value={task.platform} onChange={e=>setTask({...task,platform:e.target.value})}><option>LeetCode</option><option>Codeforces</option><option>CodeChef</option></select></label><label>Difficulty<input value={task.difficulty} onChange={e=>setTask({...task,difficulty:e.target.value})}/></label><label>Points<input type="number" min="1" value={task.points} onChange={e=>setTask({...task,points:e.target.value})}/></label><label>Problem code<input value={task.problemCode} onChange={e=>setTask({...task,problemCode:e.target.value})}/></label><label>HTTPS problem URL<input type="url" required value={task.url} onChange={e=>setTask({...task,url:e.target.value})} placeholder="https://…"/></label><button className="btn-primary" disabled={busy}>Add task</button></form><div className="admin-manage-list">{tasks.map(t=><div className="menu-item" key={t.id}><span><b>{t.title}</b><small>{t.platform} · {t.points} XP</small></span><button className="bs-ctl-btn" onClick={()=>remove(`/api/admin/tasks/${encodeURIComponent(t.id)}`)}>Remove</button></div>)}</div></div>
      <div className="admin-panel-card"><h4>Add Resource / Guide</h4><form onSubmit={e=>submit(e,'/api/admin/resources',resource,()=>setResource(blankResource))} className="admin-form-grid"><label>Title<input required value={resource.title} onChange={e=>setResource({...resource,title:e.target.value})}/></label><label>Type<input value={resource.type} onChange={e=>setResource({...resource,type:e.target.value})}/></label><label>Reading time<input value={resource.time} onChange={e=>setResource({...resource,time:e.target.value})}/></label><label>HTTPS link<input type="url" required value={resource.link} onChange={e=>setResource({...resource,link:e.target.value})}/></label><label>Description<input value={resource.desc} onChange={e=>setResource({...resource,desc:e.target.value})}/></label><button className="btn-primary" disabled={busy}>Add resource</button></form><div className="admin-manage-list">{resources.map(r=><div className="menu-item" key={r.id}><span><b>{r.title}</b><small>{r.type} · {r.time}</small></span><button className="bs-ctl-btn" onClick={()=>remove(`/api/admin/resources/${encodeURIComponent(r.id)}`)}>Remove</button></div>)}</div></div>
      <div className="admin-panel-card"><h4>Add Problem Vault Entry</h4><form onSubmit={e=>submit(e,'/api/admin/vault/problems',{...problem,difficulty:Number(problem.difficulty),companies:problem.companies.split(',').map(s=>s.trim()).filter(Boolean)},()=>setProblem(blankProblem))} className="admin-form-grid"><label>Problem title<input required value={problem.title} onChange={e=>setProblem({...problem,title:e.target.value})}/></label><label>HTTPS problem URL<input type="url" required value={problem.url} onChange={e=>setProblem({...problem,url:e.target.value})}/></label><label>Category<input value={problem.categoryName} onChange={e=>setProblem({...problem,categoryName:e.target.value})}/></label><label>Difficulty<select value={problem.difficulty} onChange={e=>setProblem({...problem,difficulty:e.target.value})}><option value="1">Easy</option><option value="2">Medium</option><option value="3">Hard</option></select></label><label>Slug / ID<input value={problem.slug} onChange={e=>setProblem({...problem,slug:e.target.value})}/></label><label>Companies (comma-separated)<input value={problem.companies} onChange={e=>setProblem({...problem,companies:e.target.value})}/></label><label>Key intuition<input value={problem.intuition} onChange={e=>setProblem({...problem,intuition:e.target.value})}/></label><button className="btn-primary" disabled={busy}>Add vault problem</button></form><div className="admin-manage-list">{problems.map(p=><div className="menu-item" key={p.id}><span><b>{p.title}</b><small>{p.categoryName} · {['','Easy','Medium','Hard'][p.difficulty]}</small></span><button className="bs-ctl-btn" onClick={()=>remove(`/api/admin/vault/problems/${encodeURIComponent(p.id)}`)}>Remove</button></div>)}</div></div>
      <button className="bs-ctl-btn" onClick={()=>load()} disabled={busy}>↻ Refresh admin data</button>
    </>}
  </div></section>;
}
