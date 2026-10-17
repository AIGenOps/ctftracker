import { describe, it, expect } from 'vitest';
import { findExistingEvent, mergeEvent, detectImportConflicts } from '../core/deduplication';
import { CTFEvent, DEFAULT_REMINDER_PREFERENCES } from '../core/event-schema';

describe('Event Deduplication & Merge Tests', () => {
  const sampleEvent1: CTFEvent = {
    id: 'ctf_001',
    name: 'DEF CON CTF Qualifier',
    status: 'registered',
    lifecycle: 'upcoming',
    format: 'online',
    source: 'ctftime',
    sourceEventId: '1001',
    ctftimeUrl: 'https://ctftime.org/event/1001/',
    websiteUrl: 'https://defcon.org',
    startAt: '2026-05-01T00:00:00.000Z',
    endAt: '2026-05-03T00:00:00.000Z',
    timezone: 'UTC',
    teamMode: 'team',
    teamName: 'PwnMasters',
    reminderPreferences: { ...DEFAULT_REMINDER_PREFERENCES },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    dismissedPrompt: false,
    verifiedFields: ['name', 'startAt'],
  };

  const sampleEvent2: CTFEvent = {
    id: 'ctf_002',
    name: 'DEF CON CTF Qualifier', // SAME NAME, BUT DIFFERENT SOURCE ID!
    status: 'interested',
    lifecycle: 'upcoming',
    format: 'online',
    source: 'ctftime',
    sourceEventId: '2002',
    ctftimeUrl: 'https://ctftime.org/event/2002/',
    teamMode: 'solo',
    reminderPreferences: { ...DEFAULT_REMINDER_PREFERENCES },
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    dismissedPrompt: false,
    verifiedFields: ['name'],
  };

  it('T-008: Matches identical event by source and sourceEventId', () => {
    const candidate = {
      source: 'ctftime' as const,
      sourceEventId: '1001',
      name: 'DEF CON Qualifier Updated',
    };
    const matched = findExistingEvent([sampleEvent1, sampleEvent2], candidate);
    expect(matched).toBeDefined();
    expect(matched?.id).toBe('ctf_001');
  });

  it('T-009: Does NOT merge unrelated events with the same name and different IDs', () => {
    const candidate = {
      source: 'ctftime' as const,
      sourceEventId: '3003', // completely different ID
      name: 'DEF CON CTF Qualifier', // identical name
    };
    const matched = findExistingEvent([sampleEvent1, sampleEvent2], candidate);
    expect(matched).toBeUndefined(); // Never matches on name alone!
  });

  it('T-010: Merge preserves existing non-empty values when updates are empty or undefined', () => {
    const updates = {
      name: 'DEF CON CTF Qualifier 2026',
      websiteUrl: '', // empty
      teamName: undefined, // undefined
      notes: 'New strategic notes added',
    };

    const merged = mergeEvent(sampleEvent1, updates, true);
    expect(merged.name).toBe('DEF CON CTF Qualifier 2026');
    expect(merged.websiteUrl).toBe('https://defcon.org'); // preserved!
    expect(merged.teamName).toBe('PwnMasters'); // preserved!
    expect(merged.notes).toBe('New strategic notes added');
  });

  it('T-011: Conflict analysis flags conflicting fields for user resolution', () => {
    const incoming: CTFEvent = {
      ...sampleEvent1,
      status: 'planned', // differs from 'registered'
      teamMode: 'solo', // differs from 'team'
    };

    const analysis = detectImportConflicts([sampleEvent1], [incoming]);
    expect(analysis.newEvents.length).toBe(0);
    expect(analysis.conflictingEvents.length).toBe(1);
    expect(analysis.conflictingEvents[0].differingFields.some(f => f.field === 'status')).toBe(true);
    expect(analysis.conflictingEvents[0].differingFields.some(f => f.field === 'teamMode')).toBe(true);
  });
});
