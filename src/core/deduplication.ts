import { CTFEvent } from './event-schema';
import { normalizeUrl } from './event-normalizer';

/**
 * Finds an existing event matching the candidate record based strictly on:
 * 1. Matching source and sourceEventId (e.g. ctftime event ID '3409').
 * 2. Matching normalized ctftimeUrl.
 * 3. Matching normalized canonical websiteUrl (excluding generic hub/root URLs).
 *
 * NOTE: As mandated by architecture specifications, events with identical names
 * but different or missing IDs are NEVER matched automatically.
 */
export function findExistingEvent(
  existingEvents: CTFEvent[],
  candidate: Partial<CTFEvent>
): CTFEvent | undefined {
  if (!candidate) return undefined;

  // 1. Direct ID match
  if (candidate.id) {
    const byId = existingEvents.find(e => e.id === candidate.id);
    if (byId) return byId;
  }

  // 2. Source & sourceEventId match
  if (candidate.source && candidate.sourceEventId) {
    const bySource = existingEvents.find(
      e => e.source === candidate.source && e.sourceEventId === candidate.sourceEventId
    );
    if (bySource) return bySource;
  }

  // 3. CTFtime URL match
  if (candidate.ctftimeUrl) {
    const candCtftime = normalizeUrl(candidate.ctftimeUrl);
    if (candCtftime) {
      const byCtftimeUrl = existingEvents.find(
        e => e.ctftimeUrl && normalizeUrl(e.ctftimeUrl) === candCtftime
      );
      if (byCtftimeUrl) return byCtftimeUrl;
    }
  }

  // 4. Website URL match (only if not a generic portal)
  if (candidate.websiteUrl) {
    const candWeb = normalizeUrl(candidate.websiteUrl);
    if (candWeb && !isGenericUrl(candWeb)) {
      const byWeb = existingEvents.find(
        e => e.websiteUrl && normalizeUrl(e.websiteUrl) === candWeb
      );
      if (byWeb) return byWeb;
    }
  }

  return undefined;
}

/**
 * Checks if a URL is too generic to be used for 1:1 event matching.
 */
function isGenericUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'ctftime.org' ||
      host === 'ctfd.io' ||
      host === 'github.com' ||
      host === 'discord.gg' ||
      host === 'twitter.com' ||
      host === 'x.com'
    );
  } catch {
    return true;
  }
}

/**
 * Merges updates into an existing event, ensuring verified or existing user data
 * is never overwritten by empty or missing values.
 */
export function mergeEvent(
  existing: CTFEvent,
  updates: Partial<CTFEvent>,
  preserveVerified = true
): CTFEvent {
  const verified = new Set(existing.verifiedFields || []);
  const merged: CTFEvent = { ...existing };

  for (const [key, val] of Object.entries(updates)) {
    if (key === 'id' || key === 'createdAt') continue;

    // If preserveVerified is on and this field is marked verified by user, don't overwrite with null/undefined/empty
    if (preserveVerified && verified.has(key)) {
      if (val === undefined || val === null || val === '') {
        continue;
      }
    }

    // Don't overwrite existing non-empty values with undefined or empty strings
    if (val === undefined || val === null || val === '') {
      continue;
    }

    (merged as any)[key] = val;
  }

  // Update verified fields set if updates provided new verified markers
  if (updates.verifiedFields) {
    const combined = new Set([...existing.verifiedFields, ...updates.verifiedFields]);
    merged.verifiedFields = Array.from(combined);
  }

  merged.updatedAt = new Date().toISOString();
  return merged;
}

export interface ImportConflictItem {
  existing: CTFEvent;
  incoming: CTFEvent;
  differingFields: {
    field: string;
    existingValue: any;
    incomingValue: any;
  }[];
}

export interface ImportAnalysis {
  newEvents: CTFEvent[];
  identicalEvents: CTFEvent[];
  conflictingEvents: ImportConflictItem[];
}

/**
 * Analyzes incoming events against the current store to detect conflicts before import.
 */
export function detectImportConflicts(
  existingEvents: CTFEvent[],
  incomingEvents: CTFEvent[]
): ImportAnalysis {
  const newEvents: CTFEvent[] = [];
  const identicalEvents: CTFEvent[] = [];
  const conflictingEvents: ImportConflictItem[] = [];

  for (const incoming of incomingEvents) {
    const existing = findExistingEvent(existingEvents, incoming);
    if (!existing) {
      newEvents.push(incoming);
      continue;
    }

    // Check differing fields
    const differingFields: { field: string; existingValue: any; incomingValue: any }[] = [];
    const fieldsToCheck: (keyof CTFEvent)[] = [
      'name',
      'status',
      'lifecycle',
      'format',
      'startAt',
      'endAt',
      'registrationDeadlineAt',
      'websiteUrl',
      'teamMode',
      'teamName',
      'notes',
    ];

    for (const field of fieldsToCheck) {
      const exVal = existing[field];
      const inVal = incoming[field];
      if (inVal !== undefined && inVal !== null && inVal !== '' && inVal !== exVal) {
        differingFields.push({
          field,
          existingValue: exVal,
          incomingValue: inVal,
        });
      }
    }

    if (differingFields.length > 0) {
      conflictingEvents.push({
        existing,
        incoming,
        differingFields,
      });
    } else {
      identicalEvents.push(incoming);
    }
  }

  return { newEvents, identicalEvents, conflictingEvents };
}
