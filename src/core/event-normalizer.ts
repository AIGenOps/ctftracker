import { CTFEvent, EventFormat, EventLifecycle, EventSource, RegistrationStatus, TeamMode } from './event-schema';

/**
 * Normalizes and validates URLs to only allow http and https protocols.
 * Rejects javascript:, data:, and malformed URLs.
 */
export function normalizeUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    // Remove trailing slash for root-only domains to normalize (e.g. https://example.com/ -> https://example.com)
    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      return `${parsed.protocol}//${parsed.host}`;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/**
 * Sanitizes plain text input by stripping control chars and excessive whitespace.
 */
export function sanitizeText(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim();
}

/**
 * Formats a Date object or valid date string into ISO-8601 UTC.
 */
export function parseDateToISO(dateInput?: string | Date | null): string | undefined {
  if (!dateInput) return undefined;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? undefined : dateInput.toISOString();
  }

  const str = dateInput.trim();
  if (!str) return undefined;

  // Try standard ISO or browser parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }

  // Handle CTFtime format: "Tue, 20 Oct. 2026, 03:00 UTC" or "20 Oct. 2026, 03:00 UTC"
  // Normalize "Oct." -> "Oct", remove day of week prefix
  const cleaned = str
    .replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*/i, '')
    .replace(/([A-Za-z]{3})\./g, '$1');

  const d2 = new Date(cleaned);
  if (!isNaN(d2.getTime())) {
    return d2.toISOString();
  }

  return undefined;
}

/**
 * Computes event lifecycle based on timestamps.
 */
export function calculateLifecycle(
  startAt?: string,
  endAt?: string,
  explicitLifecycle?: EventLifecycle,
  now: Date = new Date()
): EventLifecycle {
  if (explicitLifecycle === 'cancelled' || explicitLifecycle === 'postponed') {
    return explicitLifecycle;
  }

  if (!startAt) return 'unknown';

  const startTime = new Date(startAt).getTime();
  if (isNaN(startTime)) return 'unknown';

  const nowTime = now.getTime();

  if (nowTime < startTime) {
    return 'upcoming';
  }

  if (endAt) {
    const endTime = new Date(endAt).getTime();
    if (!isNaN(endTime)) {
      if (nowTime > endTime) {
        return 'ended';
      }
      return 'live';
    }
  }

  // If start is past and no end date known, treat as live for the first 48 hours or ended
  const fortyEightHours = 48 * 60 * 60 * 1000;
  if (nowTime - startTime < fortyEightHours) {
    return 'live';
  }
  return 'ended';
}

/**
 * Generates a stable schedule fingerprint to identify changes to event timing.
 */
export function generateScheduleFingerprint(event: {
  startAt?: string;
  endAt?: string;
  registrationDeadlineAt?: string;
  lifecycle?: string;
}): string {
  const s = event.startAt || 'none';
  const e = event.endAt || 'none';
  const d = event.registrationDeadlineAt || 'none';
  const l = event.lifecycle || 'unknown';
  return `${s}__${e}__${d}__${l}`;
}

/**
 * Generates a unique stable event ID.
 */
export function generateEventId(prefix = 'ctf'): string {
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
}
