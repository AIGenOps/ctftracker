import React, { useEffect, useState } from 'react';
import { CTFEvent, ParseResult, RegistrationStatus } from '../core/event-schema';
import { eventRepository } from '../core/event-repository';

async function sendAppMessage(msg: any): Promise<any> {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      const res = await new Promise((resolve) => {
        chrome.runtime.sendMessage(msg, (r) => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(r);
          }
        });
      });
      if (res) return res;
    } catch {
      // fallback
    }
  }

  switch (msg.type) {
    case 'GET_EVENTS':
      return { events: await eventRepository.getEvents() };
    case 'DETECT_EVENT': {
      const settings = await eventRepository.getSettings();
      const existing = await eventRepository.findMatchingEvent(msg.candidate);
      return {
        existingEvent: existing || null,
        shouldPrompt: settings.automaticPromptsEnabled && (!existing || existing.dismissedPrompt === false),
        settings,
      };
    }
    case 'SAVE_EVENT':
      return { success: true, event: await eventRepository.saveEvent(msg.event) };
    default:
      return null;
  }
}

export const PopupApp: React.FC = () => {
  const [currentPageEvent, setCurrentPageEvent] = useState<ParseResult | null>(null);
  const [existingMatchedEvent, setExistingMatchedEvent] = useState<CTFEvent | null>(null);
  const [nextUpcomingEvent, setNextUpcomingEvent] = useState<CTFEvent | null>(null);
  const [notificationWarning, setNotificationWarning] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string>('');

  useEffect(() => {
    loadData();
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      setNotificationWarning(true);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch next upcoming event
      const response = await sendAppMessage({ type: 'GET_EVENTS' });
      if (response && Array.isArray(response.events)) {
        const now = Date.now();
        const upcoming = response.events
          .filter((e: CTFEvent) => e.status !== 'not_participating' && e.lifecycle !== 'ended')
          .sort((a: CTFEvent, b: CTFEvent) => {
            const timeA = a.startAt ? new Date(a.startAt).getTime() : Infinity;
            const timeB = b.startAt ? new Date(b.startAt).getTime() : Infinity;
            return timeA - timeB;
          });

        if (upcoming.length > 0) {
          setNextUpcomingEvent(upcoming[0]);
        }
      }

      // 2. Query active tab for event detection
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_EVENT_INFO' }, async (res) => {
            if (chrome.runtime.lastError || !res?.parsed) {
              setLoading(false);
              return;
            }

            setCurrentPageEvent(res.parsed);

            const matchRes = await sendAppMessage({
              type: 'DETECT_EVENT',
              candidate: res.parsed,
            });

            if (matchRes?.existingEvent) {
              setExistingMatchedEvent(matchRes.existingEvent);
            }
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: RegistrationStatus) => {
    if (!currentPageEvent && !existingMatchedEvent) return;

    try {
      const candidateToSave = existingMatchedEvent
        ? { ...existingMatchedEvent, status }
        : {
            ...currentPageEvent,
            name: currentPageEvent?.name || 'Untitled CTF',
            status,
          };

      const res = await sendAppMessage({
        type: 'SAVE_EVENT',
        event: candidateToSave,
      });

      if (res?.success) {
        setExistingMatchedEvent(res.event);
        setActionMessage(`Status updated: ${status.replace('_', ' ')}`);
        setTimeout(() => setActionMessage(''), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openDashboard = (eventId?: string) => {
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD', eventId });
  };

  const formatCountdown = (startAt?: string) => {
    if (!startAt) return 'Date TBD';
    const diff = new Date(startAt).getTime() - Date.now();
    if (diff < 0) return 'LIVE NOW';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `Starts in ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Starts in ${days}d`;
  };

  return (
    <div className="popup-container">
      {/* Header */}
      <div className="header">
        <div className="logo-row">
          <div className="logo-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <span className="logo-title">CTF Tracker</span>
        </div>
        <button className="btn-icon" onClick={() => openDashboard()}>
          Dashboard &rarr;
        </button>
      </div>

      {/* Notification Warning */}
      {notificationWarning && (
        <div className="warning-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>Notifications disabled. Enable browser permissions to receive reminders.</div>
        </div>
      )}

      {/* Active Tab Event Detection */}
      <div className="section-card">
        <div className="section-label">
          <span>Current Tab</span>
          {currentPageEvent && (
            <span style={{ color: '#38bdf8' }}>
              {currentPageEvent.source === 'ctftime' ? 'CTFtime' : 'External'}
            </span>
          )}
        </div>

        {currentPageEvent ? (
          <>
            <div className="card-title">{currentPageEvent.name || 'Detected Competition'}</div>
            <div className="badge-row">
              {existingMatchedEvent ? (
                <span className={`status-badge badge-${existingMatchedEvent.status}`}>
                  {existingMatchedEvent.status.replace('_', ' ').toUpperCase()}
                </span>
              ) : (
                <span className="status-badge badge-interested">NEW DETECTION</span>
              )}
              {currentPageEvent.startAt && (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {new Date(currentPageEvent.startAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Participation Status:
            </div>
            <div className="status-button-group">
              {(['interested', 'planned', 'registered', 'participated', 'not_participating'] as RegistrationStatus[]).map(
                (st) => {
                  const isActive = existingMatchedEvent?.status === st;
                  return (
                    <button
                      key={st}
                      className={`status-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleStatusChange(st)}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  );
                }
              )}
            </div>
          </>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: '12px', padding: '6px 0' }}>
            No CTF competition detected on this page.
          </div>
        )}

        {actionMessage && (
          <div style={{ color: '#34d399', fontSize: '11px', fontWeight: 600 }}>
            {actionMessage}
          </div>
        )}
      </div>

      {/* Next Upcoming Competition */}
      <div className="section-card">
        <div className="section-label">
          <span>Next Scheduled</span>
          {nextUpcomingEvent && (
            <span style={{ color: '#38bdf8', fontWeight: 600, letterSpacing: '0.02em' }}>
              {formatCountdown(nextUpcomingEvent.startAt)}
            </span>
          )}
        </div>

        {nextUpcomingEvent ? (
          <>
            <div className="card-title">{nextUpcomingEvent.name}</div>
            <div className="badge-row">
              <span className={`status-badge badge-${nextUpcomingEvent.status}`}>
                {nextUpcomingEvent.status.replace('_', ' ').toUpperCase()}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {nextUpcomingEvent.format.toUpperCase()}
              </span>
              {nextUpcomingEvent.teamMode && (
                <span style={{ fontSize: '11px', color: '#818cf8' }}>
                  {nextUpcomingEvent.teamMode === 'team'
                    ? `Team: ${nextUpcomingEvent.teamName || 'Configured'}`
                    : 'Solo'}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {nextUpcomingEvent.startAt ? new Date(nextUpcomingEvent.startAt).toLocaleString() : 'TBD'}
            </div>
          </>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: '12px', padding: '6px 0' }}>
            No competitions tracked yet.
          </div>
        )}
      </div>

      {/* Bottom Full Actions */}
      <button className="primary-btn" onClick={() => openDashboard()}>
        Open Management Dashboard
      </button>
    </div>
  );
};
