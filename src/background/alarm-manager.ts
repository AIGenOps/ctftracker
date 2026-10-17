import { eventRepository } from '../core/event-repository';
import {
  calculateEventReminders,
  formatAlarmName,
  parseAlarmName,
  shouldSuppressReminders,
} from '../core/reminder-rules';

export class AlarmManager {
  /**
   * Reconciles all browser alarms with current stored events and reminder preferences.
   */
  async reconcileAlarms(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.alarms) {
      return;
    }

    const events = await eventRepository.getEvents();
    const plannedAlarms = new Map<string, { triggerTime: number; eventId: string }>();

    for (const event of events) {
      const reminders = calculateEventReminders(event, new Date());
      for (const r of reminders) {
        plannedAlarms.set(r.alarmName, {
          triggerTime: r.triggerTime,
          eventId: r.eventId,
        });
      }
    }

    const existingAlarms = await chrome.alarms.getAll();
    const existingCtfAlarms = existingAlarms.filter(a => a.name.startsWith('ctf_reminder__'));

    // Clear obsolete alarms
    for (const alarm of existingCtfAlarms) {
      if (!plannedAlarms.has(alarm.name)) {
        await chrome.alarms.clear(alarm.name);
      }
    }

    // Schedule new or updated alarms
    const existingNameSet = new Set(existingCtfAlarms.map(a => a.name));
    for (const [alarmName, details] of plannedAlarms.entries()) {
      if (!existingNameSet.has(alarmName)) {
        await chrome.alarms.create(alarmName, {
          when: details.triggerTime,
        });
      }
    }
  }

  /**
   * Handles an alarm triggered by the browser.
   */
  async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    const parsed = parseAlarmName(alarm.name);
    if (!parsed) return;

    const { eventId, reminderType, scheduleFingerprint } = parsed;
    const event = await eventRepository.getEventById(eventId);
    if (!event) return;

    if (shouldSuppressReminders(event)) return;

    // Check delivery history to prevent duplicate notifications
    const history = await eventRepository.getDeliveryHistory();
    const alreadyDelivered = history.some(
      h => h.id === alarm.name && h.state === 'delivered'
    );
    if (alreadyDelivered) return;

    // Build notification content
    let title = `CTF Alert: ${event.name}`;
    let message = `Competition alert for ${event.name}.`;

    switch (reminderType) {
      case '7d':
        title = `7 Days Until ${event.name}`;
        message = `The competition kicks off in 1 week. Prepare your environment and team.`;
        break;
      case '24h':
        title = `24 Hours Until ${event.name}`;
        message = `Starting tomorrow. Review rules, credentials, and connectivity.`;
        break;
      case '1h':
        title = `1 Hour Until ${event.name}`;
        message = `Starting in 60 minutes. Prepare your tools and workspace.`;
        break;
      case '15m':
        title = `15 Minutes Until Kickoff: ${event.name}`;
        message = `The competition begins in 15 minutes.`;
        break;
      case 'deadline':
        title = `Registration Deadline Approaching: ${event.name}`;
        message = `Registration closes soon. Finalize and verify your registration.`;
        break;
      case 'eventEnd':
        title = `15 Minutes Remaining: ${event.name}`;
        message = `Competition ends in 15 minutes. Submit remaining flags now.`;
        break;
    }

    // Fire notification
    const notificationId = `notif__${alarm.name}`;
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title,
        message,
        priority: 2,
        requireInteraction: true,
      });
    }

    // Record delivery
    await eventRepository.recordDelivery({
      id: alarm.name,
      eventId,
      reminderType,
      scheduledFor: new Date(alarm.scheduledTime).toISOString(),
      scheduleFingerprint,
      state: 'delivered',
      deliveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

export const alarmManager = new AlarmManager();
