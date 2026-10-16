'use client';
import { useState, useEffect } from 'react';
import { Menu, Sun, Moon, Search, ShieldCheck } from 'lucide-react';

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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const initial = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

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

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle visual theme"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
          <span>Admin Session</span>
        </div>
      </div>
    </header>
  );
}
