# Data model

User records are stored independently in `topx_users`; the shared JSONB document is
reserved for bounded, non-user application state. User reads and writes address a
single row, so requests on separate serverless instances do not depend on a
process-local copy of the user list.

## User records

`topx_users` stores one JSONB user document per user:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `text PRIMARY KEY` | Stable user identifier |
| `data` | `jsonb NOT NULL` | User profile, credentials, activity and progress |
| `version` | `integer NOT NULL DEFAULT 1` | Optimistic concurrency version |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | Last successful row update |

Writes compare the version read with the current row version and increment it
atomically. Conflicting changes are re-read and reapplied up to three times.
Email and Google ID have unique indexes. Additional expression indexes cover
account status, academic year, branch, section, and Pro/solved-count leaderboard
queries. Standalone ranking indexes cover total solved count, current and
longest streak, and total active days.

Admin lists, exports, task progress, and leaderboard reads select only the
required JSONB fields. User activity history remains part of the user document
and is projected only as a bounded recent-activity summary where needed.

## Shared and append-only data

`topx_app_state` uses two row IDs:

* `id = 1` is the original whole-state JSONB document. It is retained unchanged
  as a migration backup.
* `id = 2` stores bounded shared collections: `tasks`, `proProblems`,
  `customResources`, `vaultProblems`, `removedVaultProblemIds`, and
  `adminVerifications`.

The shared row has a version counter and is updated with optimistic concurrency.
`events` are also held in the shared row because the collection is bounded and
shared across users.

High-churn or append-oriented collections have dedicated tables:

* `topx_event_registrations` stores event registrations, uniquely keyed by
  registration ID and by event plus case-insensitive email.
* `topx_audit_log` stores audit records, indexed by target user and creation
  time.
* `topx_streak_reward_claims` stores reward claims, uniquely keyed by user and
  milestone.
* `topx_platform_stats` stores each user's platform handle and synchronized
  stats, keyed by user and platform. Updates to these rows are performed in the
  same transaction as the corresponding user update.

## Legacy migration

Database initialization creates the schema and uses `topx_meta.migrated_v1` as
the one-time migration guard. The migration copies legacy users, shared
collections, registrations, audit records, and reward claims into their new
storage locations in a transaction. Existing destination IDs are not replaced;
unique-identifier conflicts are skipped and logged. The source document at
`topx_app_state.id = 1` remains available as a backup.
