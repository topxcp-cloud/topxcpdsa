'use client';
import React, { useState } from 'react';

/** AuthGate: unified authentication gate supporting Firebase Google sign-in and email/password. */
export default function AuthGate({
  authMode,
  setAuthMode,
  authenticate,
  loginWithGoogle,
  error,
  setError,
  isAuthenticated = false,
  isOpen = true,
  onClose
}) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  if (isAuthenticated || !isOpen) {
    return null;
  }

  const handleGoogleClick = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    if (setError) setError('');
    try {
      if (typeof loginWithGoogle === 'function') {
        await loginWithGoogle();
      } else {
        throw new Error('Google Sign-In service is initializing. Please try again.');
      }
    } catch (err) {
      if (setError) setError(err.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (formLoading) return;
    setFormLoading(true);
    if (setError) setError('');
    const form = new FormData(event.currentTarget);
    try {
      await authenticate({
        name: String(form.get('name') || ''),
        email: String(form.get('email') || ''),
        password: String(form.get('password') || '')
      });
    } catch (err) {
      // error handled by authenticate
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div id="login-gate" className="login-gate" role="dialog" aria-modal="true" aria-label="Sign in gate">
      <div className="login-gate-bg">
        <div className="login-gate-grid" />
      </div>
      <div className="login-gate-container">
        <div className="login-gate-brand">
          <div className="login-brand-logo">
            <svg viewBox="0 0 26 26" width="42" height="42" aria-hidden="true">
              <path d="M13 7L6 19M13 7l7 12" stroke="currentColor" strokeWidth="1.6" fill="none" />
              <circle cx="13" cy="6" r="3.2" fill="currentColor" />
              <circle cx="6" cy="20" r="3.2" fill="currentColor" />
              <circle cx="20" cy="20" r="3.2" fill="#FF5A36" />
            </svg>
            <span>MY TOPICS <i>CLUB</i></span>
          </div>
          <h1>Code. Compete.<br />Conquer.</h1>
          <p>The student-driven competitive programming platform.<br />Track LeetCode, Codeforces &amp; CodeChef with campus peers.</p>
          <div className="login-stats-row">
            <div><b>500+</b><span>Problems</span></div>
            <div><b>3</b><span>Platforms</span></div>
            <div><b>40</b><span>Pro Challenges</span></div>
          </div>
        </div>

        <div className="login-gate-form-card">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                float: 'right',
                background: 'transparent',
                border: 'none',
                color: 'var(--mute)',
                cursor: 'pointer',
                fontSize: '20px',
                lineHeight: 1
              }}
              aria-label="Close sign in dialog"
            >
              ✕
            </button>
          )}

          <div className="login-form-tabs">
            <button
              type="button"
              className={`login-form-tab ${authMode === 'login' ? 'active' : ''}`}
              id="login-tab-signin"
              onClick={() => { setAuthMode('login'); if (setError) setError(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`login-form-tab ${authMode === 'register' ? 'active' : ''}`}
              id="login-tab-signup"
              onClick={() => { setAuthMode('register'); if (setError) setError(''); }}
            >
              Create Account
            </button>
          </div>

          {/* Continue with Google button */}
          <button
            type="button"
            className="btn-google"
            id="gate-btn-google"
            onClick={handleGoogleClick}
            disabled={googleLoading || formLoading}
            aria-label="Continue with Google"
          >
            {googleLoading ? (
              <span>Signing in with Google...</span>
            ) : (
              <>
                <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.93 6.72-4.93z" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="login-divider">
            <hr /><span>OR</span><hr />
          </div>

          <form id="gate-auth-form" autoComplete="off" onSubmit={handleFormSubmit}>
            <div className="auth-field" id="gate-name-field" style={{ display: authMode === 'register' ? undefined : 'none' }}>
              <label htmlFor="gate-name">Full Name</label>
              <input
                id="gate-name"
                name="name"
                placeholder="Your full name"
                autoComplete="name"
                required={authMode === 'register'}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="gate-email">Email Address</label>
              <input
                type="email"
                id="gate-email"
                name="email"
                placeholder="you@university.edu"
                required
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="gate-password">Password</label>
              <input
                type="password"
                id="gate-password"
                name="password"
                placeholder="••••••••"
                required
                minLength={authMode === 'register' ? 8 : undefined}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>
            <button
              type="submit"
              className="btn-primary login-submit-btn"
              id="gate-submit-btn"
              disabled={formLoading || googleLoading}
            >
              <span>{formLoading ? 'Authenticating...' : (authMode === 'register' ? 'Create Account' : 'Sign In')}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>

          {error && (
            <div role="alert" style={{
              marginTop: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              color: 'var(--hard)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: '13px',
              lineHeight: 1.4
            }}>
              {error}
            </div>
          )}

          <p className="login-hint" id="gate-toggle-hint">
            {authMode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <a
                  href="#signup"
                  id="gate-toggle-link"
                  onClick={(e) => { e.preventDefault(); setAuthMode('register'); if (setError) setError(''); }}
                >
                  Create one
                </a>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <a
                  href="#signin"
                  onClick={(e) => { e.preventDefault(); setAuthMode('login'); if (setError) setError(''); }}
                >
                  Sign in
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
