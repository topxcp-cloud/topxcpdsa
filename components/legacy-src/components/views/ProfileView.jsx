/** ProfileView: React-owned view markup. Feature data/actions are progressively isolated in feature hooks. */
export default function ProfileView({ active = false }) {
  return (
<section className={`tab-view ${active ? 'active' : ''}`} id="view-profile">
      <div className="view-wrap" style={{maxWidth: '1120px'}}>
        <div className="section-head" style={{paddingTop: '0'}}>
          <h2>My Profile</h2>
          <p className="sub">Manage your TOP-X account and connect your real competitive-programming profiles. No API keys are needed for public profile lookups.</p>
          </div>
        <div className="profile-banner" style={{marginBottom: '22px'}}>
          <div className="profile-banner-avatar-wrap"><div className="profile-banner-avatar" id="page-profile-avatar" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', background: 'var(--card)', color: 'var(--ink)'}}>?</div></div>
          <div className="profile-banner-info"><h4 id="page-profile-name">Your account</h4><p id="page-profile-email">Sign in to view your profile</p><div className="profile-badge-tag">Authenticated TOP-X member</div></div>
          <div style={{marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap'}}><button className="bs-ctl-btn" id="page-profile-logout" type="button">Log out</button></div>
          </div>
        <div className="vault-progress-card" style={{display: 'block', marginBottom: '22px'}}>
          <h3 style={{marginBottom: '14px'}}>Account details</h3>
          <form id="page-profile-form" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px', alignItems: 'end'}}>
            <div className="auth-field"><label htmlFor="page-profile-name-input">Full name</label><input id="page-profile-name-input" maxLength="80" required="" autoComplete="name" /></div>
            <div className="auth-field"><label htmlFor="page-profile-branch-input">Branch</label><select id="page-profile-branch-input"><option value="">Select branch</option><option value="CSE">CSE</option><option value="IT">IT</option><option value="EI">EI</option><option value="EEE">EEE</option><option value="CSBS">CSBS</option><option value="MECH">Mechanical</option><option value="CIVIL">Civil</option><option value="IP">IP</option></select></div>
            <div className="auth-field"><label htmlFor="page-profile-section-input">Section</label><select id="page-profile-section-input"><option value="">Select section</option><option value="A">Section A</option><option value="B">Section B</option></select></div>
            <div><button className="btn-primary" type="submit" id="page-profile-save">Save profile</button></div>
            </form>
          </div>
        <div className="vault-progress-card" style={{display: 'block', marginBottom: '22px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px'}}><div><h3>Connect coding platforms</h3><p className="sm">Enter the exact public usernames/handles used on each platform.</p></div><button className="btn-primary" type="button" id="page-profile-sync">↻ Save & sync live data</button></div>
          <div className="cp-platform-cards">
            <div className="cp-card"><div className="cp-card-head lc"><b>LeetCode</b><span className="sm">Live public profile lookup</span></div><input id="page-handle-leetcode" placeholder="LeetCode username" autoComplete="off" /><div className="cp-card-stat-box"><div><span>Total solved</span><b id="page-lc-solved">—</b></div><div><span>Easy / Medium / Hard</span><b id="page-lc-breakdown">—</b></div><div><span>Global ranking</span><b id="page-lc-rank">—</b></div></div><p className="sm" id="page-lc-status" aria-live="polite">Not synced yet</p></div>
            <div className="cp-card"><div className="cp-card-head cf"><b>Codeforces</b><span className="sm">Official public API</span></div><input id="page-handle-codeforces" placeholder="Codeforces handle" autoComplete="off" /><div className="cp-card-stat-box"><div><span>Rating</span><b id="page-cf-rating">—</b></div><div><span>Rank</span><b id="page-cf-rank">—</b></div><div><span>Maximum rating</span><b id="page-cf-max">—</b></div></div><p className="sm" id="page-cf-status" aria-live="polite">Not synced yet</p></div>
            <div className="cp-card"><div className="cp-card-head cc"><b>CodeChef</b><span className="sm">Live public profile lookup</span></div><input id="page-handle-codechef" placeholder="CodeChef username" autoComplete="off" /><div className="cp-card-stat-box"><div><span>Rating</span><b id="page-cc-rating">—</b></div><div><span>Stars</span><b id="page-cc-stars">—</b></div><div><span>Global rank</span><b id="page-cc-rank">—</b></div></div><p className="sm" id="page-cc-status" aria-live="polite">Not synced yet</p></div>
            </div>
          <p className="sm" id="page-profile-sync-status" style={{marginTop: '14px'}} aria-live="polite">Your handles and statistics are private to your account.</p>
          <p className="sm" id="page-profile-last-sync" />
          </div>
        </div>
      </section>
  );
}
