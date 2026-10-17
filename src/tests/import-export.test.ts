import { describe, it, expect, beforeEach } from 'vitest';
import { EventRepository, resetMemoryStoreForTesting } from '../core/event-repository';

describe('JSON Backup, Export & Restore Tests', () => {
  let repo: EventRepository;

  beforeEach(() => {
    resetMemoryStoreForTesting();
    repo = new EventRepository();
  });

  it('T-025: Export produces a versioned, schema-compliant JSON structure', async () => {
    await repo.saveEvent({
      name: 'PicoCTF 2026',
      status: 'registered',
      startAt: '2026-10-20T00:00:00.000Z',
    });

    const exported = await repo.exportData();

    expect(exported.schemaVersion).toBe(1);
    expect(exported.exportedAt).toBeDefined();
    expect(exported.settings).toBeDefined();
    expect(Array.isArray(exported.events)).toBe(true);
    expect(exported.events.length).toBe(1);
    expect(exported.events[0].name).toBe('PicoCTF 2026');
  });

  it('T-026: Validates and rejects malformed import payloads without partial writes', async () => {
    // 1. Not an object
    const res1 = await repo.previewImport('invalid string');
    expect(res1.valid).toBe(false);

    // 2. Missing events array
    const res2 = await repo.previewImport({ schemaVersion: 1 });
    expect(res2.valid).toBe(false);

    // 3. Event with empty name
    const res3 = await repo.previewImport({
      schemaVersion: 1,
      events: [{ name: '', status: 'interested' }],
    });
    expect(res3.valid).toBe(false);

    // 4. Event with invalid status
    const res4 = await repo.previewImport({
      schemaVersion: 1,
      events: [{ name: 'Good Name', status: 'not_a_real_status' }],
    });
    expect(res4.valid).toBe(false);

    // Verify storage remained untouched
    expect(await repo.getEvents()).toHaveLength(0);
  });

  it('T-027: Import preview identifies new records and conflicting records', async () => {
    const existing = await repo.saveEvent({
      source: 'ctftime',
      sourceEventId: '555',
      name: 'Existing CTF',
      status: 'interested',
    });

    const importPayload = {
      schemaVersion: 1,
      events: [
        {
          source: 'ctftime',
          sourceEventId: '555',
          name: 'Existing CTF Updated',
          status: 'registered', // Conflict with 'interested'
        },
        {
          source: 'ctftime',
          sourceEventId: '777',
          name: 'Brand New CTF',
          status: 'planned',
        },
      ],
    };

    const preview = await repo.previewImport(importPayload);
    expect(preview.valid).toBe(true);
    expect(preview.analysis?.newEvents.length).toBe(1);
    expect(preview.analysis?.newEvents[0].name).toBe('Brand New CTF');
    expect(preview.analysis?.conflictingEvents.length).toBe(1);
    expect(preview.analysis?.conflictingEvents[0].existing.id).toBe(existing.id);
  });

  it('T-028: Apply import in merge mode with custom resolutions', async () => {
    const existing = await repo.saveEvent({
      source: 'ctftime',
      sourceEventId: '888',
      name: 'DefendTheFlag',
      status: 'interested',
    });

    const importPayload = {
      schemaVersion: 1,
      events: [
        {
          source: 'ctftime',
          sourceEventId: '888',
          name: 'DefendTheFlag 2026',
          status: 'registered',
        },
      ],
    };

    // Apply with resolution to use imported
    const result = await repo.applyImport(importPayload, 'merge', {
      [existing.id]: 'use_imported',
    });

    expect(result.success).toBe(true);
    const updated = await repo.getEventById(existing.id);
    expect(updated?.status).toBe('registered');
    expect(updated?.name).toBe('DefendTheFlag 2026');
  });
});
