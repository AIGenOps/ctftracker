import { EventFormat, ParseResult } from '../core/event-schema';
import { parseDateToISO, normalizeUrl } from '../core/event-normalizer';

export interface CTFtimeListingEvent {
  sourceEventId: string;
  name: string;
  ctftimeUrl: string;
  dateStr?: string;
  format?: EventFormat;
  location?: string;
  weight?: number;
}

/**
 * Extracts the CTFtime event ID from a URL.
 */
export function extractCTFtimeEventId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('ctftime.org') && !parsed.hostname.includes('localhost') && !parsed.hostname.includes('127.0.0.1')) return null;
    const match = parsed.pathname.match(/\/event\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Checks whether the URL is a CTFtime listing page.
 */
export function isCTFtimeListingPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('ctftime.org')) return false;
    return (
      parsed.pathname === '/' ||
      parsed.pathname.startsWith('/event/list') ||
      parsed.pathname.startsWith('/events')
    );
  } catch {
    return false;
  }
}

/**
 * Parses a CTFtime event page DOM / Document into a structured ParseResult.
 */
export function parseCTFtimeEventPage(doc: Document, currentUrl: string): ParseResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  const sourceEventId = extractCTFtimeEventId(currentUrl) || undefined;
  if (!sourceEventId) {
    warnings.push('Could not extract CTFtime event ID from URL.');
  }

  // 1. Event Name
  let name: string | undefined;
  const headerEl = doc.querySelector('.page-header h2') || doc.querySelector('h2');
  if (headerEl && headerEl.textContent) {
    name = headerEl.textContent.trim();
  } else {
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (ogTitle) {
      name = ogTitle.trim();
    } else {
      const titleTag = doc.querySelector('title')?.textContent;
      if (titleTag) {
        name = titleTag.replace(/^CTFtime\.org\s*\/\s*/i, '').trim();
      }
    }
  }

  if (!name) {
    missingFields.push('name');
  }

  // 2. Canonical URL
  const canonicalEl = doc.querySelector('link[rel="canonical"]');
  const canonicalUrl =
    normalizeUrl(canonicalEl?.getAttribute('href')) ||
    (sourceEventId ? `https://ctftime.org/event/${sourceEventId}/` : undefined);

  // 3. Start & End Dates
  let startAt: string | undefined;
  let endAt: string | undefined;
  let timezone: string = 'UTC';

  // Look for paragraph containing calendar link or dash separating UTC dates
  let dateText: string | null = null;
  const calAnchor = doc.querySelector('a[href$=".ics"]');
  if (calAnchor && calAnchor.parentElement) {
    dateText = calAnchor.parentElement.textContent || null;
  }

  if (!dateText) {
    // Search paragraphs in span10 or container
    const paragraphs = doc.querySelectorAll('p');
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const text = p.textContent || '';
      if ((text.includes('—') || text.includes('&mdash;') || text.includes(' - ')) && text.includes('UTC')) {
        dateText = text;
        break;
      }
    }
  }

  if (dateText) {
    // Clean text, remove extra whitespace
    const normalizedText = dateText
      .replace(/&mdash;/g, '—')
      .replace(/&nbsp;/g, ' ')
      .trim();

    // Split on dash
    const parts = normalizedText.split(/—|–/);
    if (parts.length >= 2) {
      const rawStart = parts[0].trim();
      const rawEnd = parts[1].trim();

      // Check for year in end date e.g. "2026"
      const yearMatch = rawEnd.match(/\b(20\d\d)\b/);
      let adjustedStart = rawStart;
      if (yearMatch && !rawStart.match(/\b(20\d\d)\b/)) {
        // e.g. "20 Oct., 03:00 UTC" -> add year from end date
        adjustedStart = rawStart.replace(/,\s*(\d\d:\d\d)/, ` ${yearMatch[1]}, $1`);
      }

      startAt = parseDateToISO(adjustedStart);
      endAt = parseDateToISO(rawEnd);
    }
  }

  if (!startAt) {
    missingFields.push('startAt');
  }
  if (!endAt) {
    missingFields.push('endAt');
  }

  // 4. Format: On-line vs On-site vs Hybrid
  let format: EventFormat = 'unknown';
  const boldTags = doc.querySelectorAll('b');
  for (let i = 0; i < boldTags.length; i++) {
    const text = boldTags[i].textContent?.trim().toLowerCase() || '';
    if (text === 'on-site' || text === 'onsite') {
      format = 'onsite';
      break;
    }
    if (text === 'on-line' || text === 'online') {
      format = 'online';
      break;
    }
    if (text === 'hybrid') {
      format = 'hybrid';
      break;
    }
  }

  // 5. Official URL
  let websiteUrl: string | undefined;
  const links = doc.querySelectorAll('a[href^="http"]');
  for (let i = 0; i < links.length; i++) {
    const a = links[i];
    const prevText = a.parentElement?.textContent || '';
    if (prevText.toLowerCase().includes('official url')) {
      const href = a.getAttribute('href');
      if (href && !href.includes('ctftime.org')) {
        websiteUrl = normalizeUrl(href);
        break;
      }
    }
  }

  // 6. Weight
  let weight: number | undefined;
  const fullBodyText = doc.body?.textContent || '';
  const weightMatch = fullBodyText.match(/Rating weight:\s*([\d\.]+)/i);
  if (weightMatch) {
    const parsedWeight = parseFloat(weightMatch[1]);
    if (!isNaN(parsedWeight)) {
      weight = parsedWeight;
    }
  }

  return {
    source: 'ctftime',
    sourceEventId,
    canonicalUrl,
    name,
    startAt,
    endAt,
    timezone,
    websiteUrl,
    format,
    weight,
    missingFields,
    warnings,
  };
}

/**
 * Parses upcoming events from a CTFtime listing table.
 */
export function parseCTFtimeListingPage(doc: Document): CTFtimeListingEvent[] {
  const events: CTFtimeListingEvent[] = [];
  const rows = doc.querySelectorAll('table.table tr');

  rows.forEach((row) => {
    const link = row.querySelector('a[href^="/event/"]');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    const match = href.match(/\/event\/(\d+)/);
    if (!match) return;

    const sourceEventId = match[1];
    const name = link.textContent?.trim() || '';
    if (!name) return;

    const cols = row.querySelectorAll('td');
    let dateStr: string | undefined;
    let format: EventFormat = 'unknown';
    let location: string | undefined;
    let weight: number | undefined;

    if (cols.length >= 2) {
      dateStr = cols[1].textContent?.trim();
    }
    if (cols.length >= 3) {
      const fText = cols[2].textContent?.trim().toLowerCase() || '';
      if (fText.includes('jeopardy') || fText.includes('attack-defense')) {
        // Location column usually has online/onsite
      }
    }
    if (cols.length >= 4) {
      const locText = cols[3].textContent?.trim().toLowerCase() || '';
      location = locText;
      if (locText.includes('on-line') || locText.includes('online')) {
        format = 'online';
      } else if (locText.includes('on-site') || locText.includes('onsite')) {
        format = 'onsite';
      }
    }
    if (cols.length >= 5) {
      const wVal = parseFloat(cols[4].textContent?.trim() || '');
      if (!isNaN(wVal)) {
        weight = wVal;
      }
    }

    events.push({
      sourceEventId,
      name,
      ctftimeUrl: `https://ctftime.org/event/${sourceEventId}/`,
      dateStr,
      format,
      location,
      weight,
    });
  });

  return events;
}
