'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  CalendarDays,
  Award,
  BarChart3, 
  ShieldAlert, 
  LogOut, 
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'User Directory', href: '/users', icon: Users },
    { label: 'Weekly Tasks', href: '/tasks', icon: CalendarCheck },
    { label: 'Event Registration', href: '/events', icon: CalendarDays },
    { label: 'Streak Rewards', href: '/streak-rewards', icon: Award },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Audit Logs', href: '/audit', icon: ShieldAlert },
  ];

  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose} 
        aria-hidden="true" 
      />
      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-star-mark">✦</span>
          <span className="brand-text">
            TOP-X <i>ADMIN</i>
          </span>
          <span className="sidebar-brand-badge">CONTROL</span>
          <button 
            type="button" 
            className="mobile-close-btn" 
            onClick={onClose} 
            style={{ marginLeft: 'auto', display: isOpen ? 'flex' : 'none' }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Operations</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="sidebar-section-label">System</div>
          <div style={{ padding: '4px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
              <span>RLS & Secret Enforced</span>
            </div>
            <div>Timezone: Asia/Kolkata</div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">AD</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Authorized Admin</div>
              <div className="sidebar-user-role">Super Administrator</div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out of Admin Session"
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color var(--transition-fast)'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
