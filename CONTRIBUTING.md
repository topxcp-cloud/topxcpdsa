# Contributing to TOP-X

Thanks for helping improve TOP-X. Please keep changes focused and preserve existing member/admin flows.

## Workflow
1. Open or select a GitHub issue and clarify expected behavior.
2. Create a branch: `feat/<name>`, `fix/<name>`, `docs/<name>`, or `test/<name>`.
3. Install dependencies and configure a disposable PostgreSQL database using `.env.example`.
4. Implement the change, add tests, and run `npm run check`, `npm test`, and `npm run build` as applicable.
5. Open a pull request using the template; describe risks and include screenshots for UI changes.

## Project layout
- `frontend/src/` — React UI
- `frontend/src/LegacyApp.jsx` — React-rendered full dashboard markup
- `frontend/public/`, `css/`, `js/` — static assets and existing feature compatibility modules
- `app/api/` — Next.js Route Handlers; `lib/api/route-registry.cjs` — preserved API business logic running in-process (no Express server)
- `tests/` — API integration tests
- `docs/` — architecture and development notes
- `database/` — SQL schema/migration notes

## Rules
- PostgreSQL is the only supported persistence backend. Do not reintroduce JSON-file storage.
- Never commit `.env`, credentials, OAuth secrets, user data, or database dumps.
- Validate all data server-side; do not trust client-supplied account IDs or admin status.
- Do not claim a coding problem is solved unless provider submission data verifies it.
- For provider/API changes, surface errors and add tests for malformed or unavailable responses.

## Next.js migration
- Add routes under `app/` using App Router conventions.
- Reuse feature UI from `components/` and keep client-only hooks behind `'use client'`.
- PostgreSQL writes must go through the existing authenticated backend until an endpoint has been deliberately migrated.
- Never commit `.env.local` or production secrets.
