'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/hooks/useAuth';
import { KeyRound, Loader2, AlertCircle, ShieldCheck, Lock } from 'lucide-react';

export default function LoginPage() {
  const [adminKey, setAdminKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleKeyLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      setLocalError('Please enter the Master Admin Security Key.');
      return;
    }
    setLocalError('');
    setIsSubmitting(true);
    try {
      await login(adminKey.trim());
      router.replace('/dashboard');
    } catch (err: any) {
      setLocalError(err?.message || 'Access denied. Invalid master admin credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* TOP-X Rotating Star Mark & Branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
          <span className="brand-star-mark" style={{ fontSize: '26px' }}>✦</span>
          <span className="brand-text" style={{ fontSize: '22px' }}>
            TOP-X <i>ADMIN</i>
          </span>
        </div>

        <h1 className="login-title" style={{ fontSize: '18px', fontWeight: 700 }}>
          Master Operations Console
        </h1>
        <p className="login-subtitle">
          Restricted administrative access. Enter your authorized master key to manage members, verifications, daily challenges, and leaderboard records.
        </p>

        {localError && (
          <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleKeyLogin} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="admin-key">
              Master Admin Secret Key
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-key"
                type="password"
                className="login-input"
                placeholder="Enter secret key..."
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
                autoFocus
                style={{ paddingRight: '36px', fontFamily: 'var(--font-mono)' }}
              />
              <KeyRound
                size={16}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={isSubmitting || !adminKey.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <Lock size={15} />
                <span>Authenticate & Access Console</span>
              </>
            )}
          </button>
        </form>

        <div className="login-hint">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <ShieldCheck size={13} style={{ color: 'var(--accent)' }} />
            <span>Cryptographic timing-safe verification enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
}
