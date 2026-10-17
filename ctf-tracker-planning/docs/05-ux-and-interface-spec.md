# 5. UX and Interface Specification

## 5.1 Visual direction

- Minimal dark interface.
- Restrained neutral surfaces and a single subtle accent.
- Clear hierarchy; avoid excessive gradients, neon effects, or decorative cyber imagery.
- Compact, readable typography.
- Accessible contrast and keyboard navigation.
- Responsive layout for the popup and dashboard.

## 5.2 Top-right overlay

### New event
Display:
- Event name.
- Start time if known, in local timezone.
- Source indicator (CTFtime or supported external site).
- “Yes, registered”.
- “Not yet”.
- “Edit details”.
- “Dismiss”.

### Saved event
Display:
- Event name.
- Current participation status.
- Relevant event date.
- “Open details”, “Change status”, and “Dismiss” actions.

### Dismissal behavior
- If unsaved and dismissed, retain a per-session or persisted dismissal marker only as needed to avoid reappearing continuously on the same page.
- On a later visit, ask again if still unsaved.
- If saved, do not show the initial registration question again.
- The exact definition of “next visit” should be implemented as a new navigation/page load, not a mutation observer repeatedly firing on the same page.
- If the user disables automatic prompts, do not show the overlay; manual capture remains available.

## 5.3 Popup layout

Sections:
1. Current page detection/status.
2. Quick status action.
3. Next upcoming event.
4. Add event.
5. Open dashboard.
6. Notification permission warning, when relevant.

Popup should stay concise; detailed filtering and editing belongs in the dashboard.

## 5.4 Dashboard layout

Primary navigation:
- Upcoming
- Live
- Ended
- Not Participating
- Settings / Backup

Dashboard functions:
- Search by event name.
- Filter by status, date range, format, and solo/team mode.
- Sort by start time, deadline, and recently added.
- Create/edit/delete event.
- View event source links and verified fields.
- Set global and per-event reminder preferences.
- Export JSON and import JSON.
- Preview import conflicts.
- Show missing-data warnings.
- Show notification permission state.

## 5.5 Event detail form

Fields:
- Name (required).
- Start and end date/time.
- Timezone selector when necessary.
- Event website.
- Registration URL.
- Registration deadline.
- Format.
- Participation status.
- Solo/team mode and team name.
- Weight and points.
- Notes.
- Reminder checkboxes and lead times.

Validation:
- Validate URL schemes and hostnames.
- Warn when end precedes start.
- Permit unknown dates.
- Do not guess a timezone.
- Preserve existing values if an extraction returns empty fields.

## 5.6 Empty, error, and permission states

- **No events:** explain how to detect or add a CTF.
- **No detection:** offer manual capture.
- **Parse incomplete:** show available fields and allow editing.
- **Notification blocked:** show browser-specific instructions; do not claim reminders are active.
- **Import invalid:** explain which fields failed validation; do not partially apply invalid data.
- **Import conflicts:** show a preview and allow resolution before writing.
- **Storage error:** report the error and avoid showing false success.
- **Event cancelled:** show cancellation distinctly from participation status.

## 5.7 Accessibility

- Keyboard-accessible overlay, popup, and dashboard.
- Visible focus indicators.
- Correct accessible labels for icon-only controls.
- Focus should move into the prompt when appropriate and return to the page when closed.
- Avoid trapping focus unless the prompt is implemented as a true modal.
- Respect reduced-motion preferences.
- Use text labels in addition to color to convey status.
