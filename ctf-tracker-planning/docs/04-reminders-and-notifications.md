# 4. Reminder and Notification Specification

## 4.1 Reminder defaults

| Category | Default trigger | Default enabled |
|---|---|---|
| Start in 7 days | `startAt - 7 days` | Yes |
| Start in 24 hours | `startAt - 24 hours` | Yes |
| Start in 1 hour | `startAt - 1 hour` | Yes |
| Start in 15 minutes | `startAt - 15 minutes` | Yes |
| Registration deadline | `registrationDeadlineAt - 24 hours` | Yes, when deadline exists |
| Event ending | `endAt - 15 minutes` | Yes, when end time exists |

Deadline lead time defaults to 1440 minutes. Event-end lead time defaults to 15 minutes. Both are configurable globally and per event.

## 4.2 Scheduling algorithm requirements

For each event:
1. Validate participation status, lifecycle, reminder preference, and required timestamp.
2. Calculate the trigger time.
3. If trigger time is in the past, mark it skipped or apply the explicitly designed catch-up policy; do not schedule an expired alarm.
4. Generate a deterministic alarm key from event ID, reminder category, and schedule version.
5. Cancel alarms associated with the prior schedule version when event times change.
6. Reconcile the alarm set after changes and on service-worker startup.
7. Record delivery history so the same reminder is not emitted twice accidentally.

## 4.3 Catch-up behavior

Default policy:
- Do not send all missed reminders after browser startup.
- Skip expired reminders.
- Optionally show a single in-dashboard “event starts soon / reminder missed” indicator if an event is still upcoming or live; this should not silently turn into multiple notifications.
- A future catch-up notification behavior requires a separate product decision.

## 4.4 Status suppression

Suppress participation reminders when:
- Event lifecycle is `cancelled`.
- Participation status is `not_participating`.
- Participation status is `participated`.

For `ended`, no start reminders should remain. If the user wants an event-end alert, it should already have been scheduled before end time.

## 4.5 Rescheduling and cancellation

When start/end/deadline changes:
- Recompute relevant reminder trigger times.
- Cancel obsolete alarms.
- Retain delivery history for reminders already sent against an old schedule.
- Use a schedule fingerprint/version so a changed event can have a new valid reminder without duplicating unrelated reminders.
- If the event is cancelled, cancel all future alarms.
- If postponed with unknown new date, cancel old date-specific alarms until new timestamps are supplied.

## 4.6 Chromium constraints

- `chrome.alarms` is not an exact timer; execution can be delayed.
- Manifest V3 service workers can stop and restart.
- Do not rely on `setTimeout`, in-memory timers, or a permanently running worker.
- Reconcile after worker startup and relevant data changes.
- Notification delivery depends on browser/system state and permission.
- Do not claim exact-time delivery while the browser is closed or the device is asleep.

## 4.7 Notification content

Include:
- Event name.
- Reminder reason (e.g. “starts in 1 hour”).
- Localized date/time where helpful.
- Click action to open dashboard event detail or official event URL.

Do not include sensitive notes by default. The extension should not include credentials or authentication data in notifications.

## 4.8 Required tests

- Each of the six reminder categories.
- Missing timestamps.
- Trigger already in past.
- Start time changes.
- Deadline changes.
- Event cancellation/postponement.
- Participated and Not Participating suppression.
- Duplicate alarms.
- Service-worker restart.
- Browser restart.
- Notifications disabled.
- Timezone change.
- Multiple events with overlapping reminder times.
