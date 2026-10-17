import { ParseResult } from '../core/event-schema';
import { normalizeUrl } from '../core/event-normalizer';

/**
 * Checks if the current document is a supported external CTF platform (e.g. CTFd).
 */
export function isSupportedExternalSite(doc: Document, currentUrl: string): boolean {
  try {
    const url = new URL(currentUrl);
    // 1. CTFd Cloud subdomain
    if (url.hostname.endsWith('.ctfd.io')) {
      return true;
    }

    // 2. Self-hosted CTFd signature
    const hasCTFdMeta = !!doc.querySelector('meta[name="generator"][content*="CTFd"]');
    const hasCTFdLinks = !!doc.querySelector('a[href="/challenges"], a[href="/scoreboard"], a[href="/teams"]');
    const hasCTFdBrand = !!doc.querySelector('.navbar-brand, .navbar-title');

    if (hasCTFdMeta || (hasCTFdLinks && hasCTFdBrand)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Parses an external CTF platform page into a ParseResult.
 */
export function parseExternalCtfPage(doc: Document, currentUrl: string): ParseResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  const canonicalUrl = normalizeUrl(currentUrl);

  // Extract competition name from brand or page title
  let name: string | undefined;
  const brandEl = doc.querySelector('.navbar-brand, .navbar-title, h1');
  if (brandEl && brandEl.textContent) {
    name = brandEl.textContent.trim();
  }

  if (!name && doc.title) {
    // Strip common suffixes
    name = doc.title.replace(/\s*[-|]\s*CTFd.*$/i, '').trim();
  }

  if (!name) {
    missingFields.push('name');
  }

  // Registration URL detection
  let registrationUrl: string | undefined;
  const regLink = doc.querySelector('a[href*="/register"]');
  if (regLink) {
    const href = regLink.getAttribute('href');
    if (href) {
      try {
        registrationUrl = normalizeUrl(new URL(href, currentUrl).toString());
      } catch {
        // ignore
      }
    }
  }

  return {
    source: 'external',
    canonicalUrl,
    name,
    websiteUrl: canonicalUrl,
    registrationUrl,
    format: 'online', // External platforms are overwhelmingly online
    missingFields: ['startAt', 'endAt', ...missingFields],
    warnings: ['Detected as external CTF platform; verify event start and end dates.'],
  };
}
