import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { ROADMAP_DSA_PHASES, ROADMAP_CP_TIERS } from '../../features/content/contentData.js';
import { api } from '../../lib/api.js';

function TrackTimeline({ phases, checked, onToggle }) {
  return <div className="roadmap-timeline">{phases.map(phase => <article className="roadmap-phase-card" key={phase.phase}>
    <div className="roadmap-phase-head"><span className="roadmap-phase-number">{phase.phase || phase.tier}</span><span className="sm">{phase.duration || phase.rating}</span></div>
    <h3>{phase.title}</h3><p>{phase.desc}</p><div className="roadmap-platforms">{phase.platforms?.map(platform => <span className="comp-chip" key={platform}>{platform}</span>)}</div>
    <div className="roadmap-milestones">{phase.milestones.map(m => <label key={m.id} className={`roadmap-milestone ${checked[m.id] ? 'is-complete' : ''}`}><input type="checkbox" checked={!!checked[m.id]} onChange={() => onToggle(m.id)} /><span className="roadmap-check"><Check size={13}/></span><span>{m.text}</span></label>)}</div>
    <div className="roadmap-target"><b>Target:</b> {phase.target}</div>
  </article>)}</div>;
}

function ProgressSummary({ phases, checked, onReset, label, signedIn }) {
  const total = phases.reduce((n, p) => n + p.milestones.length, 0);
  const done = phases.reduce((n, p) => n + p.milestones.filter(m => checked[m.id]).length, 0);
  const percent = total ? Math.round(done / total * 100) : 0;
  return <div className="vault-progress-card roadmap-progress-card"><div><h4 style={{ fontSize: 18, fontWeight: 700 }}>{label}</h4><span className="sm">{signedIn ? 'Progress is saved to your account.' : 'Sign in to save progress to your account.'}</span></div><div className="roadmap-progress-track"><div className="vault-prog-bar-bg"><div className="vault-prog-bar-fill" style={{ width: `${percent}%` }}/></div></div><div className="roadmap-progress-controls"><span className="sm num">{done} of {total} milestones ({percent}%)</span><button type="button" className="bs-ctl-btn" onClick={onReset}><RotateCcw size={12}/> Reset</button></div></div>;
}

export default function RoadmapsView({ active = false, user }) {
  const [track, setTrack] = useState('dsa');
  const [compare, setCompare] = useState(false);
  const [checked, setChecked] = useState({ dsa: {}, cp: {} });
  const [error, setError] = useState('');
  const checkedRef = useRef(checked);
  const saveQueue = useRef(Promise.resolve());
  const userId = user?.id || '';

  useEffect(() => {
    let activeRequest = true;
    const empty = { dsa: {}, cp: {} };
    checkedRef.current = empty;
    setChecked(empty);
    setError('');
    if (!userId) return () => { activeRequest = false; };
    api(`/api/user/progress/${encodeURIComponent(userId)}`)
      .then(progress => {
        if (!activeRequest) return;
        const next = progress.roadmapProgress || empty;
        checkedRef.current = next;
        setChecked(next);
      })
      .catch(requestError => {
        if (activeRequest) setError(requestError.message || 'Could not load roadmap progress.');
      });
    return () => { activeRequest = false; };
  }, [userId]);

  const updateTrack = (id, value) => {
    const nextTrack = id ? { ...checkedRef.current[track] } : {};
    if (id && value === null) delete nextTrack[id];
    else if (id) nextTrack[id] = value;
    const next = { ...checkedRef.current, [track]: nextTrack };
    checkedRef.current = next;
    setChecked(next);
    if (!userId) return;
    saveQueue.current = saveQueue.current.catch(() => {}).then(() =>
      api(`/api/user/progress/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        body: JSON.stringify({ roadmapProgress: { [track]: nextTrack } })
      })
    );
    saveQueue.current.catch(requestError => setError(requestError.message || 'Could not save roadmap progress.'));
  };
  const activePhases = track === 'dsa' ? ROADMAP_DSA_PHASES : ROADMAP_CP_TIERS;
  const activeChecked = checked[track] || {};
  const comparison = useMemo(() => ({ dsa: ROADMAP_DSA_PHASES.length, cp: ROADMAP_CP_TIERS.length }), []);
  return <section className={`tab-view ${active ? 'active' : ''}`} id="view-roadmaps"><div className="view-wrap roadmaps-wrap">
    <div className="section-head" style={{ paddingTop: 0 }}><h2>Curated Roadmaps: DSA vs CP</h2><p className="sub">Two distinct disciplines, two master trajectories. Choose the <b>DSA Track</b> for interviews or the <b>Competitive Programming Track</b> for contests and ICPC.</p></div>
    <div className="roadmap-track-switch"><div className="track-pill-group"><button type="button" className={`track-tab-btn ${track === 'dsa' ? 'active' : ''}`} onClick={() => setTrack('dsa')}>🎯 DSA Track (SDE & Interviews)</button><button type="button" className={`track-tab-btn ${track === 'cp' ? 'active' : ''}`} onClick={() => setTrack('cp')}>⚡ CP Track (Contests & ICPC)</button></div><button type="button" className="compare-toggle-btn" aria-pressed={compare} onClick={() => setCompare(v => !v)}>{compare ? 'Hide Track Comparison' : 'Compare Tracks Side-by-Side'}</button></div>
    {compare && <div className="compare-matrix-box"><div className="compare-card"><h4>🎯 DSA Technical Interview Track</h4><ul><li><strong>Target:</strong> Product engineering interviews.</li><li><strong>Format:</strong> Coding, discussion, and complexity analysis.</li><li><strong>Core:</strong> Two pointers, sliding window, trees, heaps, BFS/DFS, and DP.</li><li><strong>Milestones:</strong> {comparison.dsa} structured phases.</li></ul></div><div className="compare-card" style={{ borderLeft: '1px solid var(--line)', paddingLeft: 24 }}><h4>⚡ Competitive Programming Track</h4><ul><li><strong>Target:</strong> Codeforces, CodeChef, and ICPC.</li><li><strong>Format:</strong> Timed contests with penalty for wrong submissions.</li><li><strong>Core:</strong> Number theory, segment trees, tree DP, bitmask DP, and flows.</li><li><strong>Milestones:</strong> {comparison.cp} rating tiers.</li></ul></div></div>}
    <ProgressSummary phases={activePhases} checked={activeChecked} onReset={() => updateTrack('', null)} label={track === 'dsa' ? 'DSA Interview Progression' : 'Competitive Programming Progression'} signedIn={!!userId}/>
    {error && <p role="alert" className="sm" style={{ color: 'var(--hard)' }}>{error}</p>}
    <TrackTimeline phases={activePhases} checked={activeChecked} onToggle={id => updateTrack(id, !activeChecked[id])}/>
  </div></section>;
}
