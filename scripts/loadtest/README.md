# Multi-instance load tests (use a DISPOSABLE PostgreSQL database)

Each script starts several copies of the API (like separate serverless instances) against one database.

    DATABASE_URL=postgres://user:pw@localhost:5432/topx_test node scripts/loadtest/lostupdate.cjs "$(pwd)" 60
    DATABASE_URL=postgres://user:pw@localhost:5432/topx_scale SECONDS=40 node scripts/loadtest/scale.cjs "$(pwd)"

* `lostupdate.cjs` - fresh accounts must be visible on other instances, and concurrent writes must not be lost.
* `scale.cjs` - 1000 users (~53 KB each), 3 instances, 70 concurrent users; fails (exit 1) if any acknowledged write is missing.
  Tune with `WRITE_RATIO`, `THINK_MIN`, `THINK_SPREAD`. `scale.cjs` DROPS and recreates the database named in DATABASE_URL.
