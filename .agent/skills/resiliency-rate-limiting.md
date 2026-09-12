---
name: resiliency-rate-limiting
summary: Redis sliding-window limiters and circuit breakers.
track: backend
phase: build
triggers:
  - "rate limit / 429"
  - "sliding-window limiter"
  - "circuit breaker"
  - "throttle an endpoint / protect a dependency call"
  - "retry storm / graceful degradation"
not_for:
  - "Provisioning the Redis instance -> iac-provisioning"
  - "Background-job retries (job semantics, not service protection) -> queue-workers"
  - "Authorization policy -> auth-security"
  - "Making queries fast -> query-optimization"
---

# resiliency-rate-limiting

## Single responsibility
Own **protection under failure and abuse**: Redis-backed sliding-window rate limiters for routes and users,
and circuit breakers around external dependencies (notably this app's provider gateway). The goal is graceful
degradation, not cascading failure or silent retry storms.

## Owns
- Sliding-window limiters: per-route and per-identity windows/limits, atomic Redis (Lua) increments,
  `429` responses with `Retry-After`, tiered budgets.
- Circuit breakers: closed/open/half-open states, failure thresholds (error ratio + minimum volume),
  open-state timeout, half-open probing, per-dependency instances (provider gateway, upstream HTTP).
- Fallback strategy: what callers get while open (queue, degraded response, explicit error) — never a silent storm.

## Does not own (handoffs)
- Redis instance/provisioning → `iac-provisioning`.
- Worker-internal job retries → `queue-workers`.
- Tracing of breaker state transitions and limiter rejections → `otel-observability`.
