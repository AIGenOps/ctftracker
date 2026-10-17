import { eventRepository } from '../core/event-repository';
import { alarmManager } from './alarm-manager';
import { RegistrationStatus } from '../core/event-schema';

export async function handleExtensionMessage(
  message: any,
  sender: chrome.runtime.MessageSender
): Promise<any> {
  if (!message || typeof message !== 'object') {
    return { error: 'Invalid message payload' };
  }

  switch (message.type) {
    case 'DETECT_EVENT': {
      const candidate = message.candidate;
      const settings = await eventRepository.getSettings();
      const existing = await eventRepository.findMatchingEvent(candidate);

      const shouldPrompt = settings.automaticPromptsEnabled && (!existing || existing.dismissedPrompt === false);
      return {
        existingEvent: existing || null,
        shouldPrompt,
        settings,
      };
    }

    case 'PROMPT_SAVE_EVENT': {
      const { candidate, status } = message;
      const saved = await eventRepository.saveEvent({
        ...candidate,
        status: status as RegistrationStatus,
        dismissedPrompt: false,
      });
      await alarmManager.reconcileAlarms();
      return { success: true, event: saved };
    }

    case 'GET_EVENTS': {
      const events = await eventRepository.getEvents();
      return { events };
    }

    case 'GET_EVENT': {
      const event = await eventRepository.getEventById(message.id);
      return { event };
    }

    case 'CREATE_EVENT':
    case 'SAVE_EVENT': {
      const saved = await eventRepository.saveEvent(message.event);
      await alarmManager.reconcileAlarms();
      return { success: true, event: saved };
    }

    case 'UPDATE_EVENT': {
      const updated = await eventRepository.updateEvent(message.id, message.updates);
      await alarmManager.reconcileAlarms();
      return { success: true, event: updated };
    }

    case 'DELETE_EVENT': {
      const success = await eventRepository.deleteEvent(message.id);
      await alarmManager.reconcileAlarms();
      return { success };
    }

    case 'SET_EVENT_STATUS': {
      const updated = await eventRepository.setEventStatus(message.id, message.status);
      await alarmManager.reconcileAlarms();
      return { success: true, event: updated };
    }

    case 'GET_SETTINGS': {
      const settings = await eventRepository.getSettings();
      return { settings };
    }

    case 'UPDATE_SETTINGS': {
      const updated = await eventRepository.updateSettings(message.updates);
      await alarmManager.reconcileAlarms();
      return { settings: updated };
    }

    case 'RECONCILE_ALARMS': {
      await alarmManager.reconcileAlarms();
      return { success: true };
    }

    case 'EXPORT_DATA': {
      const data = await eventRepository.exportData();
      return { data };
    }

    case 'IMPORT_PREVIEW': {
      const preview = await eventRepository.previewImport(message.rawJson);
      return preview;
    }

    case 'IMPORT_APPLY': {
      const result = await eventRepository.applyImport(
        message.rawJson,
        message.mode || 'merge',
        message.resolutions
      );
      if (result.success) {
        await alarmManager.reconcileAlarms();
      }
      return result;
    }

    case 'OPEN_DASHBOARD': {
      const url = chrome.runtime.getURL('dashboard.html') + (message.eventId ? `?eventId=${message.eventId}` : '');
      await chrome.tabs.create({ url });
      return { success: true };
    }

    default:
      return { error: `Unhandled message type: ${message.type}` };
  }
}
