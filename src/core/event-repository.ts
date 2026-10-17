import {
  CTFEvent,
  DEFAULT_REMINDER_PREFERENCES,
  DEFAULT_SETTINGS,
  ExportPayload,
  GlobalSettings,
  RegistrationStatus,
  ReminderDeliveryHistoryEntry,
} from './event-schema';
import { calculateLifecycle, generateEventId, normalizeUrl, sanitizeText } from './event-normalizer';
import { detectImportConflicts, findExistingEvent, mergeEvent } from './deduplication';
import { CURRENT_SCHEMA_VERSION, migrateData } from './migrations';

const STORAGE_KEYS = {
  EVENTS: 'ctf_tracker_events',
  SETTINGS: 'ctf_tracker_settings',
  DELIVERY_HISTORY: 'ctf_tracker_delivery_history',
};

// In-memory fallback for environments without chrome.storage.local (tests, node, etc.)
let memoryStore: Record<string, any> = {};

export function resetMemoryStoreForTesting(): void {
  memoryStore = {};
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.clear();
    } catch {}
  }
}

async function getStorageItem<T>(key: string, defaultValue: T): Promise<T> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Storage read error:', chrome.runtime.lastError);
          resolve(defaultValue);
        } else {
          resolve(result[key] !== undefined ? result[key] : defaultValue);
        }
      });
    });
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
    } catch {}
  }

  return memoryStore[key] !== undefined ? (memoryStore[key] as T) : defaultValue;
}

async function setStorageItem<T>(key: string, value: T): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  memoryStore[key] = value;
}

export class EventRepository {
  /**
   * Retrieves all stored events.
   */
  async getEvents(): Promise<CTFEvent[]> {
    const raw = await getStorageItem<any[]>(STORAGE_KEYS.EVENTS, []);
    return raw.map(event => ({
      ...event,
      lifecycle: calculateLifecycle(event.startAt, event.endAt, event.lifecycle),
    }));
  }

  /**
   * Retrieves a single event by internal ID.
   */
  async getEventById(id: string): Promise<CTFEvent | undefined> {
    const events = await this.getEvents();
    return events.find(e => e.id === id);
  }

  /**
   * Finds an existing event matching candidate fields (e.g. source, URL).
   */
  async findMatchingEvent(candidate: Partial<CTFEvent>): Promise<CTFEvent | undefined> {
    const events = await this.getEvents();
    return findExistingEvent(events, candidate);
  }

  /**
   * Saves or merges an event.
   */
  async saveEvent(eventInput: Partial<CTFEvent> & { name: string }): Promise<CTFEvent> {
    const events = await this.getEvents();
    const existing = findExistingEvent(events, eventInput);

    const nowIso = new Date().toISOString();

    if (existing) {
      const merged = mergeEvent(existing, eventInput);
      const updatedEvents = events.map(e => (e.id === existing.id ? merged : e));
      await setStorageItem(STORAGE_KEYS.EVENTS, updatedEvents);
      return merged;
    }

    const validatedStatus: RegistrationStatus = eventInput.status || 'interested';
    const newEvent: CTFEvent = {
      id: eventInput.id || generateEventId(),
      name: sanitizeText(eventInput.name),
      status: validatedStatus,
      lifecycle: calculateLifecycle(eventInput.startAt, eventInput.endAt, eventInput.lifecycle),
      format: eventInput.format || 'unknown',
      source: eventInput.source || 'manual',
      sourceEventId: eventInput.sourceEventId,
      ctftimeUrl: normalizeUrl(eventInput.ctftimeUrl),
      websiteUrl: normalizeUrl(eventInput.websiteUrl),
      registrationUrl: normalizeUrl(eventInput.registrationUrl),
      startAt: eventInput.startAt,
      endAt: eventInput.endAt,
      timezone: eventInput.timezone || 'UTC',
      registrationDeadlineAt: eventInput.registrationDeadlineAt,
      teamMode: eventInput.teamMode || 'solo',
      teamName: sanitizeText(eventInput.teamName),
      weight: eventInput.weight,
      points: eventInput.points,
      notes: sanitizeText(eventInput.notes),
      reminderPreferences: {
        ...DEFAULT_REMINDER_PREFERENCES,
        ...(eventInput.reminderPreferences || {}),
      },
      createdAt: eventInput.createdAt || nowIso,
      updatedAt: nowIso,
      dismissedPrompt: !!eventInput.dismissedPrompt,
      verifiedFields: eventInput.verifiedFields || ['name'],
      fieldSources: eventInput.fieldSources || { name: eventInput.source || 'manual' },
    };

    events.push(newEvent);
    await setStorageItem(STORAGE_KEYS.EVENTS, events);
    return newEvent;
  }

  /**
   * Updates an existing event by ID.
   */
  async updateEvent(id: string, updates: Partial<CTFEvent>): Promise<CTFEvent> {
    const events = await this.getEvents();
    const index = events.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error(`Event with id "${id}" not found.`);
    }

    const existing = events[index];
    const updated = mergeEvent(existing, updates, false);
    updated.lifecycle = calculateLifecycle(updated.startAt, updated.endAt, updates.lifecycle || updated.lifecycle);
    updated.updatedAt = new Date().toISOString();

    events[index] = updated;
    await setStorageItem(STORAGE_KEYS.EVENTS, events);
    return updated;
  }

  /**
   * Updates only the registration status of an event.
   */
  async setEventStatus(id: string, status: RegistrationStatus): Promise<CTFEvent> {
    return this.updateEvent(id, { status });
  }

  /**
   * Deletes an event by ID.
   */
  async deleteEvent(id: string): Promise<boolean> {
    const events = await this.getEvents();
    const filtered = events.filter(e => e.id !== id);
    if (filtered.length === events.length) {
      return false;
    }
    await setStorageItem(STORAGE_KEYS.EVENTS, filtered);
    return true;
  }

  /**
   * Retrieves global settings.
   */
  async getSettings(): Promise<GlobalSettings> {
    const raw = await getStorageItem<GlobalSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...raw };
  }

  /**
   * Updates global settings.
   */
  async updateSettings(updates: Partial<GlobalSettings>): Promise<GlobalSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    await setStorageItem(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }

  /**
   * Retrieves reminder delivery history.
   */
  async getDeliveryHistory(): Promise<ReminderDeliveryHistoryEntry[]> {
    return getStorageItem<ReminderDeliveryHistoryEntry[]>(STORAGE_KEYS.DELIVERY_HISTORY, []);
  }

  /**
   * Records a delivered or scheduled reminder entry.
   */
  async recordDelivery(entry: ReminderDeliveryHistoryEntry): Promise<void> {
    const history = await this.getDeliveryHistory();
    const existingIndex = history.findIndex(h => h.id === entry.id);
    if (existingIndex !== -1) {
      history[existingIndex] = entry;
    } else {
      history.push(entry);
    }
    // Keep last 500 entries to prevent unbounded growth
    if (history.length > 500) {
      history.splice(0, history.length - 500);
    }
    await setStorageItem(STORAGE_KEYS.DELIVERY_HISTORY, history);
  }

  /**
   * Exports all events and settings as a versioned JSON payload.
   */
  async exportData(): Promise<ExportPayload> {
    const events = await this.getEvents();
    const settings = await this.getSettings();
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      settings,
      events,
    };
  }

  /**
   * Validates imported payload and previews conflicts before applying.
   */
  async previewImport(rawJson: any) {
    const validationErrors: string[] = [];
    if (!rawJson || typeof rawJson !== 'object') {
      return { valid: false, errors: ['Import file must be a valid JSON object.'] };
    }

    if (!Array.isArray(rawJson.events)) {
      validationErrors.push('Missing "events" array in import payload.');
    }

    const validStatuses = new Set(['interested', 'planned', 'registered', 'participated', 'not_participating']);
    const sanitizedEvents: CTFEvent[] = [];

    if (Array.isArray(rawJson.events)) {
      rawJson.events.forEach((ev: any, idx: number) => {
        if (!ev || typeof ev !== 'object') {
          validationErrors.push(`Event at index ${idx} is not an object.`);
          return;
        }
        if (!ev.name || typeof ev.name !== 'string' || !ev.name.trim()) {
          validationErrors.push(`Event at index ${idx} has a missing or empty name.`);
          return;
        }
        if (ev.status && !validStatuses.has(ev.status)) {
          validationErrors.push(`Event "${ev.name}" has invalid status "${ev.status}".`);
          return;
        }

        sanitizedEvents.push({
          id: ev.id || generateEventId(),
          name: sanitizeText(ev.name),
          status: validStatuses.has(ev.status) ? ev.status : 'interested',
          lifecycle: ev.lifecycle || 'unknown',
          format: ev.format || 'unknown',
          source: ev.source || 'manual',
          sourceEventId: ev.sourceEventId ? String(ev.sourceEventId) : undefined,
          ctftimeUrl: normalizeUrl(ev.ctftimeUrl),
          websiteUrl: normalizeUrl(ev.websiteUrl),
          registrationUrl: normalizeUrl(ev.registrationUrl),
          startAt: ev.startAt,
          endAt: ev.endAt,
          timezone: ev.timezone || 'UTC',
          registrationDeadlineAt: ev.registrationDeadlineAt,
          teamMode: ev.teamMode === 'team' ? 'team' : 'solo',
          teamName: sanitizeText(ev.teamName),
          weight: typeof ev.weight === 'number' ? ev.weight : undefined,
          points: typeof ev.points === 'number' ? ev.points : undefined,
          notes: sanitizeText(ev.notes),
          reminderPreferences: {
            ...DEFAULT_REMINDER_PREFERENCES,
            ...(ev.reminderPreferences || {}),
          },
          createdAt: ev.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dismissedPrompt: !!ev.dismissedPrompt,
          verifiedFields: Array.isArray(ev.verifiedFields) ? ev.verifiedFields : ['name'],
        });
      });
    }

    if (validationErrors.length > 0) {
      return { valid: false, errors: validationErrors };
    }

    const currentEvents = await this.getEvents();
    const analysis = detectImportConflicts(currentEvents, sanitizedEvents);

    return {
      valid: true,
      sanitizedEvents,
      analysis,
    };
  }

  /**
   * Applies an import in 'merge' or 'replace' mode with optional conflict resolutions.
   */
  async applyImport(
    rawJson: any,
    mode: 'merge' | 'replace' = 'merge',
    resolutions?: Record<string, 'keep_existing' | 'use_imported'>
  ): Promise<{ success: boolean; importedCount: number; errors?: string[] }> {
    const preview = await this.previewImport(rawJson);
    if (!preview.valid || !preview.sanitizedEvents) {
      return { success: false, importedCount: 0, errors: preview.errors };
    }

    const incoming = preview.sanitizedEvents;

    if (mode === 'replace') {
      await setStorageItem(STORAGE_KEYS.EVENTS, incoming);
      if (rawJson.settings) {
        await this.updateSettings(rawJson.settings);
      }
      return { success: true, importedCount: incoming.length };
    }

    // Merge mode
    const current = await this.getEvents();
    const eventMap = new Map<string, CTFEvent>();
    current.forEach(e => eventMap.set(e.id, e));

    for (const item of incoming) {
      const match = findExistingEvent(Array.from(eventMap.values()), item);
      if (!match) {
        eventMap.set(item.id, item);
      } else {
        const choice = resolutions ? resolutions[match.id] : 'use_imported';
        if (choice === 'use_imported') {
          const merged = mergeEvent(match, item);
          eventMap.set(match.id, merged);
        }
      }
    }

    const finalList = Array.from(eventMap.values());
    await setStorageItem(STORAGE_KEYS.EVENTS, finalList);

    if (rawJson.settings) {
      await this.updateSettings(rawJson.settings);
    }

    return { success: true, importedCount: incoming.length };
  }
}

export const eventRepository = new EventRepository();
