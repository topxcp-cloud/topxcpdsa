import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';

export default function LeaderboardView({ active = false }) {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Loading live member leaderboard…');
  useEffect(() => {
    let alive = true;
    api('/api/leaderboard').then(data => {
      if (!alive) return;
      setMembers(Array.isArray(data.members) ? data.members : []);
      setStatus(data.members?.length ? '' : 'No member statistics yet. Members appear after they register and sync a platform.');
    }).catch(error => { if (alive) setStatus(error.message || 'Leaderboard is unavailable.'); });
    const refresh = () => api('/api/leaderboard').then(data => alive && setMembers(Array.isArray(data.members) ? data.members : [])).catch(() => {});
    window.addEventListener('topx:profile-updated', refresh);
    return () => { alive = false; window.removeEventListener('topx:profile-updated', refresh); };
  }, []);
  const visible = useMemo(() => members.filter(member => String(member.n || '').toLowerCase().includes(query.toLowerCase())), [members, query]);
  const podium = visible.slice(0, 3);
  return (
    <section className={`tab-view ${active ? 'active' : ''}`} id="view-leaderboard">
      <div className="bs-sort-banner"><div className="bs-sort-left"><h3>Bubble<br />Sort 3D</h3><p>Score bubbles swap with their neighbors until the biggest one rises to rank 1. Watch real-time comparison physics live.</p><div className="bs-sort-controls"><button className="bs-ctl-btn" id="lb-bs-pz">Pause</button><button className="bs-ctl-btn" id="lb-bs-sp">Speed 1x</button><button className="bs-ctl-btn" id="lb-bs-sh">Shuffle</button></div></div><div className="bs-stage-wrap"><canvas className="bs-stage-canvas" id="lb-bs-canvas" /><div className="bs-readout" id="lb-bs-ro">ready</div></div></div>
      <div className="view-wrap"><div className="section-head"><h2>College Leaderboard</h2><p className="sub">Ranked by problems solved. Ties go to the longer streak.</p></div>
        <div className="lb-filter-bar"><div className="filter-btn-group" id="lb-scope-group" /><div className="sub-filter-group" id="lb-sub-group" /><div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'14px'}}><input value={query} onChange={e=>setQuery(e.target.value)} id="lb-search-input" placeholder="Search members by name..." style={{padding:'6px 12px',fontSize:'13px',border:'1px solid var(--line)',borderRadius:'4px',background:'var(--card)',outline:'none',width:'240px'}}/><span className="lb-student-count num" id="lb-count-txt">{visible.length} members</span></div></div>
        <div className="lb-podium" id="lb-podium-wrap">{podium.map((member,index)=><div className={`lb-podium-card podium-${index+1}`} key={member.id}><span className="lb-podium-rank">#{index+1}</span><strong>{member.n}</strong><span>{Number(member.s)||0} solved</span><small>{Number(member.k)||0} rating</small></div>)}</div>
        {status && <p className="sm" role="status">{status}</p>}
        <div className="lb-table-wrap"><table className="lb-table"><thead><tr><th>Rank</th><th>Name</th><th>Membership</th><th>Problems Solved</th><th>Rating</th><th>Status</th></tr></thead><tbody id="lb-tbody">{visible.map((member,index)=><tr key={member.id}><td>{index+1}</td><td>{member.n || 'Member'}</td><td>{member.isPro ? 'TOP-X Pro' : 'Member'}</td><td>{Number(member.s)||0}</td><td>{Number(member.k)||0}</td><td>{member.streak ? `${member.streak} day streak` : 'Getting started'}</td></tr>)}</tbody></table></div>
      </div>
    </section>
  );
}
