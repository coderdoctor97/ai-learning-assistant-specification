---
name: otel-observability
summary: OpenTelemetry tracing, span propagation, and structured logs.
track: backend
phase: build
triggers:
  - "OpenTelemetry / OTel"
  - "tracing / spans"
  - "context propagation / correlation id"
  - "structured logs / JSON logs"
  - "instrument a route / dependency call"
not_for:
  - "Dashboards / alerting rules (consumers of the signal) -> out of scope here"
  - "Auth decision policy -> auth-security (this skill logs the decision)"
  - "Rate-limit / breaker behavior -> resiliency-rate-limiting"
  - "Browser-side evidence capture -> browser-use-qa (frontend)"
---

# otel-observability

## Single responsibility
Own the **signal pipeline**: OpenTelemetry tracing across the backend (route handlers, provider-gateway calls,
DB access, queue jobs), context propagation so one request is one trace end-to-end, and structured logs that
carry the same correlation id. This skill produces signals; it never owns the behavior it instruments.

## Owns
- Span model: named span per logical operation, attributes that make a trace debuggable (route, hashed user id,
  job id), span events for notable state changes.
- Propagation: W3C `traceparent` across async boundaries, downstream provider-gateway calls, queue messages,
  and into log lines.
- Structured logging: JSON logs, level discipline, correlation id on every line, PII rules (what never gets logged).

## Does not own (handoffs)
- The auth policy / role checks themselves → `auth-security` (log their outcome here).
- Limiter/breaker configuration → `resiliency-rate-limiting` (log their state transitions here).
- Where traces/logs are stored and alerted on → infrastructure (`iac-provisioning`'s domain, not this code).
