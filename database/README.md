# PostgreSQL setup and verification

TOP-X uses PostgreSQL as its only persistence layer. The current schema stores the application state in a single `topx_app_state` row using JSONB; this is persistent PostgreSQL storage, but it is not yet a normalized relational schema.

## Local setup

1. Create a PostgreSQL database using Neon or another PostgreSQL provider supported by `@neondatabase/serverless`.
2. Copy `.env.example` to `.env` and configure `DATABASE_URL`, `ADMIN_KEY`, and `SESSION_SECRET`.
3. Run `npm install`, `npm run check`, `npm run build`, and `npm test`.
4. For API integration tests, use a disposable test database. Tests register users and mutate application state; do not point them at production data.

## GitHub Actions integration tests

Add a repository Actions secret named `TOPX_TEST_DATABASE_URL` that points to a disposable PostgreSQL test database. CI always runs source checks and the production frontend build. When that secret is configured, CI also runs the API integration tests against the database; otherwise that step explicitly reports a skip.

## Legacy JSON import

If migrating an old `data/db.json`, back it up first, then run `npm run migrate:json` with the destination PostgreSQL URL configured. The import script is intended as a one-time migration, not as an active JSON persistence fallback.
