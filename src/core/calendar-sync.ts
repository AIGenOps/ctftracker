import { CTFEvent } from './event-schema';

/**
 * Formats a Date or ISO string into UTC compact format for calendar links (YYYYMMDDTHHmmssZ).
 */
export function formatCalendarDateUtc(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided for calendar export');
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generates an Add to Google Calendar direct URL.
 */
export function buildGoogleCalendarUrl(event: CTFEvent): string {
  if (!event.startAt || !event.endAt) {
    return '';
  }

  const start = formatCalendarDateUtc(event.startAt);
  const end = formatCalendarDateUtc(event.endAt);

  const lines: string[] = [];
  if (event.websiteUrl) lines.push(`Official Website: ${event.websiteUrl}`);
  if (event.ctftimeUrl) lines.push(`CTFtime Page: ${event.ctftimeUrl}`);
  if (event.format) lines.push(`Format: ${event.format.toUpperCase()}`);
  if (event.teamMode === 'team' && event.teamName) lines.push(`Team: ${event.teamName}`);
  if (event.notes) lines.push(`Notes: ${event.notes}`);

  const details = lines.join('\n\n');
  const location = event.format === 'onsite' ? 'On-site' : 'Online';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${start}/${end}`,
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an Add to Outlook Calendar direct URL.
 */
export function buildOutlookCalendarUrl(event: CTFEvent): string {
  if (!event.startAt || !event.endAt) {
    return '';
  }

  const start = new Date(event.startAt).toISOString();
  const end = new Date(event.endAt).toISOString();

  const lines: string[] = [];
  if (event.websiteUrl) lines.push(`Website: ${event.websiteUrl}`);
  if (event.ctftimeUrl) lines.push(`CTFtime: ${event.ctftimeUrl}`);
  if (event.notes) lines.push(`Notes: ${event.notes}`);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.name,
    startdt: start,
    enddt: end,
    body: lines.join('\n\n'),
    location: event.format === 'onsite' ? 'On-site' : 'Online',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generates RFC 5545 compliant iCalendar (.ics) content.
 */
export function generateIcsContent(event: CTFEvent): string {
  if (!event.startAt || !event.endAt) {
    throw new Error('Event must have start and end dates to generate iCalendar file');
  }

  const start = formatCalendarDateUtc(event.startAt);
  const end = formatCalendarDateUtc(event.endAt);
  const now = formatCalendarDateUtc(new Date().toISOString());

  const lines: string[] = [];
  if (event.websiteUrl) lines.push(`Website: ${event.websiteUrl}`);
  if (event.ctftimeUrl) lines.push(`CTFtime: ${event.ctftimeUrl}`);
  if (event.teamMode === 'team' && event.teamName) lines.push(`Team: ${event.teamName}`);
  if (event.notes) lines.push(`Notes: ${event.notes}`);

  const descriptionEscaped = lines
    .join('\\n\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

  const summaryEscaped = event.name.replace(/,/g, '\\,').replace(/;/g, '\\;');
  const location = event.format === 'onsite' ? 'On-site' : 'Online';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CTF Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:ctftracker-${event.id}@local`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summaryEscaped}`,
    `DESCRIPTION:${descriptionEscaped}`,
    `LOCATION:${location}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Triggers a browser download of the .ics file.
 */
export function downloadIcsFile(event: CTFEvent): void {
  const content = generateIcsContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeName = event.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${safeName}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
