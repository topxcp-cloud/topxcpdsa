/** AppHeader: reusable React shell component. */
export default function AppHeader() {
  return (
<header className="app-header">
    <div className="brand-wrap">
      <a className="brand-logo" href="#dashboard">
        <svg className="topx-rebuilt-mark" viewbox="0 0 48 48" aria-label="TOP-X logo">
          <path d="M5 13 L15 3 L24 12 L15 21 Z" fill="currentColor" opacity=".95" />
          <path d="M43 13 L33 3 L24 12 L33 21 Z" fill="currentColor" opacity=".95" />
          <path d="M5 35 L15 45 L24 36 L15 27 Z" fill="currentColor" opacity=".78" />
          <path d="M43 35 L33 45 L24 36 L33 27 Z" fill="currentColor" opacity=".78" />
          <path d="M9 39 L39 9" stroke="#ff6a2a" strokeWidth="3.8" strokeLinecap="square" />
          <path d="M20 15 L28 23 L20 31 L28 39" fill="none" stroke="#ff8b55" strokeWidth="3" opacity=".9" />
          </svg>
        <span>TOP<i>-X</i></span>
        </a>
      </div>
    
    <nav className="app-nav-tabs" aria-label="Main navigation"><button className="nav-tab-btn active" data-tab="dashboard">Dashboard</button><button className="nav-tab-btn" data-tab="tasks">Daily Tasks <span className="badge-pill" id="nav-tasks-count">3</span></button><button className="nav-tab-btn" data-tab="leaderboard">Leaderboard</button><button className="nav-tab-btn" data-tab="guides">Guides</button><div className="resources-dropdown">
        <button className="nav-tab-btn resources-trigger" type="button" aria-haspopup="true" aria-expanded="false" id="resources-menu-trigger">Resources <span className="resources-chevron">▾</span></button>
        <div className="resources-menu" id="resources-menu" hidden="">
          <button className="nav-tab-btn" data-tab="blueprints">Blueprints</button>
          <button className="nav-tab-btn" data-tab="vault">Problem Vault <span className="badge-pill">16</span></button>
          <button className="nav-tab-btn" data-tab="lab">3D Labs</button>
          <button className="nav-tab-btn" data-tab="roadmaps">Roadmaps</button>
          </div>
        </div></nav>
    
    <div className="header-right">
      
      <button className="search-pill-btn" id="search-pill-btn" title="Open Command Palette (Cmd+K or /)">
        <svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <span>Search anything...</span>
        <kbd>/</kbd>
        </button>
      
      <div className="streak-chip" title="Active practice streak">
        <i />
        <span className="num" id="header-streak-num">0</span><span>day streak</span>
        </div>
      <button className="nav-tab-btn topx-pro-button" data-tab="pro">⚡ Top-X Pro</button>
      
      <div style={{position: 'relative'}}>
        <button className="icon-btn" data-menu-target="menu-notifications" aria-label="Notifications">
          <svg viewbox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          <span className="badge-dot" style={{display: 'none'}} />
          </button>
        <div className="menu-dropdown" id="menu-notifications">
          <div className="menu-header">Notifications</div>
          <div className="menu-item"><strong>No notifications yet</strong><span>Account updates will appear here when available.</span></div>
          </div>
        </div>
      
      <button className="icon-btn" id="theme-toggle-btn" title="Toggle Dark/Light Mode">
        <svg viewbox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        </button>
      <button type="button" className="topx-mobile-menu" id="topx-mobile-menu" aria-label="Open navigation menu" aria-expanded="false"><span /><span /><span /></button>
      
      <button className="header-signin-btn" id="header-signin-btn" style={{display: 'none'}}>
        <svg width="15" height="15" viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
        Sign In
      </button>
      
      <div style={{position: 'relative'}}>
        <button className="profile-pill-btn" id="header-profile-btn" data-menu-target="menu-profile" aria-label="Profile menu" aria-haspopup="true" aria-expanded="false">
          <div className="profile-avatar" id="header-user-avatar" />
          <svg viewbox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        <div className="menu-dropdown" id="menu-profile" style={{width: '260px'}}>
          <div className="menu-header" id="menu-profile-header">Sign in to view your profile</div>
          <a className="menu-item" href="javascript:void(0)" id="open-profile-modal-link"><b>My Profile & CP Sync</b><span>LeetCode, CF & CodeChef</span></a>
          <a className="menu-item" href="#pro"><b>⚡ Top-X Pro Status</b><span>40 CodeChef Tasks Track</span></a>
          <a className="menu-item" href="#tasks"><b>Daily Tasks</b><span>Live Member Submissions</span></a>
          <a className="menu-item" href="#admin" id="profile-admin-link" hidden=""><b>Admin Console</b><span>Secure Resource Manager</span></a>
          <a className="menu-item" href="javascript:void(0)" id="open-auth-modal-link"><span style={{color: 'var(--ac)', fontWeight: '600'}}>Switch Account / Sign In</span></a>
          <a className="menu-item" href="javascript:void(0)" id="header-logout-btn" style={{borderTop: '1px solid var(--line)', marginTop: '4px', paddingTop: '10px'}}><span style={{color: 'var(--hard)', fontWeight: '600'}}>Log Out</span></a>
          </div>
        </div>
      </div>
    <div className="topx-drawer-backdrop" id="topx-drawer-backdrop" hidden="" />
    <aside className="topx-mobile-drawer" id="topx-mobile-drawer" aria-label="Mobile navigation" aria-hidden="true">
      <div className="topx-drawer-heading"><strong>Menu</strong><button type="button" id="topx-drawer-close" aria-label="Close navigation">×</button></div>
      <button className="search-pill-btn topx-drawer-search" id="topx-drawer-search"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg><span>Search anything...</span><kbd>/</kbd></button>
      <nav className="topx-drawer-links" aria-label="Mobile navigation links">
        <button className="nav-tab-btn" data-tab="dashboard">Dashboard</button>
        <button className="nav-tab-btn" data-tab="tasks">Daily Tasks <span className="badge-pill">3</span></button>
        <button className="nav-tab-btn" data-tab="leaderboard">Leaderboard</button>
        <button className="nav-tab-btn" data-tab="guides">Guides</button>
        <button className="nav-tab-btn" data-tab="blueprints">Blueprints</button>
        <button className="nav-tab-btn" data-tab="vault">Problem Vault</button>
        <button className="nav-tab-btn" data-tab="lab">3D Labs</button>
        <button className="nav-tab-btn" data-tab="roadmaps">Roadmaps</button>
        <button className="nav-tab-btn" data-tab="profile">My Profile</button>
        <button className="nav-tab-btn" data-tab="admin" id="topx-mobile-admin" hidden="">Admin</button>
        </nav>
      <a href="#pro" className="topx-pro-button topx-pro-button--wide" data-tab="pro">⚡ Get Top-X Pro</a>
      </aside>
    </header>
  );
}
