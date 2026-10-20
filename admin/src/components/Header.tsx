'use client';
import { Menu, Search, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  title: string;
  onOpenMobileMenu: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
}

export function Header({
  title,
  onOpenMobileMenu,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Quick search...'
}: HeaderProps) {
  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="admin-header-title">{title}</h1>
      </div>

      <div className="admin-header-right">
        {onSearchChange && (
          <div className="admin-search">
            <Search size={16} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
          <span>Admin Session</span>
        </div>
      </div>
    </header>
  );
}
