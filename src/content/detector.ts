import { extractCTFtimeEventId, parseCTFtimeEventPage } from './ctftime-parser';
import { isSupportedExternalSite, parseExternalCtfPage } from './external-detector';
import { showPromptOverlay } from './prompt';
import { ParseResult, RegistrationStatus } from '../core/event-schema';

async function initContentDetector() {
  const currentUrl = window.location.href;
  let parsedCandidate: ParseResult | null = null;

  // 1. Check CTFtime event page
  const ctftimeId = extractCTFtimeEventId(currentUrl);
  if (ctftimeId) {
    parsedCandidate = parseCTFtimeEventPage(document, currentUrl);
  } else if (isSupportedExternalSite(document, currentUrl)) {
    // 2. Check supported external platforms
    parsedCandidate = parseExternalCtfPage(document, currentUrl);
  }

  if (!parsedCandidate || !parsedCandidate.name) {
    return;
  }

  // Check with background service worker whether we should show the prompt
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'DETECT_EVENT',
      candidate: parsedCandidate,
    });

    if (!response || !response.shouldPrompt) {
      return;
    }

    const eventKey = parsedCandidate.sourceEventId || parsedCandidate.canonicalUrl || parsedCandidate.name;
    const sessionDismissedKey = `ctftracker_dismissed_${eventKey}`;

    if (sessionStorage.getItem(sessionDismissedKey)) {
      return;
    }

    showPromptOverlay(
      {
        name: parsedCandidate.name,
        startAt: parsedCandidate.startAt,
        source: parsedCandidate.source === 'ctftime' ? 'CTFtime' : 'External CTF',
      },
      response.existingEvent || null,
      {
        onSaveStatus: async (status: RegistrationStatus) => {
          await chrome.runtime.sendMessage({
            type: 'PROMPT_SAVE_EVENT',
            candidate: parsedCandidate,
            status,
          });
        },
        onOpenDashboard: () => {
          chrome.runtime.sendMessage({
            type: 'OPEN_DASHBOARD',
            eventId: response.existingEvent?.id,
          });
        },
        onDismiss: () => {
          sessionStorage.setItem(sessionDismissedKey, 'true');
        },
      }
    );
  } catch (err) {
    // Service worker might be sleeping or permission restricted
    console.debug('CTF Tracker detector message skipped:', err);
  }
}

// Respond to popup queries for active page event data
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage?.addListener) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PAGE_EVENT_INFO') {
    const currentUrl = window.location.href;
    const ctftimeId = extractCTFtimeEventId(currentUrl);
    let parsed: ParseResult | null = null;

    if (ctftimeId) {
      parsed = parseCTFtimeEventPage(document, currentUrl);
    } else if (isSupportedExternalSite(document, currentUrl)) {
      parsed = parseExternalCtfPage(document, currentUrl);
    } else {
      // Generic page fallback
      parsed = {
        source: 'manual',
        name: document.title,
        canonicalUrl: currentUrl,
        websiteUrl: currentUrl,
        missingFields: ['startAt', 'endAt'],
        warnings: ['Manually captured web page.'],
      };
    }

    sendResponse({ parsed });
    return true;
  }
});
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentDetector);
} else {
  initContentDetector();
}
