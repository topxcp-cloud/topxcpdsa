# PostgreSQL

TOP-X uses PostgreSQL as its only persistence layer. `DATABASE_URL` is required for authenticated and data-backed API routes. The API is served by Next.js Route Handlers; no Express server or separate API port is required. Supabase is not enabled; do not switch providers without an explicit migration plan.
