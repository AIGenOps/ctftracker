# CTF Tracker

A local-first Chromium browser extension (Manifest V3) for detecting Capture The Flag (CTF) competitions, managing participation statuses, and delivering configurable countdown alerts.

---

## Overview

CTF Tracker integrates directly into the browser to detect upcoming cybersecurity competitions across supported portals (including CTFtime and CTFd), monitor registration deadlines, and dispatch desktop notifications without sending browsing telemetry to external cloud services.

### Core Capabilities

- **Automated Competition Detection:** Inspects CTFtime pages (`ctftime.org/event/<id>`) and supported platform architectures, extracting competition metadata, verified start/end UTC timestamps, format categories (Online, On-site, Hybrid), rating weights, and registration endpoints.
- **Top-Right Capture Prompt:** Injected via Shadow DOM to guarantee zero styling interference with target sites. Displays clean metadata previews, keyboard-dismissible dialogs, and instant status assignment (Registered, Planned, Interested).
- **Multi-Tier Reminder Engine:** Uses the `chrome.alarms` API to schedule persistent countdown alerts (7 days, 24 hours, 1 hour, 15 minutes, registration deadlines, and event close warnings). Automatically reconciles schedules on browser startup or event updates.
- **Unified Management Dashboard:** Centralized workspace supporting multi-criteria search, format and team filters, lifecycle views (Upcoming, Live, Concluded, Opted-out), full CRUD operations, and configurable lead times.
- **Conflict-Aware Data Portability:** Complete JSON export and import capabilities with an interactive conflict resolution modal that previews field differences prior to applying merges.
- **Privacy and Least Privilege:** All records remain on the local machine within `chrome.storage.local`. No credentials, tokens, or network requests are dispatched to remote third parties.

---

## Installation

### Load Unpacked Extension (Chrome / Brave / Edge)

1. Open your Chromium-based browser and navigate to the extensions page:
   - **Chrome:** `chrome://extensions`
   - **Brave:** `brave://extensions`
   - **Edge:** `edge://extensions`
2. Enable **Developer mode** using the toggle switch in the upper-right corner.
3. Click **Load unpacked**.
4. Select the build directory:
   ```
   /home/adityap/Documents/Blog/CTFTRACKER/dist
   ```
5. Pin the **CTF Tracker** extension to the browser toolbar for quick access.

---

## Engineering & Testing

### Production Build

```bash
npm run build
```

Generates the compiled assets in `dist/`:
- Multi-page React user interfaces (`popup.html`, `dashboard.html`)
- Manifest V3 Background Service Worker (`background.js`)
- Content script injector (`content.js`)
- Extension manifest (`manifest.json`) and high-resolution icons

### Automated Test Suite

```bash
npm test
```

Runs 28 automated unit and integration tests across 5 test suites:
- **Parser & Extraction:** Verified against live CTFtime HTML fixtures (`event_3409.html`, `event_3369.html`, `upcoming_list.html`).
- **Deduplication:** Identity resolution via stable IDs and canonical URLs; prevents false-positive merges for distinct competitions sharing identical titles.
- **Reminder Engine:** Validates all six trigger calculations, schedule version fingerprinting, and status-based alert suppression.
- **Storage Repository:** CRUD lifecycle, settings mutation, and alarm delivery deduplication.
- **Import/Export:** Schema validation, malformed payload protection, and conflict diff generation.

---

## License

MIT License.
