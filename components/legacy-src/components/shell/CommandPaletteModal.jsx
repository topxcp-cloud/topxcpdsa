import { useEffect, useMemo, useState } from 'react';
const ITEMS = [
  ['Home','/','Home page and overview'],
  ['Weekly Tasks','/progress','Practice tasks and verification'],
  ['Leaderboard','/leaderboard','Community standings'],
  ['Guides','/contests','CS learning resources'],
  ['Problem Vault','/problems','Curated interview problems'],
  ['Roadmaps','/roadmap','DSA and competitive programming tracks'],
  ['Profile','/profile','Account and platform sync'],
  ['Admin Console','/admin','Protected content management']
];
export default function CommandPaletteModal() {
  const [open,setOpen]=useState(false); const [query,setQuery]=useState(''); const [selected,setSelected]=useState(0);
  const results=useMemo(()=>ITEMS.filter(item=>item.join(' ').toLowerCase().includes(query.toLowerCase())),[query]);
  useEffect(()=>{const show=()=>{setOpen(true);setQuery('');setSelected(0)};const key=e=>{if((e.key==='k'&&(e.ctrlKey||e.metaKey))||e.key==='/'){if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;e.preventDefault();show()}if(e.key==='Escape')setOpen(false)};window.addEventListener('topx:open-search',show);window.addEventListener('keydown',key);return()=>{window.removeEventListener('topx:open-search',show);window.removeEventListener('keydown',key)}},[]);
  const go = (item) => {
    if (!item || typeof window === 'undefined') return;
    window.location.href = item[1];
    setOpen(false);
  };
  if(!open)return <div className="cmd-backdrop" id="cmd-backdrop" aria-hidden="true" />;
  return <div className="cmd-backdrop open" id="cmd-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div className="cmd-modal" role="dialog" aria-modal="true" aria-label="Search TOP-X"><div className="cmd-input-wrap"><span aria-hidden="true">⌕</span><input autoFocus className="cmd-input" id="cmd-input" value={query} onChange={e=>{setQuery(e.target.value);setSelected(0)}} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setSelected(i=>Math.min(i+1,results.length-1))}if(e.key==='ArrowUp'){e.preventDefault();setSelected(i=>Math.max(0,i-1))}if(e.key==='Enter')go(results[selected])}} placeholder="Type a problem, topic, student, or algorithm…" /></div><div className="cmd-results" id="cmd-results">{results.map((item,index)=><button type="button" key={item[1]} className={`cmd-result ${selected===index?'active':''}`} onMouseEnter={()=>setSelected(index)} onClick={()=>go(item)}><span><b>{item[0]}</b><small>{item[2]}</small></span><kbd>↵</kbd></button>)}{!results.length&&<p className="sm">No matching destinations.</p>}</div><div className="cmd-footer"><span>Navigation: Click or press Enter</span><button type="button" onClick={()=>setOpen(false)}>Close · Esc</button></div></div></div>;
}
