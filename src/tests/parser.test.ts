import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  extractCTFtimeEventId,
  isCTFtimeListingPage,
  parseCTFtimeEventPage,
  parseCTFtimeListingPage,
} from '../content/ctftime-parser';
import { isSupportedExternalSite, parseExternalCtfPage } from '../content/external-detector';

describe('CTFtime Detection & Parser Tests', () => {
  it('T-001: Correctly extracts event ID from valid CTFtime event URLs', () => {
    expect(extractCTFtimeEventId('https://ctftime.org/event/3409')).toBe('3409');
    expect(extractCTFtimeEventId('https://ctftime.org/event/3409/')).toBe('3409');
    expect(extractCTFtimeEventId('https://www.ctftime.org/event/12345?tab=rules')).toBe('12345');
  });

  it('T-002: Does not detect event ID on non-event CTFtime URLs', () => {
    expect(extractCTFtimeEventId('https://ctftime.org/team/283057')).toBeNull();
    expect(extractCTFtimeEventId('https://ctftime.org/event/list/upcoming')).toBeNull();
    expect(extractCTFtimeEventId('https://ctftime.org/')).toBeNull();
    expect(extractCTFtimeEventId('https://other-site.org/event/3409')).toBeNull();
  });

  it('T-003: Correctly identifies CTFtime listing pages', () => {
    expect(isCTFtimeListingPage('https://ctftime.org/')).toBe(true);
    expect(isCTFtimeListingPage('https://ctftime.org/event/list/upcoming')).toBe(true);
    expect(isCTFtimeListingPage('https://ctftime.org/events/2026')).toBe(true);
    expect(isCTFtimeListingPage('https://ctftime.org/event/3409')).toBe(false);
  });

  it('T-004: Parses real CTFtime event fixture (SAS CTF 2026 Finals)', () => {
    const fixturePath = resolve(__dirname, '../../fixtures/ctftime/event_3409.html');
    const html = readFileSync(fixturePath, 'utf-8');

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const result = parseCTFtimeEventPage(doc, 'https://ctftime.org/event/3409/');

    expect(result.source).toBe('ctftime');
    expect(result.sourceEventId).toBe('3409');
    expect(result.name).toBe('SAS CTF 2026 Finals');
    expect(result.format).toBe('onsite');
    expect(result.websiteUrl).toBe('https://ctf.thesascon.com');
    expect(result.weight).toBe(49.5);
    expect(result.startAt).toBeDefined();
    expect(result.endAt).toBeDefined();
    expect(new Date(result.startAt!).getTime()).toBeLessThan(new Date(result.endAt!).getTime());
  });

  it('T-005: Parses real CTFtime online fixture (cruXipher 2026)', () => {
    const fixturePath = resolve(__dirname, '../../fixtures/ctftime/event_3369.html');
    const html = readFileSync(fixturePath, 'utf-8');

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const result = parseCTFtimeEventPage(doc, 'https://ctftime.org/event/3369/');

    expect(result.source).toBe('ctftime');
    expect(result.sourceEventId).toBe('3369');
    expect(result.name).toContain('cruXipher 2026');
    expect(result.format).toBe('online');
    expect(result.websiteUrl).toBe('https://cruxipher.crux-bphc.com');
    expect(result.weight).toBe(0);
    expect(result.startAt).toBeDefined();
  });

  it('T-006: Parses listing table fixture', () => {
    const fixturePath = resolve(__dirname, '../../fixtures/ctftime/upcoming_list.html');
    const html = readFileSync(fixturePath, 'utf-8');

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const listing = parseCTFtimeListingPage(doc);

    expect(listing.length).toBeGreaterThan(0);
    const sas = listing.find(e => e.sourceEventId === '3409');
    expect(sas).toBeDefined();
    expect(sas?.name).toBe('SAS CTF 2026 Finals');
  });

  it('T-007: External detector identifies CTFd platforms and parses safely', () => {
    document.documentElement.innerHTML = `
      <html>
        <head>
          <meta name="generator" content="CTFd 3.5.0">
          <title>Midnight Sun CTF - CTFd</title>
        </head>
        <body>
          <nav class="navbar"><span class="navbar-brand">Midnight Sun CTF</span></nav>
          <a href="/challenges">Challenges</a>
          <a href="/scoreboard">Scoreboard</a>
          <a href="/register">Register Team</a>
        </body>
      </html>
    `;

    const isExt = isSupportedExternalSite(document, 'https://midnightsun.ctfd.io/challenges');
    expect(isExt).toBe(true);

    const parsed = parseExternalCtfPage(document, 'https://midnightsun.ctfd.io/challenges');
    expect(parsed.source).toBe('external');
    expect(parsed.name).toBe('Midnight Sun CTF');
    expect(parsed.registrationUrl).toBe('https://midnightsun.ctfd.io/register');
  });
});
