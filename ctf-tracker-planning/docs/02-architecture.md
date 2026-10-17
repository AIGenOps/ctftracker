# 2. Architecture and Technical Design

## 2.1 Proposed stack

- Chromium Manifest V3.
- TypeScript.
- Vite build tooling.
- React for popup/dashboard UI (proposed, not mandatory).
- `chrome.storage.local` as the primary local store.
- `chrome.alarms` for reminder scheduling.
- `chrome.notifications` for browser notifications.
- Automated tests using a TypeScript-compatible test runner and browser API mocks.

No server or database backend is required for v1.

## 2.2 Logical architecture

```text
CTFtime pages ───────┐
                     ├─> Content script / detection
Supported external ──┘          |
                                v
                      Event parser/normalizer
                                |
                                v
                      Background service worker
                       /        |          \
                      v         v           v
                 Validation  Storage    Alarm manager
                 & identity  repository      |
                      |         |            v
                      v         v       Notifications
                chrome.storage.local
                      |
             ┌────────┴────────┐
             v                 v
         Popup UI          Dashboard UI

Manual entry ───────────────> Background service worker
JSON import/export <────────> Validated event repository
```

## 2.3 Component responsibilities

### Manifest/build
- Declare extension entry points, permissions, content scripts, and host access.
- Produce a loadable unpacked extension build.
- Avoid including development server settings in production output.

### Content scripts
- Run only on permitted/supported domains.
- Detect the current page type.
- Parse or request parsing of relevant page details.
- Render and manage the top-right prompt.
- Send structured messages; never treat page content as trusted instructions.
- Avoid writing shared state independently if a background repository can coordinate writes.

### CTFtime parser
- Recognize supported event URL patterns.
- Extract event ID and available event details.
- Be isolated from UI components.
- Include fixture-based tests using representative saved HTML samples.
- Return structured parse results with missing fields and confidence/verification information.

### External detector
- Use explicit, maintained site patterns or page signatures.
- Do not attempt arbitrary universal scraping in v1.
- Provide manual capture for unsupported sites.
- Be designed so a new site rule can be added without rewriting the application.

### Event normalizer
- Validate names, URLs, timestamps, source IDs, and enumerated fields.
- Normalize URLs without removing meaningful query parameters blindly.
- Convert known instants to normalized ISO 8601 values.
- Preserve source timezone metadata when available.
- Never guess an ambiguous timezone.

### Background service worker
- Route messages from content scripts and extension pages.
- Coordinate event create/update/delete operations.
- Perform identity checks and deduplication.
- Persist records and preferences.
- Schedule/reconcile alarms.
- Handle notification clicks.
- Recover after service-worker startup.

### Event repository
- Encapsulate storage access.
- Validate records on read/write.
- Provide centralized create, update, delete, query, import, and export operations.
- Use schema migrations.
- Avoid assuming storage writes are transactional across multiple independent operations.
- Re-read current state before applying potentially concurrent updates.

### Alarm manager
- Generate deterministic reminder keys.
- Schedule, cancel, and rebuild alarms.
- Track delivery history.
- Reconcile after startup, event changes, import, status changes, and lifecycle changes.
- Treat alarms as best-effort rather than exact timers.

### Popup
- Show active-tab event and status.
- Offer quick add/status actions.
- Show next upcoming event and notification state.
- Link to full dashboard.

### Dashboard
- Provide search, filters, sorting, event detail/editing, reminder configuration, and backup/restore.
- Read and write via the same repository/message contracts as the popup.

## 2.4 Proposed repository layout

```text
ctf-tracker/
├── README.md
├── LICENSE
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── icons/
├── src/
│   ├── background/
│   │   ├── service-worker.ts
│   │   ├── message-router.ts
│   │   └── alarm-manager.ts
│   ├── content/
│   │   ├── detector.ts
│   │   ├── ctftime-parser.ts
│   │   ├── external-detector.ts
│   │   └── prompt.ts
│   ├── core/
│   │   ├── event-schema.ts
│   │   ├── event-normalizer.ts
│   │   ├── deduplication.ts
│   │   ├── event-repository.ts
│   │   ├── reminder-rules.ts
│   │   └── migrations.ts
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── dashboard/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── options/
│   │   └── settings.tsx
│   └── tests/
│       ├── parser.test.ts
│       ├── deduplication.test.ts
│       ├── storage.test.ts
│       ├── reminder-rules.test.ts
│       └── import-export.test.ts
└── fixtures/
    └── ctftime/
```

This is a proposed layout, not an existing codebase.

## 2.5 Message contracts

Messages should be typed and validated. Suggested operations:
- `DETECT_EVENT`
- `GET_EVENT_BY_SOURCE`
- `CREATE_EVENT`
- `UPDATE_EVENT`
- `DELETE_EVENT`
- `LIST_EVENTS`
- `SET_EVENT_STATUS`
- `RECONCILE_REMINDERS`
- `EXPORT_DATA`
- `IMPORT_PREVIEW`
- `IMPORT_APPLY`
- `GET_SETTINGS`
- `UPDATE_SETTINGS`

Every message should have a known operation, validated payload, and explicit success/error result. Do not accept arbitrary executable content or arbitrary storage paths from a content script.

## 2.6 Permission design

Candidate permissions:
- `storage`
- `alarms`
- `notifications`
- `tabs` only if required for active-tab URL behavior and navigation
- narrow host permissions for CTFtime and explicitly supported sites

Permission needs must be checked against the final implementation. Avoid `<all_urls>` unless a specific, justified feature truly requires it. Manual capture on arbitrary sites may require active-tab access and a user gesture rather than permanent access to every host.

## 2.7 Architecture invariants

1. Storage is the source of truth; UI state is a view.
2. Participation status and event lifecycle are separate.
3. User-verified data must not be overwritten by weaker or empty parser results.
4. A page visit is not registration proof.
5. Event identity cannot rely on name alone.
6. Alarms are derived state and can be rebuilt from records.
7. Import data is untrusted input.
8. No network/backend dependency is required for normal operation.
