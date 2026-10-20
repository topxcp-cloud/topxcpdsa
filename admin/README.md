# TOP-X — Production Admin Panel

A standalone, secure, enterprise-grade administrative dashboard and governance console for **Top-X**. Built inside `admin/` to ensure full structural isolation while querying the unified Supabase and backend database layers.

---

## Architecture & Isolation Overview

The admin application is built as an independent Next.js application that can be run side-by-side during local development or deployed independently on **Vercel** pointing to the **Railway**-hosted backend API.

```
admin/
├── app/                  # Next.js App Router
│   ├── analytics/        # Telemetry, demographics, platform distribution
│   ├── audit/            # Administrative actions & governance audit trail
│   ├── dashboard/        # Operational overview, live metrics, 30-day trends
│   ├── events/           # Event setup, registration forms, CSV export, attendee search
│   ├── login/            # Cryptographic timing-safe admin key login
│   ├── tasks/            # Weekly completion metrics and challenge scheduling
│   ├── users/            # Searchable, filterable member directory
│   │   └── [id]/         # Detailed member dossier & moderation controls
│   ├── layout.tsx        # Root layout with AuthProvider & admin.css
│   └── page.tsx          # Smart root redirect
├── src/
│   ├── components/       # Reusable components (Sidebar, Header, AdminLayout)
│   ├── hooks/            # useAuth authentication hook
│   ├── services/         # Centralized HTTP client (api.ts)
│   ├── styles/           # Fixed white-and-orange admin design system (admin.css)
│   └── types/            # Strict TypeScript interfaces
├── .env.example          # Environment template
├── package.json          # Dependency specification
├── tsconfig.json         # TypeScript configuration with path aliases
└── README.md             # Architecture & deployment manual
```

---

The Weekly Tasks page reports verified question completions by task and member over the last seven days. Event Registration lets admins create multiple open or closed events, configure per-event fields and required flags, upload a compressed event image directly or provide an image URL, add an event information link, review and search submissions, and export every registration to a CSV spreadsheet with a registration timestamp and one column per configured field. Streak Rewards lists members who claim verified 30-, 50-, 75-, and 100-day consistency milestones, including their contact and academic profile details. The admin panel uses a permanent white-and-orange theme; leaderboard navigation is not part of the admin console.

## Security Model & Authentication

1. **Cryptographic Secret Verification**:
   - Access requires a server-side `ADMIN_KEY` (minimum 24 characters in production).
   - Validation uses `crypto.timingSafeEqual` to prevent timing attacks.
   - On successful authentication, the server generates a signed ephemeral admin session token (`topx_admin_token`).
2. **Server-Side Route Protection**:
   - All `/api/admin/*` endpoints enforce administrative authentication middleware.
   - Unauthenticated callers are rejected with HTTP 401.
3. **No Secret Exposure**:
   - `ADMIN_KEY`, database passwords, and Supabase service role keys are never bundled into client-side code or `NEXT_PUBLIC_*` environment variables.
4. **Audit Trail & Destructive Action Safeguards**:
   - Actions like suspension, restoration, blacklisting, handle verification, and soft-deletion require mandatory justification.
   - Every action is immutably recorded in the administrative audit log with the acting admin, target member, justification, and timestamp formatted in India Standard Time (`Asia/Kolkata`).

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Description | Default (Local) |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the main TOP-X API | `http://localhost:3000` |
| `NODE_ENV` | Application environment (`development` / `production`) | `development` |
| `PORT` | Local dev port for admin panel | `3001` |

---

## Running Locally

1. **Start the Main TOP-X API Server** (Port 3000):
   ```bash
   npm run dev
   ```

2. **Start the Admin Panel Dev Server** (Port 3001):
   ```bash
   cd admin
   npm run dev
   ```
   Open [http://localhost:3001](http://localhost:3001) in your browser.

3. **Log In**:
   - Enter your configured `ADMIN_KEY` (set in root `.env.local`).
   - The panel immediately unlocks live database metrics and moderation controls.

---

## Deployment Guide

### Deploying on Vercel (Independent Frontend)
1. In the Vercel dashboard, select **Add New Project** and pick this repository.
2. Set the **Root Directory** to `admin`.
3. Set the Environment Variable:
   - `NEXT_PUBLIC_API_BASE_URL`: `https://your-main-app-or-railway.railway.app`
4. Deploy. Vercel automatically runs `next build` and serves the admin panel.

### Deploying on Railway (Unified API / Backend)
The backend routes in `lib/api/route-registry.cjs` already host all `/api/admin/*` endpoints. Ensure that `ADMIN_KEY` is configured in your Railway environment variables with a cryptographically secure random string (minimum 24 characters).
