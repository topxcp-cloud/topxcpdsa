import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Search, BookOpen, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api.js';
import { GUIDES_DATA } from '../../features/content/contentData.js';

export default function GuidesView({ active = false }) {
  const [remote, setRemote] = useState([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadResources = async () => {
    setLoading(true); setError('');
    try { const result = await api('/api/resources'); setRemote(Array.isArray(result.resources) ? result.resources : []); }
    catch (e) { setError(`Could not load community resources from the server: ${e.message}`); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadResources(); }, []);
  const resources = useMemo(() => {
    const merged = [...remote.slice().reverse(), ...GUIDES_DATA];
    const unique = merged.filter((item, index) => merged.findIndex(x => (x.id && item.id) ? x.id === item.id : x.title === item.title) === index);
    return unique.filter(item => `${item.title} ${item.desc} ${item.type}`.toLowerCase().includes(query.toLowerCase()) && (type === 'All' || item.type === type));
  }, [remote, query, type]);
  const types = useMemo(() => ['All', ...new Set([...remote, ...GUIDES_DATA].map(x => x.type).filter(Boolean))], [remote]);
  return <section className={`tab-view ${active ? 'active' : ''}`} id="view-guides"><div className="view-wrap guides-wrap">
    <div className="section-head" style={{ paddingTop: 0 }}><h2>Masterclass Guides & Literature</h2><p className="sub">The finest algorithmic write-ups, university lectures, and reference materials across computer science.</p></div>
    <div className="guides-controls"><label className="guides-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search guides, topics, resources…" aria-label="Search guides"/></label><select value={type} onChange={e => setType(e.target.value)} aria-label="Filter resource type">{types.map(t => <option key={t}>{t}</option>)}</select><button className="bs-ctl-btn" type="button" onClick={loadResources} disabled={loading}><RefreshCw size={13}/> Refresh</button></div>
    {error && <p className="guides-error" role="status">{error} Showing built-in guides where available.</p>}
    {loading && <p className="sm" role="status">Refreshing community resources…</p>}
    <div className="guides-cards-grid">{resources.map((g, i) => <article className="guide-card" key={g.id || g.title}><div className="guide-meta"><span className="guide-tag">{g.type || 'Article'}</span><span className="guide-time">{g.time || 'Resource'}</span></div><h4>{g.title}</h4><p>{g.desc}</p><a className="guide-link-btn" href={g.link} target="_blank" rel="noopener noreferrer">Explore Guide <ExternalLink size={14}/></a></article>)}</div>
    {!resources.length && !loading && <div className="guides-empty"><BookOpen size={26}/><p>No resources match these filters.</p><button className="bs-ctl-btn" onClick={() => { setQuery(''); setType('All'); }}>Clear filters</button></div>}
  </div></section>;
}
