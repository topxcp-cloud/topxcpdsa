/** AuthGate: reusable React shell component. */
export default function AuthGate({ authMode, setAuthMode, authenticate, error, setError, isAuthenticated = false }) {
  return (
<div id="login-gate" className="login-gate" style={{ display: isAuthenticated ? 'none' : 'flex' }}>
    <div className="login-gate-bg">
      <div className="login-gate-grid" />
      </div>
    <div className="login-gate-container">
      
      <div className="login-gate-brand">
        <div className="login-brand-logo">
          <svg viewbox="0 0 26 26" width="42" height="42">
            <path d="M13 7L6 19M13 7l7 12" stroke="currentColor" strokeWidth="1.6" fill="none" />
            <circle cx="13" cy="6" r="3.2" fill="currentColor" />
            <circle cx="6" cy="20" r="3.2" fill="currentColor" />
            <circle cx="20" cy="20" r="3.2" fill="#FF5A36" />
            </svg>
          <span>TOP<i>-X</i></span>
          </div>
        <h1>Code. Compete.<br />Conquer.</h1>
        <p>The unified competitive programming dashboard.<br />Track LeetCode, Codeforces & CodeChef in one place.</p>
        <div className="login-stats-row">
          <div><b>500+</b><span>Problems</span></div>
          <div><b>3</b><span>Platforms</span></div>
          <div><b>40</b><span>Pro Challenges</span></div>
          </div>
        </div>
      
      <div className="login-gate-form-card">
        <div className="login-form-tabs">
          <button type="button" className={`login-form-tab ${authMode === 'login' ? 'active' : ''}`} id="login-tab-signin" onClick={() => { setAuthMode('login'); setError(''); }}>Sign In</button>
          <button type="button" className={`login-form-tab ${authMode === 'register' ? 'active' : ''}`} id="login-tab-signup" onClick={() => { setAuthMode('register'); setError(''); }}>Create Account</button>
          </div>
        
        <button className="btn-google" id="gate-btn-google">
          <svg className="google-icon" viewbox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.93 6.72-4.93z" />
            </svg>
          <span>Continue with Google</span>
          </button>
        <div className="login-divider">
          <hr /><span>OR</span><hr />
          </div>
        <form id="gate-auth-form" autoComplete="off" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await authenticate({ name: String(form.get('name') || ''), email: String(form.get('email') || ''), password: String(form.get('password') || '') }); } catch (_) {} }}>
          <div className="auth-field" id="gate-name-field">
            <label htmlFor="gate-name">Full Name</label>
            <input id="gate-name" name="name" placeholder="Your full name" autoComplete="name" required={authMode === 'register'} style={{display: authMode === 'register' ? undefined : 'none'}} />
            </div>
          <div className="auth-field">
            <label htmlFor="gate-email">Email Address</label>
            <input type="email" id="gate-email" name="email" placeholder="you@university.edu" required autoComplete="email" />
            </div>
          <div className="auth-field">
            <label htmlFor="gate-password">Password</label>
            <input type="password" id="gate-password" name="password" placeholder="••••••••" required minLength={authMode === 'register' ? 8 : undefined} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} />
            </div>
          <button type="submit" className="btn-primary login-submit-btn" id="gate-submit-btn">
            <span>{authMode === 'register' ? 'Create Account' : 'Sign In'}</span>
            <svg width="16" height="16" viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </form>
        <p className="login-hint" id="gate-toggle-hint">
          {error ? <span role="alert" style={{display:'block',color:'var(--hard)',marginBottom:8}}>{error}</span> : null}{authMode === 'login' ? <>Don't have an account? <a href="#signup" id="gate-toggle-link" onClick={(e) => { e.preventDefault(); setAuthMode('register'); setError(''); }}>Create one</a></> : <>Already have an account? <a href="#signin" onClick={(e) => { e.preventDefault(); setAuthMode('login'); setError(''); }}>Sign in</a></>}
          </p>
        
        <div className="login-demo-entry">
          <button className="login-demo-btn" id="gate-demo-btn">
            <svg width="14" height="14" viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Demo mode unavailable
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
