# TOP-X — Next.js App Router + PostgreSQL

A unified Next.js App Router migration of TOP-X. The UI, React components, and backend API Route Handlers run inside a single Next.js application without Express or a dual-port server architecture. Original API business logic and PostgreSQL persistence are fully preserved.

---

## Tech Stack & Architecture

- **Framework**: Next.js 15 (App Router, React 18, TypeScript)
- **API Runtime**: Next.js Route Handlers (`app/api/**/route.ts`) executing inside Node.js runtime
- **In-Process API Bridge**: `lib/next-api-bridge.cjs` and `lib/api/route-registry.cjs` dispatch all existing API endpoints without Express or open TCP sockets
- **Database / Persistence**: Neon Serverless PostgreSQL (`@neondatabase/serverless`) via `DATABASE_URL`
- **Persistence**: PostgreSQL is required in every environment; the app returns an explicit service-unavailable error if it cannot connect.
- **Styling**: Vanilla CSS design system (`app/legacy.css` and `app/globals.css`)
- **Icons**: Lucide React

---

## Directory Structure

```
topxcpdsa/
├── app/                  # Next.js App Router pages, layout, and API Route Handlers
│   ├── api/              # Catch-all and specific Next.js Route Handlers
│   ├── globals.css       # App styling overrides
│   ├── layout.tsx        # Root HTML layout with legacy design tokens
│   ├── legacy.css        # Core TOP-X design system
│   └── (routes)/         # Feature pages: /dashboard, /problems, /leaderboard, etc.
├── components/           # React feature views and page wrappers
│   ├── layout/           # App navigation shell (Navbar, Sidebar, Footer)
│   └── legacy-src/       # Preserved React feature tree & state hooks
├── lib/                  # Server-side bridges & route dispatcher
│   ├── api/              # route-registry.cjs & next-api-runtime.ts
│   └── next-api-bridge.cjs # Lightweight in-process Express-compatible request router
├── public/               # Static assets for the active Next.js app
│   └── icons/            # PWA and browser icons
├── tests/                # Node test suites (API migration, SSR safety, React sources)
├── scripts/              # Project utilities
├── .env.example          # Documented environment variable template
└── .env.local            # Local development secrets (git-ignored)
```

---

## Environment Variables & Configuration

Copy `.env.example` to `.env.local` to configure your environment:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. The app does not start API requests without a reachable database. |
| `ADMIN_KEY` | Yes (min 24 chars in prod) | Secret key for administrative endpoints (`/api/admin/*`) and HMAC signatures. |
| `SESSION_SECRET` | Yes (min 32 chars in prod) | Secret key used for signing user authentication session tokens. |
| `CRON_SECRET` | Yes for scheduled refresh | Long, random secret used to authorize the GitHub Actions leaderboard refresh; configure the same value in Vercel and GitHub Actions secrets. |
| `NODE_ENV` | Optional | `development`, `production`, or `test` (defaults to `development`). |
| `APP_ORIGIN` | Optional | Allowed CORS origin (defaults to `http://localhost:3000`). |
| `PORT` | Optional | Port for Next.js HTTP server (defaults to `3000`). |

> **Note on External Competitive Programming APIs**:
> Synchronizations with **Codeforces**, **LeetCode**, and **CodeChef** use public APIs and endpoints. **No third-party API keys are required.**

GitHub Actions is the **only scheduled driver** for the leaderboard refresh (3:30 AM India time). The Vercel Cron entry is intentionally disabled to prevent duplicate runs. Configure `CRON_SECRET` in Vercel and as a GitHub repository secret; also configure `APP_ORIGIN` (the deployed main-app URL) in GitHub repository secrets. The workflow processes resumable batches and failed accounts are deferred with backoff so they do not block healthy users. Scheduled GitHub workflows run from the repository's default branch, so merge this workflow to that branch.

---

## Database & Persistence Setup

### PostgreSQL via Neon
1. Create a serverless PostgreSQL database on [Neon](https://neon.tech).
2. Set `DATABASE_URL` in `.env.local`.
3. The schema uses PostgreSQL JSONB user/state tables and automatically initializes required indexes, cron leases, and shared rate-limit storage on first boot.
4. Verify connectivity by querying `GET /api/health`; it actively probes PostgreSQL and reports database/admin/cron configuration checks.

### Supabase Note
Supabase is not configured or used in this project. Neon PostgreSQL via `@neondatabase/serverless` is the sole persistence layer.

---

## Local Development & Testing

### 1. Install dependencies
```bash
npm install
```

### 2. Run development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Verification & test commands
- **`npm run check`**: Runs syntax checks and Node test suites validating API migration integrity and SSR safety.
- **`npm test`**: Runs the complete test suite across `tests/*.test.js` and `tests/*.test.cjs`.
- **`npm run build`**: Compiles the Next.js production build and prerenders static routes.
- **`npm start`**: Runs the production Next.js server.

---

## Browser Storage and Sessions

User and admin sessions use HttpOnly, same-site cookies. Theme selection follows the system preference and can be changed for the current page session. Roadmap and problem-vault progress is stored in the PostgreSQL user record; guest changes are temporary and are not saved in the browser.

---

## Active App Scope

The Next.js application is the supported TOP-X app. The standalone static legacy bundle and its source archive have been removed. The 3D algorithm visualizers and their runtime assets are also no longer part of the app. Icon-generation scripts remain in `scratch/`, and their generated assets remain in `public/icons/`.
