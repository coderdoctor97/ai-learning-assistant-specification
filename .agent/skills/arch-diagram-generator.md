---
id: arch-diagram-generator
description: Generate Mermaid/Excalidraw sequence diagrams, C4 model diagrams, and architecture flowcharts.
responsibility: Produce architecture communication artifacts — Mermaid/Excalidraw sequence diagrams, C4 model diagrams, and system flowcharts — so design discussions stay precise, reviewable, and version-controlled.
track: core
phase: pre-code
priority: 1
triggers:
  - "architecture diagram"
  - "C4"
  - "sequence diagram"
  - "system flow"
not_for:
  - "Mapping how the existing code actually depends -> codebase-semantic-search"
  - "Recording the decision behind the architecture -> adr-author"
  - "Threat-level critique of the diagrammed design -> threat-model-sast"
---

# arch-diagram-generator

## Single responsibility
Draw the architecture. One artifact kind per request: Mermaid/Excalidraw sequence diagrams (who calls
whom, when), C4 diagrams (Context → Container → Component), or system flowcharts (a request through the
system). Diagrams are code in the repo — reviewable, diffable, kept current by the author.

## Owns
- Mermaid `sequenceDiagram` / `flowchart` / `C4Context|Container|Component` source as repo files.
- Excalidraw JSON for hand-drawn architecture sketches needing freeform layout.
- Diagram discipline: one concern per diagram, named participants/containers, a sync note when the
  behavior they depict changes.

## Does not own (handoffs)
- The *actual* dependency graph of the codebase → `codebase-semantic-search` (read-only map).
- The *decision* the diagram illustrates → `adr-author` (the ADR may embed the diagram).
- Threats in the design → `threat-model-sast`.
