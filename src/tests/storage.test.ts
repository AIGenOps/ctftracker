import { describe, it, expect, beforeEach } from 'vitest';
import { EventRepository, resetMemoryStoreForTesting } from '../core/event-repository';

describe('Event Repository & Storage Operations Tests', () => {
  let repo: EventRepository;

  beforeEach(() => {
    resetMemoryStoreForTesting();
    repo = new EventRepository();
  });

  it('T-019: Saves a new competition and generates an ID with defaults', async () => {
    const saved = await repo.saveEvent({
      name: 'PicoCTF 2026',
      format: 'online',
      status: 'interested',
      startAt: '2026-11-01T12:00:00.000Z',
      endAt: '2026-11-05T12:00:00.000Z',
    });

    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('PicoCTF 2026');
    expect(saved.status).toBe('interested');
    expect(saved.lifecycle).toBe('upcoming');
    expect(saved.reminderPreferences.sevenDays).toBe(true);

    const all = await repo.getEvents();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(saved.id);
  });

  it('T-020: Retrieves single event by ID', async () => {
    const saved = await repo.saveEvent({ name: 'Google CTF 2026' });
    const fetched = await repo.getEventById(saved.id);
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('Google CTF 2026');
  });

  it('T-021: Updates event details and status', async () => {
    const saved = await repo.saveEvent({ name: 'HITCON CTF' });
    const updated = await repo.updateEvent(saved.id, {
      teamMode: 'team',
      teamName: 'CyberKnights',
      notes: 'Prepare reverse-engineering tools',
    });

    expect(updated.teamMode).toBe('team');
    expect(updated.teamName).toBe('CyberKnights');
    expect(updated.notes).toBe('Prepare reverse-engineering tools');

    const statusUpdated = await repo.setEventStatus(saved.id, 'registered');
    expect(statusUpdated.status).toBe('registered');
  });

  it('T-022: Deletes event cleanly', async () => {
    const saved = await repo.saveEvent({ name: 'To Be Deleted CTF' });
    expect(await repo.getEvents()).toHaveLength(1);

    const deleted = await repo.deleteEvent(saved.id);
    expect(deleted).toBe(true);
    expect(await repo.getEvents()).toHaveLength(0);
  });

  it('T-023: Settings management', async () => {
    const defaultSettings = await repo.getSettings();
    expect(defaultSettings.automaticPromptsEnabled).toBe(true);

    const updated = await repo.updateSettings({
      automaticPromptsEnabled: false,
      timezoneDisplay: 'utc',
    });

    expect(updated.automaticPromptsEnabled).toBe(false);
    expect(updated.timezoneDisplay).toBe('utc');
  });

  it('T-024: Delivery history records correctly and prevents duplicates', async () => {
    await repo.recordDelivery({
      id: 'alarm_test_1',
      eventId: 'ev_1',
      reminderType: '1h',
      scheduledFor: '2026-10-10T11:00:00.000Z',
      scheduleFingerprint: 'fp_1',
      state: 'delivered',
      deliveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const history = await repo.getDeliveryHistory();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe('alarm_test_1');
    expect(history[0].state).toBe('delivered');
  });
});
