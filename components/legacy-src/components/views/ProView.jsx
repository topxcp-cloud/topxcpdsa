import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api.js';

const FALLBACK_PROBLEMS = [
  ['FLOW001','Number Mirror',480],['START01','Number Mirror II',490],['LUCKFOUR','Lucky Four',510],['INTEST','Enormous Input Test',520],['FSQRT','Finding Square Roots',495],['CIELRCPT','Ciel and Receipt',530],['HS08TEST','ATM',485],['FLOW006','Sum of Digits',500],['FLOW002','Find Remainder',480],['FLOW004','First and Last Digit',505],['FLOW007','Reverse The Number',515],['CHOPRT','Chef And Operators',490],['AMR15A','Mahasena',525],['REMISS','Chef and Remissness',510],['TLG','The Lead Game',540],['DIFFSUM','Sum OR Difference',475],['DECINC','Decrement OR Increment',480],['PALL01','The Block Game',510],['FLOW010','Id and Ship',490],['FLOW013','Valid Triangles',505],['FLOW017','Second Largest',515],['FLOW018','Small Factorial',535],['FLOW008','Servant',495],['FLOW009','Total Expenses',510],['FLOW011','Gross Salary',520],['FLOW014','Grade The Steel',530],['FLOW016','GCD and LCM',525],['PRB01','Primality Test',540],['LAPIN','Lapindromes',550],['PPSUM','Puppy and Sum',515],['HEADBOB','Tanu and Head-bob',520],['TWOSTR','Chef and the Wildcard',535],['TRISQ','Fit Squares in Triangle',545],['VOWELTB','Vowel or Consonant',470],['AREAPERI','Area OR Perimeter',490],['HOWMANY','How many digits do I have',500],['CANDY123','Bear and Candies 123',530],['COPS','Cops and the Thief Devu',540],['FRUITS','Chef and Fruits',510],['CHN09','Malvika is peculiar',505]
].map(([code,name,rating]) => ({code,name,rating,isSolved:false}));

export default function ProView({ active = false, user }) {
  const [status, setStatus] = useState(null);
  const [problems, setProblems] = useState(FALLBACK_PROBLEMS);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const loadStatus = useCallback(async () => {
    if (!user?.id) { setStatus(null); setProblems(FALLBACK_PROBLEMS); return; }
    setLoading(true); setError('');
    try {
      const result = await api(`/api/topx-pro/status/${encodeURIComponent(user.id)}`);
      setStatus(result); if (Array.isArray(result.problems) && result.problems.length) setProblems(result.problems);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [user?.id]);
  useEffect(() => { loadStatus(); }, [loadStatus]);
  const solved = useMemo(() => problems.filter(p => p.isSolved).length, [problems]);
  const percent = Math.round(solved / 40 * 100);
  async function requestVerification() {
    if (!user?.id) { setError('Sign in to request Pro verification.'); return; }
    setRequesting(true); setError(''); setNotice('');
    try { const result = await api(`/api/topx-pro/verify/${encodeURIComponent(user.id)}`, { method: 'POST' }); setNotice(result.message || 'Verification request submitted for admin review.'); await loadStatus(); }
    catch (e) { setError(e.message); }
    finally { setRequesting(false); }
  }
  const isPro = !!status?.isPro; const pending = status?.verificationStatus === 'pending';
  return <section className={`tab-view ${active ? 'active' : ''}`} id="view-pro"><div className="view-wrap" style={{ padding: '40px 0 80px' }}>
    <div className="pro-hero-banner"><div className="pro-hero-left"><span className="pro-nav-pill" style={{ marginBottom: 12 }}>⚡ ELITE GUILD MEMBERSHIP</span><h2>Unlock Top-X Pro</h2><p>Complete the CodeChef challenge and request Pro verification. Membership requests are reviewed by an admin; a browser-side checklist never grants membership by itself.</p><div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}><button className="btn-primary" type="button" onClick={requestVerification} disabled={requesting || loading || isPro || pending}>{requesting ? 'Submitting…' : isPro ? 'Top-X Pro Active' : pending ? 'Request Pending Review' : 'Request Pro Verification'}</button><a className="btn-link" href="https://www.codechef.com" target="_blank" rel="noopener noreferrer">Open CodeChef ↗</a><button className="bs-ctl-btn" type="button" onClick={loadStatus} disabled={loading}><RefreshCw size={13}/> Refresh status</button></div>{!user && <p className="sm">Sign in to load your personal progress and submit a verification request.</p>}{error && <p className="pro-feedback error" role="alert">{error}</p>}{notice && <p className="pro-feedback success" role="status">{notice}</p>}</div>
      <div className="pro-req-card"><h4>Pro Qualification Challenge</h4><p className="sm">40-problem CodeChef challenge. Completion is based on server-verified account data.</p><div className="pro-prog-box"><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}><span>Progress:</span><b className="num">{solved} / 40 Completed ({percent}%)</b></div><div className="vault-prog-bar-bg"><div className="vault-prog-bar-fill" style={{ width: `${percent}%` }}/></div></div><span className="sm pro-status-text"><ShieldCheck size={14}/>{isPro ? 'Top-X Pro Active · Admin approved' : pending ? 'Request submitted · awaiting admin review' : loading ? 'Loading your verified progress…' : 'Not yet approved'}</span></div></div>
    <div className="section-head" style={{ padding: '20px 0 10px' }}><h3>The 40 CodeChef 500-Rated Challenge Vault</h3><p className="sm">Solved states come from the server. Opening a problem does not automatically mark it as solved.</p></div>
    <div className="cc-problems-grid">{problems.map(prob => <article className={`cc-problem-item ${prob.isSolved ? 'solved' : ''}`} key={prob.code}><div className="cc-item-left">{prob.isSolved ? <CheckCircle2 className="cc-check-icon" size={20}/> : <Circle className="cc-check-icon" size={20}/>}<div className="cc-item-info"><b>{prob.code}</b><span>{prob.name} · {prob.rating} Rating</span></div></div><a href={`https://www.codechef.com/problems/${encodeURIComponent(prob.code)}`} target="_blank" rel="noopener noreferrer" className="sm pro-solve-link">Solve <ExternalLink size={12}/></a></article>)}</div>
  </div></section>;
}
