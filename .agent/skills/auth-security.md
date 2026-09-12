---
name: auth-security
summary: OAuth2/JWT middleware, session rotation, and RBAC authorization.
track: backend
phase: build
triggers:
  - "auth middleware / route guard"
  - "OAuth2 / JWT / token validation"
  - "session rotation / revocation"
  - "RBAC / roles / scopes"
  - "per-route access control"
not_for:
  - "Where signing keys and client secrets live and rotate -> iac-provisioning"
  - "Brute-force / abuse throttling on auth endpoints -> resiliency-rate-limiting"
  - "Request/response shape of auth endpoints -> openapi-contract (spec)"
  - "Client-side auth state UI -> frontend track (consumes, never issues)"
---

# auth-security

## Single responsibility
Own **identity and authorization**: the auth middleware pipeline (Next.js middleware / route guards),
OAuth2 + JWT issuance and validation, session lifecycle (rotation, revocation, expiry), and RBAC policy —
which role/scope may hit which route. This is the only skill allowed to decide who is permitted.

## Owns
- Middleware: token acquisition (Authorization header / cookie), validation, principal attached to request context.
- Session lifecycle: rotation on privilege change, revocation, refresh/expiry, safe storage (httpOnly, SameSite).
- RBAC: role/permission model, per-route authorization checks, default-deny, policy kept in one place (not scattered if-checks).

## Does not own (handoffs)
- Secret material (signing keys, OAuth client secrets): storage, rotation, injection → `iac-provisioning`.
- Rate limiting login/token endpoints → `resiliency-rate-limiting`.
- Audit trail of auth decisions (spans, structured logs) → `otel-observability`.
- Contract shape of auth endpoints → `openapi-contract` (this skill implements the behavior).
