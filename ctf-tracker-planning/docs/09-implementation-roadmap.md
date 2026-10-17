# 9. Implementation Roadmap

**Implementation status:** Not started. This document is a plan only.

## Phase 1 — Specification, repository, and test foundation

Deliverables:
- Create repository and build configuration.
- Establish TypeScript types and schema version.
- Define message contracts.
- Create test fixtures and baseline test setup.
- Verify current CTFtime event and listing markup.
- Define supported browser versions and permission strategy.

Exit criteria:
- Requirements map to tests.
- Build can produce a loadable skeleton.
- Current page structures have been inspected and fixture-backed.
- No unresolved product-level blocker remains.

## Phase 2 — Detection and capture

Deliverables:
- CTFtime event-page detection.
- CTFtime listing detection where supported.
- Parser and normalizer.
- Top-right prompt.
- Saved-status indicator.
- Dismissal behavior.
- Manual capture.
- Supported external detector.
- Deduplication.

Exit criteria:
- New, saved, dismissed, malformed, and duplicate cases behave as specified.
- Parser failures never fabricate data.

## Phase 3 — Storage and event management

Deliverables:
- `chrome.storage.local` repository.
- Schema migration strategy.
- Five statuses.
- Solo/team fields.
- Event CRUD operations.
- Popup quick actions.
- Dashboard event list and detail/edit form.

Exit criteria:
- Records persist across ordinary browser restarts.
- Popup and dashboard remain consistent.
- User-verified data is preserved.

## Phase 4 — Reminder engine

Deliverables:
- Four start reminder types.
- Deadline and end reminders.
- Global and per-event preferences.
- Notification click behavior.
- Cancellation and rescheduling.
- Startup reconciliation.
- Delivery history and duplicate prevention.

Exit criteria:
- Unit and integration tests cover all reminder types and lifecycle changes.
- Worker restart and missed-alarm behavior is documented and verified.

## Phase 5 — Dashboard completion and backup/restore

Deliverables:
- Search, filters, sorting.
- Upcoming/live/ended views.
- Settings.
- JSON export.
- Import preview, validation, merge, and conflict resolution.
- Notification permission warnings.

Exit criteria:
- All core management and backup workflows work without visiting the original site.

## Phase 6 — QA and release

Deliverables:
- Security review.
- Browser compatibility checks.
- Accessibility pass.
- Build/package verification.
- README, installation, permissions, privacy, troubleshooting, and known limitations.
- Versioned release artifact.

Exit criteria:
- Release checklist passes.
- No known critical defect remains.

## Dependencies and sequencing

- Detection depends on verified current page structure and URL patterns.
- Reminders depend on a stable event schema and timestamp policy.
- Dashboard depends on repository/message contracts.
- Import/export depends on schema versioning and identity rules.
- Release depends on permission review and browser compatibility tests.

## Definition of done

A release is complete only when the packaged extension is installable, the source and instructions are present, automated tests pass, the six reminder categories work within Chromium's best-effort limits, local records are recoverable through JSON, and the documented acceptance criteria are met.
