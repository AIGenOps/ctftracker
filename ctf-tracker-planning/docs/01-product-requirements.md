# 1. Product Requirements Specification

**Product:** CTF Tracker Extension  
**Version:** 1.0  
**Status:** Final planning specification; implementation not started.

## 1.1 Summary

CTF Tracker is a local-first Chromium browser extension for discovering Capture The Flag (CTF) competitions, tracking registration and participation, and reminding the user about event start times and registration deadlines.

The primary discovery path is CTFtime: the user browses events, opens an event page (for example, `https://ctftime.org/event/3409`), follows the official website link, and registers. The extension should reduce manual bookkeeping without claiming that a user registered unless they confirm it.

The extension also supports selected external CTF websites and manual event entry.

## 1.2 Goals

1. Detect supported CTF events while browsing.
2. Show a small top-right prompt asking about registration for newly detected events.
3. Capture available event metadata and let the user edit it.
4. Track interest, plans, registration, participation, and opt-out status.
5. Display event records in both a quick popup and a full dashboard.
6. Deliver best-effort browser reminders for event starts, deadlines, and event ends.
7. Keep records on the device and support JSON export/restore.
8. Avoid duplicate records, misleading data, repeated prompts for saved events, and stale reminders.

## 1.3 Non-goals for v1

- Automatically registering the user for a competition.
- Submitting flags, joining teams, or interacting with authenticated registration flows on the user's behalf.
- Reading passwords, session cookies, or authentication tokens.
- Guaranteed detection of every CTF website.
- Cloud accounts, remote databases, automatic cross-device sync, or telemetry.
- Guaranteed notification delivery while the browser is closed, the device is asleep, or notifications are blocked.

## 1.4 Target users and primary scenarios

### Scenario A — Discover through CTFtime
The user opens a CTFtime event page. The extension extracts event details, checks for an existing record, and displays a top-right prompt if the event is new.

### Scenario B — Follow the official website
The user opens a supported external CTF site. The extension applies a supported-site rule and offers capture. For an unsupported site, the user can add the current page manually.

### Scenario C — Record registration
The user chooses “Yes, registered” or updates the event to Registered in the dashboard. The extension saves the state. Visiting a registration page alone never proves registration.

### Scenario D — Save an event for later
The user marks an event Interested or Planned. The extension retains the event and schedules applicable reminders.

### Scenario E — Dismiss a prompt
The user dismisses a new-event prompt without saving. The event is not treated as registered or rejected. On the next visit, the extension may ask again.

### Scenario F — Manage competitions
The user opens the popup or dashboard to search, filter, edit, change status, manage reminders, or remove events.

### Scenario G — Backup and restore
The user exports a JSON backup. Later, the user imports it using merge mode; conflicts are previewed and resolved before changes are applied.

## 1.5 Functional requirements

### FR-01: Detection
- Detect CTFtime event pages and extract the stable event ID from supported URL patterns.
- Detect individual events on supported CTFtime listings when feasible.
- Support a maintained set of external-site detection rules.
- Always provide manual event entry as fallback.
- Check whether the event already exists before showing the initial prompt.
- Do not fabricate missing names, dates, URLs, formats, or registration status.

### FR-02: Top-right prompt
- Render a compact, dismissible overlay near the upper-right of supported pages.
- Show the event name and dates when known.
- Offer Registered, Not yet, Edit details, and Dismiss actions.
- “Registered” saves the event with `registered` status.
- “Not yet” offers `interested` or `planned` status, or saves the event with the user's selected choice.
- Dismissal does not save or change registration status.
- If dismissed without saving, the event may prompt again on the next visit.
- If saved, future visits show a saved-status indicator and actions, not the initial registration question.
- Provide a setting to disable automatic prompts while retaining manual capture and reminders.
- The overlay must not block important website controls, and must be keyboard accessible.

### FR-03: Event details
Fields supported by an event record:
- Internal ID.
- Name (required).
- Source and source identifier.
- CTFtime event ID and URL, when applicable.
- Official website URL.
- Registration URL.
- Start and end timestamp, when known.
- Source timezone, when known.
- Registration deadline, when known.
- Format: online, onsite, hybrid, unknown.
- Participation status.
- Participation mode: solo or team.
- Optional team name.
- Optional weight and points.
- Notes.
- Reminder preferences.
- Verification metadata.
- Creation and modification timestamps.

### FR-04: Participation statuses
Exactly five mutually exclusive statuses:
- `interested`
- `planned`
- `registered`
- `participated`
- `not_participating`

Event lifecycle (upcoming/live/ended/postponed/cancelled) is separate from participation status.

### FR-05: Reminders
Support:
- 7 days before start.
- 24 hours before start.
- 1 hour before start.
- 15 minutes before start.
- 24 hours before registration deadline.
- 15 minutes before event end.

All reminder categories can be enabled/disabled globally and per event. Deadline and event-end lead times are configurable. Skip reminders with missing timestamps or past trigger times. Avoid duplicate deliveries. Reschedule after event-time changes. Suppress reminders for cancelled events and for participation states `not_participating` and `participated`, unless future product policy explicitly changes this.

### FR-06: Popup
- Show detected event and current status where relevant.
- Provide quick status update, quick add, and open-dashboard action.
- Show next upcoming tracked event.
- Show a notification-permission warning when necessary.
- Avoid becoming a full management interface.

### FR-07: Dashboard
- Views: Upcoming, Live, Ended, Not Participating.
- Search by event name.
- Filter by status, date range, format, and participation mode.
- Sort by start time, deadline, and recently added.
- View/edit event details.
- Add and delete records.
- Manage global and per-event reminders.
- Export and import JSON.
- Surface missing or unverified data clearly.
- Keep the same data state as the popup.

### FR-08: Import/export
- Export events and user preferences to a versioned JSON format.
- Include schema version and export timestamp.
- Validate all imported fields before writing.
- Default to merge mode.
- Preview conflicts before applying.
- Match by stable source ID first, normalized canonical URL second where reliable.
- Never automatically merge based only on name.
- Preserve manually edited and verified fields.
- Do not import runtime alarm identifiers as source-of-truth data.

### FR-09: Lifecycle changes
- Keep cancellation/postponement separate from participation status.
- On cancellation, cancel remaining reminders and retain participation history.
- On postponement/date change, update event timestamps and reschedule alarms.
- Do not automatically set `participated` just because an event ended.
- Provide a way to mark an event as participated manually.

## 1.6 Non-functional requirements

- **Privacy:** no mandatory server or account; event data stays local by default.
- **Reliability:** persisted state must survive normal browser restarts.
- **Recoverability:** JSON export/restore.
- **Correctness:** no fabricated event data or registration claims.
- **Maintainability:** parser and site-specific detection logic isolated from UI and reminder logic.
- **Security:** validate imports, URLs, messages, and untrusted page content.
- **Performance:** content scripts should be lightweight and avoid expensive full-page scans.
- **Accessibility:** keyboard operation, focus management, readable contrast, accessible names.
- **Compatibility:** support selected current Chromium-based browsers; minimum versions to be verified during implementation.
- **Observability:** no telemetry in v1; errors should be surfaced in useful local UI states without collecting page content.

## 1.7 Acceptance criteria

1. Supported CTFtime event pages are detected without a click on the extension icon.
2. New events show a top-right prompt.
3. Dismissed unsaved events can prompt again on a later visit.
4. Saved events show their existing status on later visits.
5. The same source event discovered through multiple tabs does not create duplicate records.
6. Missing dates are not guessed and do not produce time-based alarms.
7. Manual events can be created without a CTFtime ID.
8. All five statuses work.
9. Popup and dashboard display the same stored records.
10. All six reminder categories are implemented.
11. Date changes and cancellations reconcile alarms.
12. JSON export and validated merge import work.
13. Browser restart and service-worker restart do not depend on in-memory state.
14. Permissions are limited to what the enabled features require.
15. Installation and limitations are documented.
