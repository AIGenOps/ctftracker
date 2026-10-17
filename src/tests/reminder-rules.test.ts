import { describe, it, expect } from 'vitest';
import {
  calculateEventReminders,
  formatAlarmName,
  parseAlarmName,
  shouldSuppressReminders,
} from '../core/reminder-rules';
import { CTFEvent, DEFAULT_REMINDER_PREFERENCES } from '../core/event-schema';

describe('Reminder Rules and Scheduling Engine Tests', () => {
  const baseNow = new Date('2026-10-01T00:00:00.000Z');

  const upcomingEvent: CTFEvent = {
    id: 'test_event_99',
    name: 'HackTheBox Battlegrounds',
    status: 'registered',
    lifecycle: 'upcoming',
    format: 'online',
    source: 'ctftime',
    sourceEventId: '9999',
    startAt: '2026-10-10T12:00:00.000Z', // 9.5 days in future
    endAt: '2026-10-12T12:00:00.000Z',
    registrationDeadlineAt: '2026-10-08T12:00:00.000Z',
    teamMode: 'team',
    reminderPreferences: {
      ...DEFAULT_REMINDER_PREFERENCES,
      deadlineLeadMinutes: 1440, // 24 hours
      endLeadMinutes: 15,
    },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    dismissedPrompt: false,
    verifiedFields: ['name'],
  };

  it('T-012: Correctly computes all 6 future reminder triggers when future dates exist', () => {
    const reminders = calculateEventReminders(upcomingEvent, baseNow);

    expect(reminders.length).toBe(6);
    const types = reminders.map(r => r.reminderType);
    expect(types).toContain('7d');
    expect(types).toContain('24h');
    expect(types).toContain('1h');
    expect(types).toContain('15m');
    expect(types).toContain('deadline');
    expect(types).toContain('eventEnd');

    // Check trigger time for 7d
    const startMs = new Date(upcomingEvent.startAt!).getTime();
    const sevenDayReminder = reminders.find(r => r.reminderType === '7d');
    expect(sevenDayReminder?.triggerTime).toBe(startMs - 7 * 24 * 60 * 60 * 1000);

    // Check trigger time for deadline (24 hours before deadline)
    const deadlineMs = new Date(upcomingEvent.registrationDeadlineAt!).getTime();
    const deadlineReminder = reminders.find(r => r.reminderType === 'deadline');
    expect(deadlineReminder?.triggerTime).toBe(deadlineMs - 24 * 60 * 60 * 1000);
  });

  it('T-013: Does NOT schedule reminders for missing timestamps', () => {
    const eventNoDeadline: CTFEvent = {
      ...upcomingEvent,
      registrationDeadlineAt: undefined,
    };
    const reminders = calculateEventReminders(eventNoDeadline, baseNow);
    expect(reminders.some(r => r.reminderType === 'deadline')).toBe(false);
  });

  it('T-014: Skips reminder triggers that are already in the past', () => {
    // Current time is 3 days before start (so 7d trigger is in past)
    const threeDaysBefore = new Date('2026-10-07T12:00:00.000Z');
    const reminders = calculateEventReminders(upcomingEvent, threeDaysBefore);

    expect(reminders.some(r => r.reminderType === '7d')).toBe(false); // skipped!
    expect(reminders.some(r => r.reminderType === '24h')).toBe(true);
    expect(reminders.some(r => r.reminderType === '1h')).toBe(true);
    expect(reminders.some(r => r.reminderType === '15m')).toBe(true);
  });

  it('T-015: Changing start time produces a different schedule fingerprint', () => {
    const eventChanged: CTFEvent = {
      ...upcomingEvent,
      startAt: '2026-10-15T12:00:00.000Z',
    };

    const remOld = calculateEventReminders(upcomingEvent, baseNow);
    const remNew = calculateEventReminders(eventChanged, baseNow);

    expect(remOld[0].alarmName).not.toBe(remNew[0].alarmName);
    expect(remOld[0].scheduleFingerprint).not.toBe(remNew[0].scheduleFingerprint);
  });

  it('T-016: Suppresses all reminders when event lifecycle is cancelled', () => {
    const cancelledEvent: CTFEvent = {
      ...upcomingEvent,
      lifecycle: 'cancelled',
    };
    expect(shouldSuppressReminders(cancelledEvent)).toBe(true);
    expect(calculateEventReminders(cancelledEvent, baseNow)).toHaveLength(0);
  });

  it('T-017: Suppresses reminders when user status is not_participating or participated', () => {
    const notPart: CTFEvent = { ...upcomingEvent, status: 'not_participating' };
    const participated: CTFEvent = { ...upcomingEvent, status: 'participated' };

    expect(shouldSuppressReminders(notPart)).toBe(true);
    expect(calculateEventReminders(notPart, baseNow)).toHaveLength(0);

    expect(shouldSuppressReminders(participated)).toBe(true);
    expect(calculateEventReminders(participated, baseNow)).toHaveLength(0);
  });

  it('T-018: Correctly formats and parses deterministic alarm names', () => {
    const alarmName = formatAlarmName('ctf_42', '1h', '2026-10-10__2026-10-12__none__upcoming');
    const parsed = parseAlarmName(alarmName);

    expect(parsed).not.toBeNull();
    expect(parsed?.eventId).toBe('ctf_42');
    expect(parsed?.reminderType).toBe('1h');
    expect(parsed?.scheduleFingerprint).toBe('2026-10-10__2026-10-12__none__upcoming');
  });
});
