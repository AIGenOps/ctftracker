# 8. Testing and Quality Assurance Plan

## 8.1 Testing levels

1. Unit tests for parsers, normalization, state transitions, deduplication, and reminder calculations.
2. Repository tests with mocked extension storage.
3. Service-worker tests with mocked alarms and notifications.
4. UI/component tests for prompts, forms, dashboard filters, and errors.
5. Integration tests using representative CTFtime fixtures.
6. Manual browser tests across supported Chromium variants.
7. Release smoke tests on the packaged build.

## 8.2 Test matrix

| ID | Area | Test | Expected result |
|---|---|---|---|
| T-001 | Detection | Valid CTFtime event URL | Correct event ID detected |
| T-002 | Detection | Non-event CTFtime URL | No false event prompt |
| T-003 | Parser | Missing start date | Event can be captured; start reminders omitted |
| T-004 | Parser | Ambiguous timezone | Flag for verification; do not guess |
| T-005 | Prompt | New event detected | Prompt appears once for that page visit |
| T-006 | Prompt | Dismiss without saving | No status change; next visit may prompt again |
| T-007 | Prompt | Save as Registered | Record persists and later visit shows status |
| T-008 | Deduplication | Same event in multiple tabs | One record |
| T-009 | Deduplication | Same name, different source IDs | Separate records |
| T-010 | Merge | Parser returns empty field | Existing useful field preserved |
| T-011 | Status | Each of five states | State persists and UI reflects it |
| T-012 | Reminder | Each start offset | Correct trigger calculated |
| T-013 | Reminder | Deadline missing | Deadline alarm not scheduled |
| T-014 | Reminder | Trigger already past | No expired alarm scheduled |
| T-015 | Reminder | Event time changes | Old alarm cancelled; new alarm scheduled |
| T-016 | Reminder | Event cancelled | Future alarms cancelled |
| T-017 | Reminder | Service worker restarts | Alarm state reconciled |
| T-018 | Reminder | Browser notifications disabled | UI warning shown |
| T-019 | Lifecycle | Event ends | Lifecycle updates; participation status unchanged |
| T-020 | Timezone | Event crosses local midnight | Correct local display |
| T-021 | Timezone | Device timezone changes | Display recalculates correctly |
| T-022 | Import | Malformed JSON | Rejected without partial writes |
| T-023 | Import | Conflicting event | Preview shown before merge |
| T-024 | Import | Same-name unrelated events | Not automatically merged |
| T-025 | Export | Export and restore | Events/preferences preserved |
| T-026 | Security | Unsafe URL scheme | Rejected or shown as non-clickable text |
| T-027 | Security | Hostile event title | Rendered as text, not HTML |
| T-028 | UI | Popup and dashboard update | Both reflect the same stored data |
| T-029 | Manual | Unsupported site | Manual capture works |
| T-030 | Accessibility | Keyboard-only navigation | All core actions reachable |

## 8.3 Required edge-case testing

- Multiple tabs detect the same event simultaneously.
- A CTFtime ID is missing or malformed.
- Event name changes after initial capture.
- Event page redirects to a different official site.
- Start time is updated after some reminders have fired.
- Deadline moves earlier or later.
- Event is postponed without a new date.
- Event is cancelled after registration.
- User marks an event Not Participating after reminders are scheduled.
- User marks an event Participated before the scheduled end.
- Storage is cleared.
- Import includes duplicate records within the same file.
- Import includes unknown schema version.
- Import includes oversized notes or malformed dates.
- Browser is offline (core local features must still work).
- Browser starts after several reminder times have passed.
- Browser notifications are disabled at OS level.
- Device sleeps through a reminder time.
- User changes local timezone.
- Browser extension permissions are revoked.
- CTFtime page layout changes.

## 8.4 Release gates

Do not release until:
- All critical unit and integration tests pass.
- No known critical data-loss, false-registration, or duplicate-notification defects remain.
- Import is non-destructive by default and previews conflicts.
- Service-worker restart reconciliation works.
- Core UI workflows work in supported browsers.
- Permissions and privacy behavior are documented.
- Installation and troubleshooting instructions are complete.

## 8.5 Manual test report template

For each supported browser, record:
- Browser name/version.
- OS/version.
- Extension build version.
- Test IDs executed.
- Pass/fail and reproduction steps.
- Console/service-worker errors.
- Permission state.
- Notification behavior.
- Known deviations.
