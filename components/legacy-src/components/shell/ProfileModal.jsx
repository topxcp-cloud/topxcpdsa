/** ProfileModal: reusable React shell component. */
export default function ProfileModal() {
  return (
<div className="modal-backdrop" id="profile-modal-backdrop">
    <div className="modal-card wide">
      <div className="modal-header">
        <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
          <button className="filter-btn-group active" id="modal-tab-profile-btn" style={{fontSize: '14px', fontWeight: '700'}}>CP Profiles & API Sync</button>
          <button className="filter-btn-group" id="modal-tab-auth-btn" style={{fontSize: '14px', color: 'var(--mute)'}}>Account & Sign In</button>
          </div>
        <button className="modal-close-btn" id="modal-close-profile-btn">✕</button>
        </div>
      <div className="modal-body">
        
        <div id="modal-profile-view">
          <div className="profile-banner">
            <div className="profile-banner-avatar-wrap">
              <img className="profile-banner-avatar" id="modal-user-avatar-img" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&amp;auto=format&amp;fit=crop&amp;q=80" alt="Avatar" />
              <div className="avatar-change-overlay" id="btn-change-avatar">Change</div>
              </div>
            <div className="profile-banner-info">
              <h4 id="modal-user-name">Member</h4>
              <p id="modal-user-email">Sign in to load your account</p>
              <div id="modal-user-pro-badge" className="profile-badge-tag">Top-X Member</div>
              </div>
            <div style={{marginLeft: 'auto'}}>
              <button className="btn-primary" id="btn-sync-all-cp-modal" style={{padding: '10px 18px', fontSize: '13px'}}>⚡ Sync All Data Directly</button>
              </div>
            </div>
          
          <div id="avatar-input-drawer" style={{display: 'none', marginBottom: '20px', padding: '14px', border: '1px solid var(--line)', borderRadius: '4px', background: 'var(--card)'}}>
            <label className="sm" style={{display: 'block', marginBottom: '6px'}}>Paste Profile Picture Image URL:</label>
            <div style={{display: 'flex', gap: '8px'}}>
              <input id="custom-avatar-url-input" placeholder="https://..." style={{flex: '1', padding: '8px', border: '1px solid var(--line)', borderRadius: '4px', background: 'var(--surface)'}} />
              <button className="btn-primary" id="btn-save-custom-avatar" style={{padding: '8px 14px', fontSize: '12px'}}>Save Picture</button>
              </div>
            </div>
          
          <h5 style={{fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px'}}>Connected Coding Platforms</h5>
          <div className="cp-platform-cards">
            
            <div className="cp-card">
              <div className="cp-card-head lc">
                <b>LeetCode</b>
                <span className="sm">Live API · sync on request</span>
                </div>
              <input id="input-handle-leetcode" placeholder="Your LeetCode username" defaultValue="" />
              <div className="cp-card-stat-box" id="stats-box-leetcode">
                <div><span>Solved:</span><b id="lc-stat-solved">—</b></div>
                <div><span>Easy / Med / Hard:</span><b id="lc-stat-ratio">Connect handle</b></div>
                <div><span>Contest Rating:</span><b id="lc-stat-rating">—</b></div>
                </div>
              </div>
            
            <div className="cp-card">
              <div className="cp-card-head cf">
                <b>Codeforces</b>
                <span className="sm">Live API · sync on request</span>
                </div>
              <input id="input-handle-codeforces" placeholder="Your Codeforces handle" defaultValue="" />
              <div className="cp-card-stat-box" id="stats-box-codeforces">
                <div><span>Rating:</span><b id="cf-stat-rating" style={{color: 'var(--ac)'}}>—</b></div>
                <div><span>Rank Title:</span><b id="cf-stat-rank">Connect handle</b></div>
                <div><span>Max Rating:</span><b id="cf-stat-max">—</b></div>
                </div>
              </div>
            
            <div className="cp-card">
              <div className="cp-card-head cc">
                <b>CodeChef</b>
                <span className="sm">Live API · sync on request</span>
                </div>
              <input id="input-handle-codechef" placeholder="Your CodeChef handle" defaultValue="" />
              <div className="cp-card-stat-box" id="stats-box-codechef">
                <div><span>Rating:</span><b id="cc-stat-rating">—</b></div>
                <div><span>Stars:</span><b id="cc-stat-stars">Connect handle</b></div>
                <div><span>Global Rank:</span><b id="cc-stat-rank">—</b></div>
                </div>
              </div>
            </div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--line)'}}>
            <span className="sm" id="sync-status-msg">Connect your handles, then sync to load live stats.</span>
            <button className="btn-primary" id="btn-save-handles-only" style={{padding: '8px 16px', fontSize: '12px'}}>Save Handles</button>
            </div>
          </div>
        
        <div id="modal-auth-view" style={{display: 'none'}}>
          <div style={{maxWidth: '420px', margin: '10px auto', textAlign: 'center'}}>
            <h4 style={{fontSize: '18px', fontWeight: '800', color: 'var(--ink)', marginBottom: '8px'}}>Student Google Sign-In</h4>
            <p className="sm" style={{color: 'var(--mute)', marginBottom: '20px'}}>Sign in with your Google account to sync all personal daily solves across LeetCode, Codeforces, and CodeChef.</p>
            <button className="btn-google" id="btn-login-google" style={{width: '100%'}}>
              <svg className="google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.93 6.72-4.93z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
