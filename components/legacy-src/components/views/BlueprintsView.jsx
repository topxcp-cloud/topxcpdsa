import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { BLUEPRINTS_DATA } from '../../features/content/contentData.js';

const PATTERNS = [
  { id: 'graph', label: '🕸️ Dijkstra / Graph' },
  { id: 'two', label: '↔️ Two Pointers' },
  { id: 'binary', label: '🎯 Binary Search' },
  { id: 'prefix', label: '➕ Prefix Sum' },
];
const LANGUAGES = [{ id: 'python', label: 'Python' }, { id: 'cpp', label: 'C++' }, { id: 'javascript', label: 'JavaScript' }];

export default function BlueprintsView({ active = false }) {
  const [pattern, setPattern] = useState('graph');
  const [language, setLanguage] = useState('python');
  const [copied, setCopied] = useState(false);
  const data = BLUEPRINTS_DATA[pattern];
  const code = useMemo(() => data?.code?.[language] || '// Template is not available for this language yet.', [data, language]);
  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  }
  return <section className={`tab-view ${active ? 'active' : ''}`} id="view-blueprints">
    <div className="view-wrap blueprints-wrap">
      <div className="section-head" style={{ paddingTop: 0 }}><h2>Algorithm Blueprints</h2><p className="sub">Production-grade templates you can memorize and deploy in coding interviews. Switch between patterns and programming languages.</p></div>
      <div className="bp-nav-tabs" role="tablist" aria-label="Algorithm patterns">
        {PATTERNS.map(item => <button key={item.id} type="button" role="tab" aria-selected={pattern === item.id} className={`bp-tab-btn ${pattern === item.id ? 'active' : ''}`} onClick={() => setPattern(item.id)}>{item.label}</button>)}
      </div>
      <div className="bp-split-grid">
        <div className="bp-info-col"><div className="bp-category-badge">{data.badge}</div><h3 className="bp-title">{data.title}</h3><p className="bp-desc">{data.desc}</p>
          <div className="bp-specs-grid"><div><b>{data.time}</b><span>Time Complexity</span></div><div><b>{data.space}</b><span>Space Complexity</span></div></div>
          <h5 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>Key Recognition Signals</h5>
          <ul className="bp-signals-list">{data.signals.map(signal => <li key={signal}>{signal}</li>)}</ul>
        </div>
        <div className="bp-code-col"><div className="bp-code-header"><div className="bp-lang-buttons">{LANGUAGES.map(lang => <button type="button" key={lang.id} className={`bp-lang-btn ${language === lang.id ? 'active' : ''}`} aria-pressed={language === lang.id} onClick={() => setLanguage(lang.id)}>{lang.label}</button>)}</div>
          <button type="button" className="bp-copy-btn" onClick={copyTemplate}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied!' : 'Copy Template'}</button></div><pre className="bp-code-pre"><code>{code}</code></pre></div>
      </div>
    </div>
  </section>;
}
