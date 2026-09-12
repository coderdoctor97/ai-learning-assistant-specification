---
id: mcp-tool-builder
description: Develop Model Context Protocol servers and custom agent tool endpoints.
responsibility: Build the server side of the Model Context Protocol — MCP servers, tool schemas, and agent tool endpoints — so external agents can invoke this system's capabilities safely and predictably.
track: core
phase: build
priority: 12
triggers:
  - "MCP server / MCP tool"
  - "Model Context Protocol"
  - "agent tool"
  - "tool endpoint"
not_for:
  - "Interactive widgets rendered inside MCP clients (frontend) -> mcp-ui-widgets"
  - "Authenticating/authorizing the calling agent -> auth-security"
  - "This app's internal retrieval tools (engine-owned, never user config) -> src/lib/tools (not a skill target)"
  - "Observability of tool calls -> otel-observability"
---

# mcp-tool-builder

## Single responsibility
Expose capabilities to agents. Develop MCP servers and custom tool endpoints: typed tool schemas,
request/response contracts, error semantics, and safe defaults — the *server* side of the protocol.

## Owns
- MCP server development: transports, tool registration, input/output schemas, capability
  negotiation, lifecycle.
- Tool design: single-responsibility tools, explicit parameter schemas, predictable error
  envelopes, idempotency where the operation allows.
- Safety: least-privilege tool sets, no shell-string composition from agent input, rate/size
  guards, audit logging of tool invocations.

## Does not own (handoffs)
- The interactive widget a client renders for a tool's result → `mcp-ui-widgets` (frontend).
- Identity/authorization of callers → `auth-security`.
- Tracing/logging of the calls → `otel-observability`.
