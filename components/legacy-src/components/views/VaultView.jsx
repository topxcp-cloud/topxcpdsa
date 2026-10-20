import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
const BUILT_INS = [
  {id:'two-sum-ii',pattern:'two',name:'Two Sum II (Sorted)',slug:'two-sum-ii-input-array-is-sorted',difficulty:2,companies:['Amazon','Google'],hint:'Use two pointers and move the left or right pointer based on the sum.'},
  {id:'3sum',pattern:'two',name:'3Sum',slug:'3sum',difficulty:2,companies:['Meta','Amazon','Apple'],hint:'Sort, fix one value, then use two pointers for the remaining pair.'},
  {id:'container-water',pattern:'two',name:'Container With Most Water',slug:'container-with-most-water',difficulty:2,companies:['Google','Meta'],hint:'Move the pointer at the shorter wall inward.'},
  {id:'trapping-rain',pattern:'two',name:'Trapping Rain Water',slug:'trapping-rain-water',difficulty:3,companies:['Amazon','Goldman Sachs'],hint:'Track the maximum boundary from both sides.'},
  {id:'binary-search',pattern:'binary',name:'Binary Search',slug:'binary-search',difficulty:1,companies:['Apple','Microsoft'],hint:'Maintain a sorted search interval and halve it each iteration.'},
  {id:'find-minimum',pattern:'binary',name:'Find Minimum in Rotated Array',slug:'find-minimum-in-rotated-sorted-array',difficulty:2,companies:['Amazon','Microsoft'],hint:'Compare the midpoint with the right boundary.'},
  {id:'rotated-search',pattern:'binary',name:'Search in Rotated Sorted Array',slug:'search-in-rotated-sorted-array',difficulty:2,companies:['Meta','Amazon'],hint:'Identify the sorted half and test whether the target falls inside it.'},
  {id:'koko',pattern:'binary',name:'Koko Eating Bananas',slug:'koko-eating-bananas',difficulty:2,companies:['Google','Airbnb'],hint:'Binary search the answer speed using a monotonic feasibility check.'},
  {id:'subarray-k',pattern:'prefix',name:'Subarray Sum Equals K',slug:'subarray-sum-equals-k',difficulty:2,companies:['Meta','Amazon'],hint:'Count prefix sums and look up prefix minus k.'},
  {id:'product-except-self',pattern:'prefix',name:'Product of Array Except Self',slug:'product-of-array-except-self',difficulty:2,companies:['Amazon','Apple','Meta'],hint:'Combine left prefix products with right suffix products.'},
  {id:'continuous-subarray',pattern:'prefix',name:'Continuous Subarray Sum',slug:'continuous-subarray-sum',difficulty:2,companies:['Meta'],hint:'Track prefix sums modulo k and their earliest indices.'},
  {id:'range-sum',pattern:'prefix',name:'Range Sum Query - Immutable',slug:'range-sum-query-immutable',difficulty:1,companies:['Google'],hint:'Precompute prefix sums for constant-time range queries.'},
  {id:'network-delay',pattern:'graph',name:'Network Delay Time',slug:'network-delay-time',difficulty:2,companies:['Google','Amazon'],hint:'Run Dijkstra from the source and take the maximum shortest distance.'},
  {id:'minimum-effort',pattern:'graph',name:'Path With Minimum Effort',slug:'path-with-minimum-effort',difficulty:2,companies:['Google'],hint:'Use Dijkstra where path cost is the largest edge effort.'},
  {id:'cheapest-flights',pattern:'graph',name:'Cheapest Flights Within K Stops',slug:'cheapest-flights-within-k-stops',difficulty:2,companies:['Airbnb','Meta'],hint:'Track both cost and remaining stops in your state.'},
  {id:'swim-rising',pattern:'graph',name:'Swim in Rising Water',slug:'swim-in-rising-water',difficulty:3,companies:['Google','Amazon'],hint:'Expand the minimum elevation frontier using a min-heap.'}
];
const DIFFICULTY = {1:'Easy',2:'Medium',3:'Hard'};
const PATTERNS = [{id:'all',label:'All Patterns'},{id:'graph',label:'Dijkstra / Graph'},{id:'two',label:'Two Pointers'},{id:'binary',label:'Binary Search'},{id:'prefix',label:'Prefix Sum'}];
export default function VaultView({ active = false, user = null }) {
  const [custom, setCustom] = useState([]); const [removed, setRemoved] = useState([]);
  const [pattern, setPattern] = useState('all'); const [difficulty, setDifficulty] = useState('all'); const [query, setQuery] = useState('');
  const [tableMode, setTableMode] = useState(false);
  const [solved, setSolved] = useState([]);
  const [error, setError] = useState('');
  const solvedRef = useRef(solved);
  const saveQueue = useRef(Promise.resolve());
  const userId = user?.id || '';

  useEffect(() => {
    let alive = true;
    api('/api/vault/problems').then(data => {
      if (alive) {
        setCustom(Array.isArray(data.problems) ? data.problems : []);
        setRemoved(Array.isArray(data.removedIds) ? data.removedIds : []);
      }
    }).catch(requestError => {
      if (alive) setError(requestError.message || 'Could not load curated problems.');
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const empty = [];
    solvedRef.current = empty;
    setSolved(empty);
    if (!userId) return () => { alive = false; };
    api(`/api/user/progress/${encodeURIComponent(userId)}`)
      .then(progress => {
        if (!alive) return;
        const ids = Array.isArray(progress.solvedVaultProblemIds) ? progress.solvedVaultProblemIds : empty;
        solvedRef.current = ids;
        setSolved(ids);
      })
      .catch(requestError => {
        if (alive) setError(requestError.message || 'Could not load saved problem progress.');
      });
    return () => { alive = false; };
  }, [userId]);
  const problems = useMemo(() => [...BUILT_INS, ...custom.map((p,i)=>({id:p.id || `custom-${i}`,name:p.name || p.title || 'Custom problem',slug:p.slug || p.problemCode || '',difficulty:Number(p.difficulty)||2,companies:Array.isArray(p.companies)?p.companies:[],hint:p.hint || p.description || 'Review the problem statement and identify its core pattern.',url:p.url,pattern:p.pattern || 'custom'}))].filter(p=>!removed.includes(p.id)), [custom,removed]);
  const visible = problems.filter(p=>(pattern==='all'||p.pattern===pattern)&&(difficulty==='all'||String(p.difficulty)===difficulty)&&`${p.name} ${p.companies.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const toggleSolved = id => {
    const next = solvedRef.current.includes(id)
      ? solvedRef.current.filter(item => item !== id)
      : [...solvedRef.current, id];
    solvedRef.current = next;
    setSolved(next);
    if (!userId) return;
    saveQueue.current = saveQueue.current.catch(() => {}).then(() =>
      api(`/api/user/progress/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        body: JSON.stringify({ solvedVaultProblemIds: next })
      })
    );
    saveQueue.current.catch(requestError => setError(requestError.message || 'Could not save problem progress.'));
  };
  const completed = problems.filter(p=>solved.includes(p.id)).length;
  return <section className={`tab-view ${active?'active':''}`} id="view-vault"><div className="view-wrap vault-wrap">
    <div className="section-head" style={{paddingTop:0}}><h2>Curated Practice Vault</h2><p className="sub">High-yield interview challenges across graph, array, and binary-search patterns.</p></div>
    <div className="vault-progress-card"><div className="vault-badge-pct num">{Math.round(completed/Math.max(1,problems.length)*100)}%</div><div><h4 style={{fontSize:17,fontWeight:700}}>{completed ? 'Progress in motion' : 'Ready to Start'}</h4><span className="sm">{userId ? 'Progress is saved to your account.' : 'Sign in to save progress to your account.'}</span><div className="vault-prog-bar-bg"><div className="vault-prog-bar-fill" style={{width:`${completed/Math.max(1,problems.length)*100}%`}} /></div></div><div className="num" style={{fontSize:14,color:'var(--mute)'}}>Solved: <b style={{color:'var(--ink)'}}>{completed}</b> / {problems.length}</div></div>
    {error && <p role="alert" className="sm" style={{ color: 'var(--hard)' }}>{error}</p>}
    <div className="vault-toolbar"><div className="vault-diff-pills">{[['all','All Difficulties'],['1','Easy'],['2','Medium'],['3','Hard']].map(([value,label])=><button key={value} className={`diff-filter-btn ${difficulty===value?'active':''}`} onClick={()=>setDifficulty(value)}>{label}</button>)}</div><div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}><div className="vault-search-box"><input aria-label="Search problems" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search problems or companies..." /></div><div className="view-mode-toggle"><button className={`view-mode-btn ${!tableMode?'active':''}`} onClick={()=>setTableMode(false)} aria-label="Grid view">▦</button><button className={`view-mode-btn ${tableMode?'active':''}`} onClick={()=>setTableMode(true)} aria-label="Table view">☷</button></div></div></div>
    <div className="vault-layout"><aside className="vault-sidebar">{PATTERNS.map(p=><button key={p.id} className={`vault-sidebar-item ${pattern===p.id?'active':''}`} onClick={()=>setPattern(p.id)}>{p.label}<span>{p.id==='all'?problems.length:problems.filter(x=>x.pattern===p.id).length}</span></button>)}</aside><div>
      {!tableMode ? <div className="problem-cards-grid">{visible.map(p=><article className="problem-card" key={p.id}><div className="problem-card-top"><span className={`diff-pill ${DIFFICULTY[p.difficulty]?.toLowerCase()||'med'}`}>{DIFFICULTY[p.difficulty]||'Medium'}</span><label className="sm"><input type="checkbox" checked={solved.includes(p.id)} onChange={()=>toggleSolved(p.id)} /> Solved</label></div><h3>{p.name}</h3><div className="sm">{p.companies.join(' · ') || 'Curated practice'}</div><details><summary>Key intuition</summary><p>{p.hint}</p></details><a className="btn-link" href={p.url || `https://leetcode.com/problems/${p.slug}/`} target="_blank" rel="noreferrer">Open problem ↗</a></article>)}</div> : <div className="vault-table-view"><table className="simple-table"><thead><tr><th>Done</th><th>Problem</th><th>Difficulty</th><th>Companies</th><th>Link</th></tr></thead><tbody>{visible.map(p=><tr key={p.id}><td><input type="checkbox" checked={solved.includes(p.id)} onChange={()=>toggleSolved(p.id)} aria-label={`Mark ${p.name} solved`} /></td><td>{p.name}</td><td>{DIFFICULTY[p.difficulty]||'Medium'}</td><td>{p.companies.join(', ')}</td><td><a href={p.url || `https://leetcode.com/problems/${p.slug}/`} target="_blank" rel="noreferrer">Open ↗</a></td></tr>)}</tbody></table></div>}
      <p className="sm" style={{marginTop:20}}>Showing <b>{visible.length}</b> of {problems.length} problems.</p>{!visible.length&&<p className="sm">No problems match these filters.</p>}
    </div></div></div></section>;
}
