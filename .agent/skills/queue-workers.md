---
name: queue-workers
summary: Background task idempotency, retry policies, and DLQ management.
track: backend
phase: build
triggers:
  - "background job / worker"
  - "queue / task queue"
  - "idempotency / dedupe key"
  - "retry policy / backoff"
  - "dead letter queue / DLQ"
not_for:
  - "Provisioning the queue broker/instance -> iac-provisioning"
  - "Packaging the worker as a container image -> docker-containerization"
  - "Circuit-breaking around the downstream call a job makes -> resiliency-rate-limiting"
  - "Tracing job executions -> otel-observability"
---

# queue-workers

## Single responsibility
Own **background-task behavior**: design jobs to be idempotent under at-least-once delivery, define retry
policies that actually recover (and know when not to), and operate the dead-letter queue so failures stay
inspectable and replayable.

## Owns
- Idempotency: dedupe keys, upsert-style side effects, safe re-runs — exactly-once *effect*, not delivery.
- Retry policy: classifying transient vs. permanent failures, exponential backoff with jitter, max attempts,
  per-job overrides, poison-message detection.
- DLQ: routing rules, inspection tooling, replay with corrected input, aging/alerting handoff.

## Does not own (handoffs)
- Queue broker/instance provisioning → `iac-provisioning`.
- Worker image build and runtime → `docker-containerization`.
- Breakers around external dependencies called by jobs → `resiliency-rate-limiting`.
- Job spans, timings, log correlation → `otel-observability`.
