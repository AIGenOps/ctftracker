import { CTFEvent, ReminderType } from './event-schema';
import { generateScheduleFingerprint } from './event-normalizer';

export interface PlannedReminder {
  eventId: string;
  reminderType: ReminderType;
  alarmName: string;
  triggerTime: number; // Unix epoch ms
  scheduleFingerprint: string;
  title: string;
  message: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/**
 * Checks whether reminders should be suppressed for this event due to status or lifecycle.
 */
export function shouldSuppressReminders(event: CTFEvent): boolean {
  if (event.lifecycle === 'cancelled') return true;
  if (event.status === 'not_participating' || event.status === 'participated') return true;
  return false;
}

/**
 * Calculates all valid future reminders for an event given the current time.
 */
export function calculateEventReminders(
  event: CTFEvent,
  now: Date = new Date()
): PlannedReminder[] {
  if (shouldSuppressReminders(event)) {
    return [];
  }

  const nowMs = now.getTime();
  const prefs = event.reminderPreferences;
  const fingerprint = generateScheduleFingerprint(event);
  const planned: PlannedReminder[] = [];

  const startMs = event.startAt ? new Date(event.startAt).getTime() : NaN;
  const endMs = event.endAt ? new Date(event.endAt).getTime() : NaN;
  const deadlineMs = event.registrationDeadlineAt
    ? new Date(event.registrationDeadlineAt).getTime()
    : NaN;

  // 1. 7 days before start
  if (prefs.sevenDays && !isNaN(startMs) && event.lifecycle !== 'ended') {
    const trigger = startMs - SEVEN_DAYS_MS;
    if (trigger > nowMs) {
      planned.push({
        eventId: event.id,
        reminderType: '7d',
        alarmName: formatAlarmName(event.id, '7d', fingerprint),
        triggerTime: trigger,
        scheduleFingerprint: fingerprint,
        title: `CTF in 7 days: ${event.name}`,
        message: `Competition begins in 1 week (${formatShortDateTime(event.startAt)}). Make sure your team and tools are ready!`,
      });
    }
  }

  // 2. 24 hours before start
  if (prefs.twentyFourHours && !isNaN(startMs) && event.lifecycle !== 'ended') {
    const trigger = startMs - TWENTY_FOUR_HOURS_MS;
    if (trigger > nowMs) {
      planned.push({
        eventId: event.id,
        reminderType: '24h',
        alarmName: formatAlarmName(event.id, '24h', fingerprint),
        triggerTime: trigger,
        scheduleFingerprint: fingerprint,
        title: `CTF starts tomorrow: ${event.name}`,
        message: `Only 24 hours until kickoff at ${formatShortDateTime(event.startAt)}. Check your team credentials!`,
      });
    }
  }

  // 3. 1 hour before start
  if (prefs.oneHour && !isNaN(startMs) && event.lifecycle !== 'ended') {
    const trigger = startMs - ONE_HOUR_MS;
    if (trigger > nowMs) {
      planned.push({
        eventId: event.id,
        reminderType: '1h',
        alarmName: formatAlarmName(event.id, '1h', fingerprint),
        triggerTime: trigger,
        scheduleFingerprint: fingerprint,
        title: `1 hour alert: ${event.name}`,
        message: `Competition begins in 60 minutes. Join the platform and prepare your environment!`,
      });
    }
  }

  // 4. 15 minutes before start
  if (prefs.fifteenMinutes && !isNaN(startMs) && event.lifecycle !== 'ended') {
    const trigger = startMs - FIFTEEN_MINUTES_MS;
    if (trigger > nowMs) {
      planned.push({
        eventId: event.id,
        reminderType: '15m',
        alarmName: formatAlarmName(event.id, '15m', fingerprint),
        triggerTime: trigger,
        scheduleFingerprint: fingerprint,
        title: `Starting in 15 minutes: ${event.name}`,
        message: `Countdown begins! ${event.name} starts momentarily. Good luck!`,
      });
    }
  }

  // 5. Registration deadline reminder
  if (prefs.deadline && !isNaN(deadlineMs)) {
    const leadMs = (prefs.deadlineLeadMinutes || 1440) * 60 * 1000;
    const trigger = deadlineMs - leadMs;
    if (trigger > nowMs) {
      planned.push({
        eventId: event.id,
        reminderType: 'deadline',
        alarmName: formatAlarmName(event.id, 'deadline', fingerprint),
        triggerTime: trigger,
        scheduleFingerprint: fingerprint,
        title: `Registration closing soon: ${event.name}`,
        message: `Deadline closes at ${formatShortDateTime(event.registrationDeadlineAt)}. Register now so you don't miss out!`,
      });
    }
  }

  // 6. 15 minutes before event end
  if (prefs.eventEnd && !isNaN(endMs)) {
    const leadMs = (prefs.endLeadMinutes || 15) * 60 * 1000;
    const trigger = endMs - leadMs;
    if (trigger > nowMs) {
      planned.push({
        eventId: event.id,
        reminderType: 'eventEnd',
        alarmName: formatAlarmName(event.id, 'eventEnd', fingerprint),
        triggerTime: trigger,
        scheduleFingerprint: fingerprint,
        title: `Final sprint: ${event.name} ends in ${prefs.endLeadMinutes || 15} minutes!`,
        message: `Submit your pending flags and wrap up final writeups before the scoreboard freezes!`,
      });
    }
  }

  return planned;
}

export function formatAlarmName(eventId: string, reminderType: ReminderType, fingerprint: string): string {
  return `ctf_reminder__${eventId}__${reminderType}__${fingerprint}`;
}

export function parseAlarmName(alarmName: string): {
  eventId: string;
  reminderType: ReminderType;
  scheduleFingerprint: string;
} | null {
  const parts = alarmName.split('__');
  if (parts.length < 4 || parts[0] !== 'ctf_reminder') {
    return null;
  }
  return {
    eventId: parts[1],
    reminderType: parts[2] as ReminderType,
    scheduleFingerprint: parts.slice(3).join('__'),
  };
}

function formatShortDateTime(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}
