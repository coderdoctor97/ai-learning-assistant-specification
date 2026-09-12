---
name: db-migrations
summary: Schema changes, safe down-migrations, and locking prevention.
track: backend
phase: build
triggers:
  - "schema change / DDL"
  - "add a column / table migration"
  - "drizzle-kit generate / push"
  - "down-migration / rollback"
  - "avoid table locks / long DDL"
not_for:
  - "Designing indexes/rewrites for a slow query -> query-optimization (this skill ships that DDL)"
  - "Ephemeral test databases and fixtures -> testcontainers-integration"
  - "Provisioning the database service itself -> iac-provisioning"
---

# db-migrations

## Single responsibility
Own every **schema change**: author forward *and* down migrations, keep them safe to run in production
(no long locks, no data loss), and treat data backfills as separate, resumable steps. In this repo that means
the Drizzle pipeline (`drizzle.config.json`, `drizzle-kit`).

## Owns
- Migration pairs: forward + matching down; additive-first (nullable or defaulted columns), backfill-then-constrain ordering.
- Locking prevention: expand–contract pattern (add nullable → backfill in batches → set default → drop old
  column), no DDL inside long transactions, idempotent statements.
- Rollback runbook: what the down does, what data is unrecoverable, how post-apply state is verified.

## Does not own (handoffs)
- *Which* indexes or query rewrites fix a slow query → `query-optimization` (it plans; this skill ships the DDL).
- Applying migrations against ephemeral test instances → `testcontainers-integration`.
- Managed DB/RDS provisioning and connection settings → `iac-provisioning`.
