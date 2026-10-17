# 3. Data Model and State Rules

## 3.1 Core event model

Illustrative TypeScript contract:

```ts
type RegistrationStatus =
  | "interested"
  | "planned"
  | "registered"
  | "participated"
  | "not_participating";

type EventSource = "ctftime" | "external" | "manual";
type EventFormat = "online" | "onsite" | "hybrid" | "unknown";
type TeamMode = "solo" | "team";

type EventLifecycle =
  | "upcoming"
  | "live"
  | "ended"
  | "postponed"
  | "cancelled"
  | "unknown";

interface ReminderPreferences {
  sevenDays: boolean;
  twentyFourHours: boolean;
  oneHour: boolean;
  fifteenMinutes: boolean;
  deadline: boolean;
  eventEnd: boolean;
  deadlineLeadMinutes: number; // default 1440
  endLeadMinutes: number;      // default 15
}

interface CTFEvent {
  id: string;                  // generated stable internal ID
  name: string;                // required
  status: RegistrationStatus;
  lifecycle: EventLifecycle;
  format: EventFormat;

  source: EventSource;
  sourceEventId?: string;
  ctftimeUrl?: string;
  websiteUrl?: string;
  registrationUrl?: string;

  startAt?: string;            // ISO 8601 timestamp with known offset or UTC
  endAt?: string;
  timezone?: string;           // IANA zone when known, e.g. Europe/London
  registrationDeadlineAt?: string;

  teamMode: TeamMode;
  teamName?: string;

  weight?: number;
  points?: number;
  notes?: string;

  reminderPreferences: ReminderPreferences;

  createdAt: string;
  updatedAt: string;
  dismissedPrompt: boolean;
  verifiedFields: string[];
  fieldSources?: Record<string, "manual" | "ctftime" | "external">;
}
```

The final implementation may adjust the schema, but must preserve the behaviors and invariants documented in this package.

## 3.2 Global settings

Suggested settings:
- `automaticPromptsEnabled` (default true)
- `defaultReminderPreferences`
- `deadlineLeadMinutes` (default 1440)
- `endLeadMinutes` (default 15)
- `externalDetectionEnabled` (default true for supported sites)
- `timezoneDisplay` (default local)
- `theme` (default minimal dark)
- `schemaVersion`

## 3.3 Reminder delivery history

Delivery history should be stored separately from the event's core descriptive fields, or in a dedicated per-event structure. It must be sufficient to prevent duplicates and identify stale schedules.

Suggested key dimensions:
- Event ID.
- Reminder type.
- Scheduled timestamp.
- Event schedule version or fingerprint.
- Delivery state: scheduled, delivered, skipped, cancelled, or failed.
- Last attempt timestamp when useful.

Do not rely solely on a browser alarm's existence as proof that a reminder was already delivered.

## 3.4 Status transitions

All five statuses are valid user-selectable states. The UI should permit changing status at any time, while confirming potentially destructive transitions if appropriate.

Expected reminder effects:
- `interested`: upcoming reminders can be enabled.
- `planned`: upcoming reminders can be enabled.
- `registered`: upcoming reminders can be enabled.
- `participated`: suppress future start/deadline/end reminders by default.
- `not_participating`: suppress participation reminders by default.

Do not automatically change status to `participated` when the event ends.

## 3.5 Lifecycle transitions

Lifecycle is independent:
- `upcoming` → `live` based on time, if sufficient timestamps exist.
- `live` → `ended` after end time, if known.
- Any applicable lifecycle → `postponed` when the user or a trusted source records postponement.
- Any applicable lifecycle → `cancelled` when cancellation is confirmed.
- A postponed event can return to `upcoming` once a new start time is set.
- A cancelled event should retain history but have future alarms cancelled.

Derived lifecycle must not be treated as a participation decision.

## 3.6 Identity and deduplication

Priority:
1. Exact source namespace + stable source event ID.
2. Canonical source URL or official event URL when trustworthy.
3. Suggested match based on normalized name, dates, and domain, requiring user confirmation.
4. Never auto-merge on name alone.

Normalization must not strip query parameters that are needed to identify a real event. URL normalization rules should be tested against actual examples.

## 3.7 Field merge rules

- Preserve non-empty manual values when a parser returns an empty value.
- Preserve verified fields unless the user explicitly chooses to replace them.
- Prefer a source-specific field only when its provenance and confidence are known.
- Record conflicts and present them to the user rather than silently overwriting.
- A change in event start/end time must trigger reminder reconciliation.

## 3.8 Timestamp policy

- Store known instants as normalized ISO 8601 timestamps.
- Preserve source timezone metadata when available.
- Display in the user's local timezone by default.
- Do not assume a timezone for ambiguous date/time strings.
- Handle date-only values explicitly; do not silently convert a date-only event to midnight in an arbitrary timezone.
- Re-evaluate display when the device timezone changes.
- Validate start/end ordering, but allow incomplete event records.

## 3.9 Storage and migration

- Use `chrome.storage.local`.
- Version the exported dataset and persisted schema.
- Run explicit migrations when the schema changes.
- Rebuild derived alarm state from the event records after startup.
- Do not promise that local storage survives browser profile deletion, extension data clearing, or uninstall.
- Export/restore is the supported backup mechanism.
