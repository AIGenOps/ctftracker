# 6. Detection and Parsing Strategy

## 6.1 Detection tiers

### Tier 1 — CTFtime event pages
Primary and highest-priority detection target. Example URL:
`https://ctftime.org/event/3409`

Requirements:
- Validate the host and URL shape.
- Extract stable event ID.
- Parse event name, start/end, official website, format, and available metadata.
- Mark absent values as unknown.
- Keep parser selectors isolated and covered by fixtures.

### Tier 2 — CTFtime listings
Where feasible:
- Identify individual event links.
- Offer selection to add one or more events.
- Do not create records for every visible event automatically without a user action.
- Avoid repeatedly parsing the entire page after each minor DOM mutation.

### Tier 3 — Supported external sites
Maintain explicit site-specific rules or signatures. Each supported site should have:
- A documented match rule.
- Known fields that can be extracted.
- Confidence/verification rules.
- Test fixtures.
- A fallback if its structure changes.

Do not promise universal CTF detection.

### Tier 4 — Manual capture
Available from the popup/dashboard and, where allowed, from the current tab. It must work without CTFtime or an external detector.

## 6.2 Parsing result contract

A parser should return structured data rather than directly writing to storage:

```ts
interface ParseResult {
  source: "ctftime" | "external";
  sourceEventId?: string;
  canonicalUrl?: string;
  name?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  websiteUrl?: string;
  registrationUrl?: string;
  registrationDeadlineAt?: string;
  format?: "online" | "onsite" | "hybrid" | "unknown";
  weight?: number;
  points?: number;
  missingFields: string[];
  warnings: string[];
}
```

This is a planning contract; it is not implemented code.

## 6.3 Confidence and verification

- Source IDs and directly parsed links may be high-confidence identifiers.
- Dates should be parsed only when their semantics and timezone are understood.
- Ambiguous time values must be flagged for verification.
- Manual edits should be marked as manually verified.
- Do not automatically replace verified manual values with empty or lower-confidence parser results.

## 6.4 CTFtime parser validation

Before implementing final selectors:
1. Inspect current CTFtime event-page markup.
2. Inspect current event-listing markup.
3. Save representative sanitized fixtures.
4. Test events with complete and incomplete metadata.
5. Test URL variants and malformed pages.
6. Document selectors and fallback behavior.
7. Add regression fixtures whenever the parser is repaired.

Do not assume page structure from a mockup or old snippet.

## 6.5 External detection safeguards

- Use narrow host permissions for supported domains.
- Do not execute scripts or HTML extracted from event pages.
- Treat all page text as untrusted input.
- Validate all extracted URLs.
- Do not interpret “Register” button presence as proof of registration.
- Do not auto-submit forms or click registration actions.
- Unsupported pages should fall back to manual entry rather than unreliable generic scraping.
