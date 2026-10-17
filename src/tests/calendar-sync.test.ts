import { describe, it, expect } from 'vitest';
import {
  formatCalendarDateUtc,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  generateIcsContent,
} from '../core/calendar-sync';
import { CTFEvent } from '../core/event-schema';

describe('Calendar Sync Engine', () => {
  const sampleEvent: CTFEvent = {
    id: 'test_ctf_2026',
    name: 'DEF CON Qualifier 2026',
    status: 'registered',
    lifecycle: 'upcoming',
    format: 'online',
    source: 'ctftime',
    sourceEventId: '3409',
    websiteUrl: 'https://defcon.org',
    ctftimeUrl: 'https://ctftime.org/event/3409',
    startAt: '2026-10-25T12:00:00.000Z',
    endAt: '2026-10-27T12:00:00.000Z',
    teamMode: 'team',
    teamName: 'PwnMasters',
    notes: 'Focus on rev and pwn challenges',
    reminderPreferences: {
      sevenDays: true,
      twentyFourHours: true,
      oneHour: true,
      fifteenMinutes: true,
      deadline: true,
      eventEnd: true,
      deadlineLeadMinutes: 1440,
      endLeadMinutes: 15,
    },
    createdAt: '2026-10-18T00:00:00.000Z',
    updatedAt: '2026-10-18T00:00:00.000Z',
    dismissedPrompt: false,
    verifiedFields: ['name', 'startAt', 'endAt'],
  };

  it('formats UTC ISO strings into calendar compact UTC timestamps', () => {
    const formatted = formatCalendarDateUtc('2026-10-25T12:00:00.000Z');
    expect(formatted).toBe('20261025T120000Z');
  });

  it('builds a valid Google Calendar URL with correct query parameters', () => {
    const url = buildGoogleCalendarUrl(sampleEvent);
    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=DEF+CON+Qualifier+2026');
    expect(url).toContain('dates=20261025T120000Z%2F20261027T120000Z');
    expect(url).toContain('location=Online');
    expect(url).toContain('PwnMasters');
  });

  it('returns empty string if event lacks start or end dates', () => {
    const incompleteEvent = { ...sampleEvent, startAt: undefined } as any;
    expect(buildGoogleCalendarUrl(incompleteEvent)).toBe('');
  });

  it('builds a valid Outlook Calendar URL', () => {
    const url = buildOutlookCalendarUrl(sampleEvent);
    expect(url).toContain('https://outlook.live.com/calendar/0/deeplink/compose?');
    expect(url).toContain('path=%2Fcalendar%2Faction%2Fcompose');
    expect(url).toContain('subject=DEF+CON+Qualifier+2026');
  });

  it('generates valid RFC 5545 iCalendar (.ics) formatted content', () => {
    const ics = generateIcsContent(sampleEvent);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20261025T120000Z');
    expect(ics).toContain('DTEND:20261027T120000Z');
    expect(ics).toContain('SUMMARY:DEF CON Qualifier 2026');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
