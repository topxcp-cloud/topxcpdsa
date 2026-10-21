'use client';
import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
}

export function AdminLayout({
  children,
  title = 'Overview',
  searchValue,
  onSearchChange,
  searchPlaceholder
}: AdminLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        background: 'var(--bg-base)',
        color: 'var(--text-secondary)'
      }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--accent)' }} />
        <div style={{ fontSize: '13px', fontWeight: 500 }}>Verifying cryptographic admin session...</div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        textAlign: 'center',
        background: 'var(--bg-base)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--danger-soft)',
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Admin Access Required</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', marginBottom: '24px', fontSize: '13.5px' }}>
          This zone is restricted to authorized TOP-X administrators. Client credentials must be verified with cryptographic timing-safe validation.
        </p>
        <button
          onClick={() => router.replace('/login')}
          style={{
            padding: '10px 20px',
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '13px'
          }}
        >
          Sign In as Admin
        </button>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="admin-main">
        <Header
          title={title}
          onOpenMobileMenu={() => setMobileOpen(true)}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
