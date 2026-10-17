# CTF Tracker Extension — Planning Pack

**Version:** 1.0  
**Status:** Planning only — no implementation included  
**Prepared:** 17 October 2026

This archive contains the planning documents for a Chromium Manifest V3 extension that detects CTF competitions, tracks registration and participation, and sends browser reminders.

## Contents

- `01-product-requirements.md` — product scope, goals, user stories, functional and non-functional requirements, acceptance criteria.
- `02-architecture.md` — component architecture, data flow, module responsibilities, proposed repository layout, permissions, and technology choices.
- `03-data-model.md` — event schema, state machines, identity/deduplication, timestamp and timezone policy, and storage rules.
- `04-reminders-and-notifications.md` — six reminder categories, scheduling behavior, recovery, delivery history, and edge cases.
- `05-ux-and-interface-spec.md` — popup, top-right overlay, dashboard, settings, empty/error states, and accessibility.
- `06-detection-and-parsing.md` — CTFtime discovery, external-site support policy, manual capture, parser design, and fallback behavior.
- `07-security-privacy-and-permissions.md` — least-privilege permissions, privacy boundaries, data safety, and threat cases.
- `08-testing-and-qa-plan.md` — test strategy, test matrix, release gates, and acceptance checklist.
- `09-implementation-roadmap.md` — phased implementation plan, dependencies, deliverables, and definition of done.
- `10-open-questions-and-decisions.md` — finalized decisions and remaining implementation-time validations.
- `11-json-data-contract-example.json` — illustrative export format with fictional sample data.
- `12-requirements-traceability.csv` — requirements mapped to components and tests.
- `13-release-and-maintenance-plan.md` — packaging, versioning, support, troubleshooting, and maintenance.
- `14-glossary.md` — terminology.

## Important

This is a planning-only package. It contains no working extension, source implementation, compiled build, or claim that a repository has been created. CTFtime page markup and Chromium API behavior must be verified against the actual supported browser versions during implementation.

## Approved product decisions captured here

- Chromium-based browsers; Manifest V3.
- Local-first storage via `chrome.storage.local`.
- Popup plus full dashboard.
- CTFtime, supported external-site detection, and manual capture.
- Five statuses: Interested, Planned, Registered, Participated, Not Participating.
- Solo and team participation.
- Top-right prompt. If dismissed without saving, ask again on the next visit. If saved, show saved status on later visits.
- Reminders: 7 days, 24 hours, 1 hour, and 15 minutes before start; 24 hours before registration deadline; 15 minutes before event end.
- Display event times in the user's local timezone while preserving known source timezone information.
- JSON export and merge-based import.
- Cancellation/postponement lifecycle kept separate from participation status.
- Minimal dark visual style.
- No cloud account, backend, or automatic registration in v1.
