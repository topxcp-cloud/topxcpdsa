'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../legacy-src/features/auth/useAuth.js';
import { useFeatureRuntime } from '../legacy-src/runtime/useFeatureRuntime.js';
import AppHeader from '../legacy-src/components/shell/AppHeader.jsx';
import AppFooter from '../legacy-src/components/shell/AppFooter.jsx';
import AuthGate from '../legacy-src/components/shell/AuthGate.jsx';
import DashboardView from '../legacy-src/components/views/DashboardView.jsx';
import LeaderboardView from '../legacy-src/components/views/LeaderboardView.jsx';
import VaultView from '../legacy-src/components/views/VaultView.jsx';
import RoadmapsView from '../legacy-src/components/views/RoadmapsView.jsx';
import TasksView from '../legacy-src/components/views/TasksView.jsx';
import ProfileView from '../legacy-src/components/views/ProfileView.jsx';
import GuidesView from '../legacy-src/components/views/GuidesView.jsx';
import BlueprintsView from '../legacy-src/components/views/BlueprintsView.jsx';
import LabView from '../legacy-src/components/views/LabView.jsx';
import ProView from '../legacy-src/components/views/ProView.jsx';
import AdminView from '../legacy-src/components/views/AdminView.jsx';

const VIEW_MAP: Record<string, any> = {
 dashboard: DashboardView, roadmap: RoadmapsView, problems: VaultView, progress: TasksView,
 leaderboard: LeaderboardView, contests: GuidesView, profile: ProfileView, settings: ProfileView,
 roadmaps: RoadmapsView, vault: VaultView, tasks: TasksView, guides: GuidesView,
 blueprints: BlueprintsView, lab: LabView, pro: ProView, admin: AdminView
};
export default function RouteFeature({ view, title }: { view: string; title?: string }) {
 const auth = useAuth();
 const router = useRouter();
 useFeatureRuntime();
 useEffect(() => {
   const onClick = (event: MouseEvent) => {
     const target = event.target instanceof Element ? event.target : null;
     if (!target) return;

     // The standalone Next.js route pages render AppHeader without AppShell's
     // delegated click handler. Wire the header menus here as well.
     const menuTrigger = target.closest('[data-menu-target]') as HTMLElement | null;
     if (menuTrigger) {
       event.preventDefault();
       const menuId = menuTrigger.dataset.menuTarget;
       const menu = menuId ? document.getElementById(menuId) : null;
       if (menu) {
         document.querySelectorAll('.menu-dropdown.open').forEach((openMenu) => {
           if (openMenu !== menu) openMenu.classList.remove('open');
         });
         const isOpen = menu.classList.toggle('open');
         menuTrigger.setAttribute('aria-expanded', String(isOpen));
       }
       return;
     }

     // Close open menus when the user clicks outside them.
     if (!target.closest('.menu-dropdown')) {
       document.querySelectorAll('.menu-dropdown.open').forEach((menu) => menu.classList.remove('open'));
       document.querySelectorAll('[data-menu-target][aria-expanded="true"]').forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'));
     }

     const nav = target.closest('[data-tab]') as HTMLElement | null;
     if (!nav) return;
     const key = nav.dataset.tab || 'dashboard';
     const routes: Record<string,string> = {dashboard:'/dashboard',roadmaps:'/roadmap',roadmap:'/roadmap',vault:'/problems',problems:'/problems',tasks:'/progress',progress:'/progress',leaderboard:'/leaderboard',guides:'/contests',contests:'/contests',profile:'/profile',settings:'/settings',admin:'/admin',blueprints:'/roadmap',lab:'/roadmap',pro:'/settings'};
     if (routes[key]) { event.preventDefault(); router.push(routes[key]); }
   };
   document.addEventListener('click', onClick);
   return () => document.removeEventListener('click', onClick);
 }, [router]);
 const View = VIEW_MAP[view] || DashboardView;
 return <div className="topx-react-app"><AuthGate authMode={auth.authMode} setAuthMode={auth.setAuthMode} authenticate={auth.authenticate} error={auth.error} setError={auth.setError} isAuthenticated={Boolean(auth.user)}/><AppHeader/><main className="app-view-container"><View active={true} user={auth.user}/></main><AppFooter/></div>;
}
