---
name: mcp-ui-widgets
track: frontend
summary: Interactive UI widgets targeting MCP-protocol apps.
phase: build
triggers:
  - "MCP widget"
  - "UI for an MCP app / MCP UI extension"
  - "widget payload / MCP protocol widget"
  - "MCP client interactive component"
not_for:
  - "Refactoring ordinary React component APIs -> component-composition"
  - "Verifying widgets in a live MCP client -> browser-use-qa"
  - "Aesthetic direction for the widget -> frontend-design"
  - "Building the MCP server / tool endpoints the widget calls -> mcp-tool-builder"
---

# mcp-ui-widgets

## Single responsibility
Build **interactive UI widgets for MCP-protocol applications**: design the widget's data contract (input
schema ↔ widget payload), implement the interactive surface (controls, states, user selections), and keep the
widget self-contained — renderable by an MCP host without leaking app internals.

## Owns
- Widget contract: typed input schema, output events (selection, submission), size/layout negotiation,
  fallback rendering when the host cannot run the widget.
- Interactive widget code: local state, control affordances, empty/loading/error states, host-agnostic build.
- Widget ↔ tool plumbing: mapping user interaction to the MCP tool call that consumes it.

## Does not own (handoffs)
- API-shape refactors of plain app components (no MCP target) → `component-composition`.
- Live verification inside a running MCP host → `browser-use-qa`.
- The widget's look before it is built → `frontend-design`; its a11y → `accessibility-a11y`.
