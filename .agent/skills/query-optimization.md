---
name: query-optimization
summary: EXPLAIN analysis, N+1 query elimination, and index planning.
track: backend
phase: review
triggers:
  - "EXPLAIN / query plan"
  - "slow query"
  - "N+1 queries"
  - "index planning / composite index"
  - "query performance"
not_for:
  - "Shipping the index/DDL as a migration -> db-migrations"
  - "Ephemeral databases for reproducing the issue -> testcontainers-integration"
  - "Resilience under load (limiters, breakers) -> resiliency-rate-limiting"
---

# query-optimization

## Single responsibility
Diagnose and fix **data-access performance**: read EXPLAIN plans, eliminate N+1 patterns at the code level,
and plan indexes (composite/partial/covering) with evidence — not vibes. This skill produces the plan and the
code rewrite; applying DDL safely belongs to `db-migrations`.

## Owns
- EXPLAIN analysis: plan shape, sequential scans, missing-index signals, join order, cost breakdown
  (SQLite: `EXPLAIN QUERY PLAN`; Postgres: `EXPLAIN (ANALYZE, BUFFERS)`).
- N+1 elimination: eager loading/joins, `IN` batching, per-request query-count budgets, caching boundaries.
- Index planning: column order, partial indexes for hot filters, covering indexes, write-cost trade-offs,
  and the resulting DDL handed to `db-migrations`.

## Does not own (handoffs)
- Safely applying index/schema DDL in production → `db-migrations`.
- Reproducing against realistic data in an ephemeral DB → `testcontainers-integration`.
- Protecting the API when load is high (rather than making the query fast) → `resiliency-rate-limiting`.
