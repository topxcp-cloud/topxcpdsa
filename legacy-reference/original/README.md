# TOP-X — Full-stack coding community dashboard

A static HTML/CSS/JavaScript frontend with an Express API, member accounts, coding-platform stat sync, daily tasks, Top-X Pro progress, and a protected admin console.

## Requirements

- Node.js 20+
- A Neon PostgreSQL database for Vercel / production (free tier may be sufficient)
- A unique `ADMIN_KEY` (at least 24 characters) and `SESSION_SECRET` (at least 32 characters)

## Run locally

1. Copy `.env.example` to `.env` and replace `ADMIN_KEY` and `SESSION_SECRET` with unique random values. Leave `DATABASE_URL` commented out for local JSON-backed testing.
2. Install dependencies: `npm install`.
3. Start the server: `npm start`.
4. Open `http://localhost:3000`.

Without `DATABASE_URL`, local development uses `data/db.json`. Do not use local JSON storage for production.

## Deploy to Vercel

1. Push this folder to a Git repository and import it into Vercel.
2. Create a Neon PostgreSQL database and copy its pooled connection string.
3. In Vercel → Project → Settings → Environment Variables, add:
   - `DATABASE_URL`: Neon PostgreSQL connection string (include SSL parameters).
   - `ADMIN_KEY`: long random secret, minimum 24 characters.
   - `SESSION_SECRET`: a *different* long random secret, minimum 32 characters.
   - `APP_ORIGIN`: production site origin, e.g. `https://your-project.vercel.app` (optional; use comma-separated origins if required).
4. Redeploy after setting the variables. The API creates its single-row state table on first startup. For production traffic, note that the current JSONB state-store design is best suited to a small community; a normalized schema/transactional migration is recommended before high-concurrency use.
5. Check `https://your-project.vercel.app/api/health`; production should report `storage: postgres`.

Vercel's filesystem is ephemeral, so PostgreSQL is required for persistent accounts and app data. Never commit `.env`, database credentials, or production secrets.

## Member profile and live platform sync

After creating an account or signing in, use the **My Profile** tab in the main navigation (or the profile menu in the top-right). It includes account name/college editing, connected platform usernames, live statistics, a **Save & sync live data** action, last-sync information, and a **Log out** button. Enter the exact public handle for each platform; no platform passwords or API keys should be entered.

- Codeforces stats use the official public Codeforces API.
- LeetCode and CodeChef stats use public profile-data aggregator endpoints because those platforms do not provide the same simple unauthenticated public stats API. Availability and returned fields may change; sync failures are shown rather than faked.
- If a platform lookup fails, its previously synced stats are cleared so old values are not presented as fresh data.

## Authentication and feature notes

- Email/password accounts use Node's `scrypt` password hashing and signed, expiring API tokens. Member-specific endpoints check the token and account ownership.
- Admin routes require a signed, expiring admin token. There are no hard-coded admin credentials; set `ADMIN_KEY` in the deployment environment.
- Google sign-in is explicitly disabled until a real OAuth client and verified ID-token flow are configured. The API does not trust client-supplied Google emails.
- Codeforces, LeetCode and CodeChef sync can fail when their public APIs or third-party aggregators are unavailable; errors are surfaced instead of replacing real data with fabricated stats.
- Daily-task completion is self-reported, not independently verified against platform submissions. The Pro button submits a manual-review request; Pro status is granted by an authenticated administrator after review.
- External platform stats depend on third-party API availability and rate limits.

## Checks

Run `npm run check` for syntax validation and `npm test` for API integration tests. Then run `npm start` locally and verify registration, login, session restoration, platform sync, daily tasks, and admin access before inviting real users. API integration tests require dependencies installed with `npm install`.

## Local admin console troubleshooting

1. Copy `.env.example` to `.env` in the same folder as `server.js`.
2. Set `ADMIN_KEY` to a unique secret of at least 24 characters (no `ADMIN_KEY=` prefix when entering it in the portal).
3. Stop the server with `Ctrl+C`, then run `npm start` again so the environment is reloaded.
4. Open `http://localhost:3000`, choose **Admin Console**, and paste only the value after `ADMIN_KEY=`. Do not open `index.html` directly as a `file://` URL.
5. If the API reports a missing configuration, check that `.env` is named exactly `.env` (not `.env.txt`) and is beside `server.js`. Check `http://localhost:3000/api/health`; `adminConfigured` should be `true`. Local `.env` values override stale PowerShell variables; on Vercel, dashboard environment variables take precedence.

There is intentionally no built-in default admin password.


### Admin login troubleshooting (local)
- Put `.env` in the same directory as `server.js`.
- Use `ADMIN_KEY=...` in `.env`, then stop the old server with Ctrl+C and restart `npm start` from that directory.
- In the admin key field, paste only the secret value; the login also tolerates pasting the full `ADMIN_KEY=...` line.
- In development, failed login responses return key lengths only (never the secret) to help identify a stale server or mismatched key.


### Admin token troubleshooting
The frontend now preserves an explicitly supplied admin Authorization token instead of replacing it with the member session token. Restart the server and hard-refresh the page after updating.


## Automatic daily-task submission verification
- Daily task cards no longer provide a manual “Mark complete” control.
- The server checks connected handles when the task list is loaded/refreshed, and repeats the check every two minutes while the page is visible.
- Codeforces verification uses the official `user.status` API and requires an `OK` submission for the configured contest ID and problem index.
- LeetCode verification queries the public recent accepted-submission list and matches the configured problem slug. It can only verify problems included in the provider's recent list.
- CodeChef verification requires the profile provider to return a per-problem accepted list. A total solved count alone is not considered proof; when only aggregate data is available, the task remains unverified rather than being falsely marked complete.
- Task `problemCode` or URL must identify the exact platform problem. For custom admin tasks, use the canonical problem URL.
- The platform providers are external and can rate-limit or change. A failed provider request does not mark tasks complete.
