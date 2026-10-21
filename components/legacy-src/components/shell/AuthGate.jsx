'use client';
import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/** AuthGate: unified authentication gate supporting Firebase Google sign-in only. */
export default function AuthGate({
  loginWithGoogle,
  error,
  setError,
  isAuthenticated = false,
  isOpen = true,
  onClose,
  authMode,
  setAuthMode,
  authenticate
}) {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);

  const logoRef = useRef(null);
  const replayLogoAnim = useCallback(() => {
    if (!logoRef.current) return;
    const polygons = logoRef.current.querySelectorAll('.lg polygon');
    polygons.forEach((p) => {
      p.style.animation = 'none';
    });
    void logoRef.current.offsetWidth;
    polygons.forEach((p) => {
      p.style.animation = '';
    });
  }, []);

  const triggerPostLoginTransition = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (typeof window.replayTopxIntro === 'function') {
        window.replayTopxIntro();
      }
      if (typeof onClose === 'function') {
        onClose();
      }
      const searchParams = new URLSearchParams(window.location.search);
      const destination = searchParams.get('redirect') || searchParams.get('next') || '/dashboard';
      router.push(destination);
    }
  }, [router, onClose]);

  if (isAuthenticated || !isOpen) {
    return null;
  }

  const handleGoogleClick = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    if (setError) setError('');
    try {
      if (typeof loginWithGoogle === 'function') {
        const user = await loginWithGoogle();
        if (user) {
          triggerPostLoginTransition();
        }
      } else {
        throw new Error('Google Sign-In service is initializing. Please try again.');
      }
    } catch (err) {
      if (setError) setError(err.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div id="login-gate" className="login-gate" role="dialog" aria-modal="true" aria-label="Sign in gate">
      <div className="login-gate-bg">
        <div className="login-gate-grid" />
      </div>
      <div className="login-gate-container">
        <div className="login-gate-brand">
          <div
            ref={logoRef}
            className="login-brand-logo"
            onMouseEnter={replayLogoAnim}
            onFocus={replayLogoAnim}
            tabIndex={0}
            role="banner"
            aria-label="TOP-X"
            style={{ cursor: 'pointer' }}
          >
            {/* Preserved 8-Polygon Angular Geometric Mark */}
            <svg className="lg" viewBox="340 150 910 500" aria-hidden="true">
              <polygon style={{ '--i': 0, '--dx': '-260px', '--dy': '0px', '--r': '-25deg' }} fill="currentColor" points="538,208 587,254 449,393 579,527 529,577 354,395" />
              <polygon style={{ '--i': 1, '--dx': '260px', '--dy': '0px', '--r': '25deg' }} fill="currentColor" points="1059,208 1239,392 1059,575 1011,527 1143,391 1009,254" />
              <polygon style={{ '--i': 2, '--dx': '-300px', '--dy': '300px', '--r': '0deg' }} fill="var(--ac)" points="988,159 1027,159 547,640 508,640" />
              <polygon style={{ '--i': 3, '--dx': '0px', '--dy': '-220px', '--r': '-30deg' }} fill="#5F5F5F" points="625,255 717,255 796,334 745,383 678,313" />
              <polygon style={{ '--i': 4, '--dx': '-200px', '--dy': '-60px', '--r': '40deg' }} fill="var(--ac)" points="625,367 678,313 745,383 694,438" />
              <polygon style={{ '--i': 5, '--dx': '240px', '--dy': '160px', '--r': '30deg' }} fill="var(--ac)" points="942,334 989,382 897,478 850,430" />
              <polygon style={{ '--i': 6, '--dx': '-60px', '--dy': '240px', '--r': '-30deg' }} fill="#5F5F5F" points="770,433 813,390 850,430 897,478 959,544 871,544" />
              <polygon style={{ '--i': 7, '--dx': '0px', '--dy': '-120px', '--r': '90deg' }} fill="#FFA477" points="832,369 870,410 850,430 813,390" />
            </svg>
            <span>TOP-<span style={{ color: 'var(--ac, #ff7a1a)' }}>X</span></span>
          </div>
          <h1>
            Code. Compete.<br />
            <span style={{ color: 'var(--ac, #ff7a1a)' }}>Conquer.</span>
          </h1>
          <p>The student-driven competitive programming platform.<br />Track LeetCode, Codeforces &amp; CodeChef with campus peers.</p>
        </div>

        <div className="login-gate-form-card">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="login-gate-close-btn"
              aria-label="Close sign in dialog"
            >
              ✕
            </button>
          )}

          <div style={{ marginBottom: '22px' }}>
            <h2 style={{
              fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
              fontSize: '22px',
              fontWeight: 850,
              color: '#0d0d0f',
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em'
            }}>
              Student Sign In
            </h2>
            <p style={{
              fontSize: '13.5px',
              lineHeight: 1.55,
              color: '#525866',
              margin: 0
            }}>
              Sign in with your Google account to access your Top-X student dashboard, synchronize daily problem solves, and track leaderboard standings.
            </p>
          </div>

          {/* Continue with Google button */}
          <button
            type="button"
            className="btn-google"
            id="gate-btn-google"
            onClick={handleGoogleClick}
            disabled={googleLoading}
            aria-label="Continue with Google"
          >
            {googleLoading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: 'topxSpin 1s linear infinite' }}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                <span>Signing in with Google...</span>
              </span>
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

          {error && (
            <div
              role="alert"
              style={{
                marginTop: '16px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#FEF2F2',
                color: '#991B1B',
                border: '1.5px solid #DC2626',
                boxShadow: '2.5px 2.5px 0 #991B1B',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '12.5px',
                fontWeight: 650,
                lineHeight: 1.45
              }}
            >
              {error}
            </div>
          )}

          <div style={{
            marginTop: '22px',
            paddingTop: '16px',
            borderTop: '1px solid #f0f0ed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#6b7280',
            fontSize: '12px',
            lineHeight: 1.4
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff7a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Verified student accounts only. Multi-judge daily synchronization is tied to your Google profile.</span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes topxSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
