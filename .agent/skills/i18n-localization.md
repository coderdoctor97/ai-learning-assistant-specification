---
id: i18n-localization
description: Extract hardcoded strings, validate ICU message syntax, and audit pluralization coverage.
responsibility: Make the interface localizable — extract hardcoded strings into message catalogs, validate ICU message syntax, and audit pluralization and locale coverage.
track: core
phase: build
priority: 9
triggers:
  - "i18n"
  - "localization"
  - "ICU"
  - "hardcoded string"
  - "pluralization"
not_for:
  - "Producing the translated content itself -> out of scope (human/MT translation process)"
  - "Locale-aware layout/design decisions -> frontend-design"
  - "Typing the message access API -> strict-typing-contracts"
---

# i18n-localization

## Single responsibility
Make the codebase ready for other languages. Extract user-facing strings into catalogs with stable
keys, validate message syntax (ICU MessageFormat), and audit coverage: pluralization categories,
missing translations, and locale-dependent assumptions (dates, numbers, direction).

## Owns
- Extraction: hardcoded user-facing string detection, stable key naming, catalog structure,
  context preserved (parameter meanings documented).
- ICU validation: syntax checks, plural/select correctness, argument matching, no code in messages.
- Coverage audit: pluralization categories per locale, missing/unused keys, RTL and text-width
  assumptions flagged to design.

## Does not own (handoffs)
- The translations themselves → external process (this skill prepares and verifies the surface).
- Locale-aware visual design (spacing, direction) → `frontend-design`.
- Type-safe message access at compile time → `strict-typing-contracts`.
