/**
 * CTF Tracker Core Data Model
 * Conforms to Manifest V3 Planning Specifications
 */

export type RegistrationStatus =
  | 'interested'
  | 'planned'
  | 'registered'
  | 'participated'
  | 'not_participating';

export type EventSource = 'ctftime' | 'external' | 'manual';
export type EventFormat = 'online' | 'onsite' | 'hybrid' | 'unknown';
export type TeamMode = 'solo' | 'team';

export type EventLifecycle =
  | 'upcoming'
  | 'live'
  | 'ended'
  | 'postponed'
  | 'cancelled'
  | 'unknown';

export type ReminderType = '7d' | '24h' | '1h' | '15m' | 'deadline' | 'eventEnd';

export interface ReminderPreferences {
  sevenDays: boolean;
  twentyFourHours: boolean;
  oneHour: boolean;
  fifteenMinutes: boolean;
  deadline: boolean;
  eventEnd: boolean;
  deadlineLeadMinutes: number; // default 1440
  endLeadMinutes: number;      // default 15
}

export interface CTFEvent {
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

  startAt?: string;            // ISO 8601 UTC string
  endAt?: string;              // ISO 8601 UTC string
  timezone?: string;           // e.g. "UTC" or IANA name
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
  fieldSources?: Record<string, 'manual' | 'ctftime' | 'external'>;
}

export interface GlobalSettings {
  automaticPromptsEnabled: boolean;
  timezoneDisplay: 'local' | 'utc';
  theme: 'minimal-dark' | 'light';
  defaultReminderPreferences: ReminderPreferences;
  deadlineLeadMinutes: number;
  endLeadMinutes: number;
  externalDetectionEnabled: boolean;
  schemaVersion: number;
}

export interface ReminderDeliveryHistoryEntry {
  id: string;                  // `${eventId}__${reminderType}__${scheduleFingerprint}`
  eventId: string;
  reminderType: ReminderType;
  scheduledFor: string;
  scheduleFingerprint: string;
  state: 'scheduled' | 'delivered' | 'skipped' | 'cancelled';
  deliveredAt?: string;
  updatedAt: string;
}

export interface ExportPayload {
  schemaVersion: number;
  exportedAt: string;
  settings: GlobalSettings;
  events: CTFEvent[];
}

export interface ParseResult {
  source: EventSource;
  sourceEventId?: string;
  canonicalUrl?: string;
  name?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  websiteUrl?: string;
  registrationUrl?: string;
  registrationDeadlineAt?: string;
  format?: EventFormat;
  weight?: number;
  points?: number;
  missingFields: string[];
  warnings: string[];
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  sevenDays: true,
  twentyFourHours: true,
  oneHour: true,
  fifteenMinutes: true,
  deadline: true,
  eventEnd: true,
  deadlineLeadMinutes: 1440,
  endLeadMinutes: 15,
};

export const DEFAULT_SETTINGS: GlobalSettings = {
  automaticPromptsEnabled: true,
  timezoneDisplay: 'local',
  theme: 'minimal-dark',
  defaultReminderPreferences: DEFAULT_REMINDER_PREFERENCES,
  deadlineLeadMinutes: 1440,
  endLeadMinutes: 15,
  externalDetectionEnabled: true,
  schemaVersion: 1,
};
