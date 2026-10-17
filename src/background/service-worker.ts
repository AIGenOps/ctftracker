import { alarmManager } from './alarm-manager';
import { handleExtensionMessage } from './message-router';

// Initialize alarms on worker startup or extension install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[CTF Tracker] Extension installed/updated. Reconciling alarms...');
  await alarmManager.reconcileAlarms();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[CTF Tracker] Browser startup. Reconciling alarms...');
  await alarmManager.reconcileAlarms();
});

// Alarm firing listener
chrome.alarms.onAlarm.addListener(async (alarm) => {
  await alarmManager.handleAlarm(alarm);
});

// Notification click listener
chrome.notifications.onClicked.addListener(async (notificationId) => {
  // Format: notif__ctf_reminder__<eventId>__<reminderType>__<fingerprint>
  const match = notificationId.match(/^notif__ctf_reminder__([^_]+)/);
  const eventId = match ? match[1] : '';

  const dashboardUrl = chrome.runtime.getURL('dashboard.html') + (eventId ? `?eventId=${eventId}` : '');
  await chrome.tabs.create({ url: dashboardUrl });
  chrome.notifications.clear(notificationId);
});

// Central message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleExtensionMessage(message, sender)
    .then((result) => sendResponse(result))
    .catch((error) => {
      console.error('[CTF Tracker] Message handling error:', error);
      sendResponse({ error: error?.message || 'Unknown error' });
    });
  return true; // Keep message channel open for async response
});
