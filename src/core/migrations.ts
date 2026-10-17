import { GlobalSettings, DEFAULT_SETTINGS } from './event-schema';

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Validates and migrates stored data structures to the current schema version.
 */
export function migrateData(raw: any): { events: any[]; settings: GlobalSettings } {
  if (!raw || typeof raw !== 'object') {
    return {
      events: [],
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  const settings: GlobalSettings = {
    ...DEFAULT_SETTINGS,
    ...(raw.settings || {}),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  const events: any[] = Array.isArray(raw.events) ? raw.events : [];

  // Migration rules for future schema versions can be appended here
  return { events, settings };
}
