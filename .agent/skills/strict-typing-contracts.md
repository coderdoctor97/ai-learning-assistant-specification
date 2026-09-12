---
name: strict-typing-contracts
summary: Type inference, strict interface definitions, and type error resolution.
track: core
phase: build
triggers:
  - "type error / TS strict mode"
  - "interface / type definition / contract"
  - "type inference / generic constraints"
  - "any leak / unsafe cast"
  - "zod ↔ TS type alignment"
not_for:
  - "Runtime validation of payloads (zod schemas at the wire) -> openapi-contract / form-management"
  - "Executing bulk mechanical type migrations -> ast-codemods (this skill designs the contract)"
  - "Style lint findings -> lint-formatting"
---

# strict-typing-contracts

## Single responsibility
Own **compile-time contracts**: strict interface/type definitions, inference quality (no leaked `any`,
no unjustified `as` casts), generic constraint design, and resolving type errors at the *design* level —
fix the contract, not the symptom.

## Owns
- Interface contracts: discriminated unions over flag-boolean soup, closed shapes (no "optional
  everything"), `strict: true` discipline per this repo's tsconfig.
- Inference: generics that infer rather than annotate, constraint design, narrowing patterns, typed
  wrappers for untyped boundaries; hunting `any`/`unknown` leaks.
- Type error resolution: root-cause the contract mismatch, fix at the source type, keep
  `npm run typecheck` (`tsc --noEmit`) green.
- zod ↔ TS alignment: where a runtime schema and a compile-time type describe the same data, derive one
  from the other so they cannot drift.

## Does not own (handoffs)
- Runtime validation behavior at the wire (the zod schemas themselves) → `openapi-contract` (API) /
  `form-management` (forms).
- Executing a bulk type-signature migration across many files → `ast-codemods`.
- Lint/style findings → `lint-formatting`.
