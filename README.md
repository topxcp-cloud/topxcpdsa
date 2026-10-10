# TOP-X — Next.js App Router + PostgreSQL

This is a Next.js App Router migration of TOP-X. The UI and backend endpoints run inside one Next.js application. Original API business logic and PostgreSQL persistence are retained during the route migration to avoid dropping auth, profile sync, admin and community features.

## Stack
- Next.js App Router, React, TypeScript wrappers
- Next.js Route Handlers with PostgreSQL persistence (`DATABASE_URL` required; no Express dependency)
- Next.js Node Route Handlers dispatch preserved API handlers in-process
- GitHub Actions and contribution templates retained

## Local setup
1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local` and configure `DATABASE_URL`, `ADMIN_KEY`, and `SESSION_SECRET`.
3. Run `npm install`.
4. Run `npm run dev` — the Next.js app, UI, API Route Handlers, and PostgreSQL-backed endpoints run together at http://localhost:3000.
5. For production build: `npm run build`, then `npm start`.

The backend is served by Next.js Route Handlers under `app/api/**/route.ts`; there is no Express HTTP server or second API port. To preserve all existing API behavior during the migration, the original API business handlers are registered in `lib/api/route-registry.cjs` and invoked inside the Next.js Node runtime through `lib/next-api-bridge.cjs`. This compatibility router is an in-process request dispatcher only: it does not listen on a port and does not depend on the Express package. Continue migrating route groups to individually typed Route Handlers over time; all legacy endpoints currently dispatch through the Next.js catch-all handler so they are not silently dropped.

## Route migration notes
- `/` retains the existing TOP-X feature shell during migration.
- App Router pages exist for dashboard, roadmaps, problems, progress, leaderboard, contests, profile, settings and admin. Route groups do not create URL segments; therefore the public and dashboard contests examples cannot both own `/contests`, so this migration keeps one `/contests` route.
- `components/legacy-src` retains original React feature components and hooks as a compatibility layer. Individual pages progressively reuse them.
- PostgreSQL remains the database. The example `supabase/` directory is documentation only; Supabase is not configured.
- Never commit `.env` or production secrets.

## GitHub collaboration
Use feature branches, pull requests, issue templates and the CI workflow under `.github/`. See `CONTRIBUTING.md`.

## Original TOP-X feature preservation

The complete original frontend from the supplied TOP-X archive is preserved without rewriting its source under `legacy-reference/original/`. A browser-runnable copy is also available at:

- `public/legacy/index.html` → open at `/legacy/index.html` while Next.js is running.
- `public/legacy/css/style.css`
- `public/legacy/js/app.js`
- `public/legacy/js/data.js`
- `public/legacy/js/visualizers.js`
- `public/legacy/js/three.min.js`

This compatibility entry point keeps the original DOM, CSS, JavaScript interactions, and Three.js visualizers available while route-by-route App Router migration proceeds. The Next.js routes and React feature components remain the primary structured application; use `/legacy/index.html` if a feature from the original interface has not yet reached feature parity in the new route-specific view. Both frontends call the configured API routes; PostgreSQL remains the backend persistence layer and local JSON persistence is not enabled.

### Original source manifest

The supplied original `index.html`, `css/style.css`, `js/app.js`, `js/data.js`, `js/visualizers.js`, `js/three.min.js`, original `server.js`, `api/index.js`, and `tests/api.test.js` are retained in `legacy-reference/original/` for auditing and feature-parity checks. Do not edit the archived copy as a substitute for the active Next.js source; update the relevant route/component and then refresh the compatibility copy only when needed.


## SSR-safe browser APIs

Browser-only APIs (`window`, `document`, `localStorage`, and `sessionStorage`) must not be accessed during module evaluation or React state initialization. Read persisted state in `useEffect` after the component mounts, initialize server/client state deterministically, and guard storage access because browser storage can be disabled.

Run `npm run check` to execute the source regression test that checks React state initializers for browser-only API access. Run `npm run build` separately to validate Next.js compilation and prerendering. Database-dependent integration tests require a disposable PostgreSQL `DATABASE_URL`.
