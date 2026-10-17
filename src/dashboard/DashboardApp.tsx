import React, { useEffect, useState, useMemo } from 'react';
import {
  CTFEvent,
  EventFormat,
  EventLifecycle,
  GlobalSettings,
  RegistrationStatus,
  ReminderPreferences,
  TeamMode,
  DEFAULT_SETTINGS,
  DEFAULT_REMINDER_PREFERENCES,
} from '../core/event-schema';
import { normalizeUrl, sanitizeText } from '../core/event-normalizer';
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
    case 'GET_EVENT':
      return { event: await eventRepository.getEventById(msg.id) };
    case 'GET_SETTINGS':
      return { settings: await eventRepository.getSettings() };
    case 'CREATE_EVENT':
    case 'SAVE_EVENT':
      return { success: true, event: await eventRepository.saveEvent(msg.event) };
    case 'UPDATE_EVENT':
      return { success: true, event: await eventRepository.updateEvent(msg.id, msg.updates) };
    case 'DELETE_EVENT':
      return { success: await eventRepository.deleteEvent(msg.id) };
    case 'SET_EVENT_STATUS':
      return { success: true, event: await eventRepository.setEventStatus(msg.id, msg.status) };
    case 'UPDATE_SETTINGS':
      return { settings: await eventRepository.updateSettings(msg.updates) };
    case 'EXPORT_DATA':
      return { data: await eventRepository.exportData() };
    case 'IMPORT_PREVIEW':
      return eventRepository.previewImport(msg.rawJson);
    case 'IMPORT_APPLY':
      return eventRepository.applyImport(msg.rawJson, msg.mode, msg.resolutions);
    default:
      return null;
  }
}

type NavTab = 'upcoming' | 'live' | 'ended' | 'not_participating' | 'all' | 'settings_backup';

export const DashboardApp: React.FC = () => {
  const [events, setEvents] = useState<CTFEvent[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<NavTab>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('start_asc');

  // Modal states
  const [editingEvent, setEditingEvent] = useState<Partial<CTFEvent> | null>(null);
  const [isNewEvent, setIsNewEvent] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Import / Export states
  const [importPreview, setImportPreview] = useState<any>(null);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, 'keep_existing' | 'use_imported'>>({});
  const [importStatusMessage, setImportStatusMessage] = useState<string>('');

  useEffect(() => {
    loadAll();
    const urlParams = new URLSearchParams(window.location.search);
    const targetEventId = urlParams.get('eventId');
    if (targetEventId) {
      sendAppMessage({ type: 'GET_EVENT', id: targetEventId }).then((res) => {
        if (res?.event) {
          setEditingEvent(res.event);
          setIsNewEvent(false);
        }
      });
    }
  }, []);

  const loadAll = async () => {
    try {
      const [eventsRes, settingsRes] = await Promise.all([
        sendAppMessage({ type: 'GET_EVENTS' }),
        sendAppMessage({ type: 'GET_SETTINGS' }),
      ]);
      if (eventsRes?.events) setEvents(eventsRes.events);
      if (settingsRes?.settings) setSettings(settingsRes.settings);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (activeTab === 'upcoming' && (ev.lifecycle !== 'upcoming' || ev.status === 'not_participating')) return false;
      if (activeTab === 'live' && (ev.lifecycle !== 'live' || ev.status === 'not_participating')) return false;
      if (activeTab === 'ended' && ev.lifecycle !== 'ended') return false;
      if (activeTab === 'not_participating' && ev.status !== 'not_participating') return false;

      if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
      if (formatFilter !== 'all' && ev.format !== formatFilter) return false;
      if (modeFilter !== 'all' && ev.teamMode !== modeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = ev.name.toLowerCase().includes(q);
        const inNotes = (ev.notes || '').toLowerCase().includes(q);
        const inTeam = (ev.teamName || '').toLowerCase().includes(q);
        if (!inName && !inNotes && !inTeam) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'start_asc') {
        const tA = a.startAt ? new Date(a.startAt).getTime() : Infinity;
        const tB = b.startAt ? new Date(b.startAt).getTime() : Infinity;
        return tA - tB;
      }
      if (sortBy === 'start_desc') {
        const tA = a.startAt ? new Date(a.startAt).getTime() : -Infinity;
        const tB = b.startAt ? new Date(b.startAt).getTime() : -Infinity;
        return tB - tA;
      }
      if (sortBy === 'deadline_asc') {
        const dA = a.registrationDeadlineAt ? new Date(a.registrationDeadlineAt).getTime() : Infinity;
        const dB = b.registrationDeadlineAt ? new Date(b.registrationDeadlineAt).getTime() : Infinity;
        return dA - dB;
      }
      if (sortBy === 'recently_added') {
        const cA = new Date(a.createdAt).getTime();
        const cB = new Date(b.createdAt).getTime();
        return cB - cA;
      }
      return 0;
    });
  }, [events, activeTab, statusFilter, formatFilter, modeFilter, searchQuery, sortBy]);

  const counts = useMemo(() => {
    return {
      upcoming: events.filter(e => e.lifecycle === 'upcoming' && e.status !== 'not_participating').length,
      live: events.filter(e => e.lifecycle === 'live' && e.status !== 'not_participating').length,
      ended: events.filter(e => e.lifecycle === 'ended').length,
      not_participating: events.filter(e => e.status === 'not_participating').length,
      all: events.length,
    };
  }, [events]);

  const handleOpenAddModal = () => {
    setIsNewEvent(true);
    setFormErrors([]);
    setEditingEvent({
      name: '',
      status: 'interested',
      lifecycle: 'upcoming',
      format: 'online',
      teamMode: 'solo',
      source: 'manual',
      reminderPreferences: { ...settings.defaultReminderPreferences },
    });
  };

  const handleSaveModal = async () => {
    if (!editingEvent || !editingEvent.name?.trim()) {
      setFormErrors(['Competition name is required.']);
      return;
    }

    const errors: string[] = [];
    if (editingEvent.websiteUrl && !normalizeUrl(editingEvent.websiteUrl)) {
      errors.push('Official website URL must be a valid HTTP/HTTPS link.');
    }
    if (editingEvent.registrationUrl && !normalizeUrl(editingEvent.registrationUrl)) {
      errors.push('Registration URL must be a valid HTTP/HTTPS link.');
    }
    if (editingEvent.startAt && editingEvent.endAt) {
      if (new Date(editingEvent.startAt).getTime() > new Date(editingEvent.endAt).getTime()) {
        errors.push('Event start time cannot be after event end time.');
      }
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const msgType = isNewEvent ? 'CREATE_EVENT' : 'UPDATE_EVENT';
      const payload = isNewEvent
        ? { event: editingEvent }
        : { id: editingEvent.id, updates: editingEvent };

      const res = await sendAppMessage({ type: msgType, ...payload });
      if (res?.success) {
        setEditingEvent(null);
        await loadAll();
      } else if (res?.error) {
        setFormErrors([res.error]);
      }
    } catch (e: any) {
      setFormErrors([e?.message || 'Failed to save event']);
    }
  };

  const handleDeleteEvent = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from your CTF tracker?`)) {
      await sendAppMessage({ type: 'DELETE_EVENT', id });
      await loadAll();
    }
  };

  const handleStatusChangeQuick = async (id: string, status: RegistrationStatus) => {
    await sendAppMessage({ type: 'SET_EVENT_STATUS', id, status });
    await loadAll();
  };

  const handleExport = async () => {
    const res = await sendAppMessage({ type: 'EXPORT_DATA' });
    if (res?.data) {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ctf-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const preview = await sendAppMessage({
          type: 'IMPORT_PREVIEW',
          rawJson: parsed,
        });

        if (!preview.valid) {
          setImportStatusMessage(`Import validation failed: ${preview.errors?.join(', ')}`);
        } else {
          setImportPreview({ rawJson: parsed, ...preview });
          const defResolutions: Record<string, 'keep_existing' | 'use_imported'> = {};
          preview.analysis?.conflictingEvents?.forEach((c: any) => {
            defResolutions[c.existing.id] = 'use_imported';
          });
          setConflictResolutions(defResolutions);
        }
      } catch (err: any) {
        setImportStatusMessage(`Invalid JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyImport = async (mode: 'merge' | 'replace') => {
    if (!importPreview?.rawJson) return;

    const res = await sendAppMessage({
      type: 'IMPORT_APPLY',
      rawJson: importPreview.rawJson,
      mode,
      resolutions: conflictResolutions,
    });

    if (res?.success) {
      setImportStatusMessage(`Successfully imported ${res.importedCount} competitions.`);
      setImportPreview(null);
      await loadAll();
    } else {
      setImportStatusMessage(`Failed to apply import: ${res?.errors?.join(', ')}`);
    }
  };

  const handleTestNotification = () => {
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      chrome.notifications.create(`test_${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'CTF Tracker Alert System',
        message: 'Desktop notification channel is operational. Countdown reminders will trigger as configured.',
        priority: 2,
      });
    }
  };

  const formatDisplayTime = (iso?: string) => {
    if (!iso) return 'Date TBD';
    const d = new Date(iso);
    if (settings.timezoneDisplay === 'utc') {
      return d.toUTCString();
    }
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <div>
            <div className="brand-title">CTF Tracker</div>
            <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Competition Manager</div>
          </div>
        </div>

        <nav className="nav-group">
          <button
            className={`nav-item ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <span>Upcoming</span>
            <span className="count-badge">{counts.upcoming}</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            <span>Live Competitions</span>
            <span className="count-badge">{counts.live}</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'ended' ? 'active' : ''}`}
            onClick={() => setActiveTab('ended')}
          >
            <span>Concluded</span>
            <span className="count-badge">{counts.ended}</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'not_participating' ? 'active' : ''}`}
            onClick={() => setActiveTab('not_participating')}
          >
            <span>Not Participating</span>
            <span className="count-badge">{counts.not_participating}</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>All Records</span>
            <span className="count-badge">{counts.all}</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'settings_backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings_backup')}
          >
            <span>Settings & Backup</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Bar */}
        <div className="top-bar">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search competitions, notes, team name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              + Add Competition
            </button>
          </div>
        </div>

        {/* Filters bar */}
        {activeTab !== 'settings_backup' && (
          <div className="filter-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="registered">Registered</option>
                <option value="planned">Planned</option>
                <option value="interested">Interested</option>
                <option value="participated">Participated</option>
                <option value="not_participating">Not Participating</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Format:</span>
              <select
                className="filter-select"
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
              >
                <option value="all">All Formats</option>
                <option value="online">Online</option>
                <option value="onsite">On-site</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mode:</span>
              <select
                className="filter-select"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
              >
                <option value="all">All Modes</option>
                <option value="solo">Solo</option>
                <option value="team">Team</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sort by:</span>
              <select
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="start_asc">Start Date (Earliest)</option>
                <option value="start_desc">Start Date (Latest)</option>
                <option value="deadline_asc">Registration Deadline</option>
                <option value="recently_added">Recently Added</option>
              </select>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="content-body">
          {activeTab === 'settings_backup' ? (
            /* Settings & Backup Tab */
            <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="event-card">
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Backup and Data Portability</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  All CTF records and schedule preferences reside locally within browser storage. Generate periodic
                  JSON archives to safeguard your schedules.
                </p>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button className="btn btn-primary" onClick={handleExport}>
                    Export Archive (JSON)
                  </button>

                  <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                    Import Archive (JSON)
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {importStatusMessage && (
                  <div style={{ fontSize: '13px', color: '#38bdf8', marginTop: '8px' }}>
                    {importStatusMessage}
                  </div>
                )}
              </div>

              {/* Preferences */}
              <div className="event-card">
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>System Preferences</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={settings.automaticPromptsEnabled}
                      onChange={async (e) => {
                        const updated = await sendAppMessage({
                          type: 'UPDATE_SETTINGS',
                          updates: { automaticPromptsEnabled: e.target.checked },
                        });
                        if (updated?.settings) setSettings(updated.settings);
                      }}
                    />
                    <span>Prompt automatically on newly detected competition pages</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={settings.externalDetectionEnabled}
                      onChange={async (e) => {
                        const updated = await sendAppMessage({
                          type: 'UPDATE_SETTINGS',
                          updates: { externalDetectionEnabled: e.target.checked },
                        });
                        if (updated?.settings) setSettings(updated.settings);
                      }}
                    />
                    <span>Enable detection on external supported platforms (e.g. CTFd)</span>
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Timezone Display:</span>
                    <select
                      className="filter-select"
                      value={settings.timezoneDisplay}
                      onChange={async (e) => {
                        const updated = await sendAppMessage({
                          type: 'UPDATE_SETTINGS',
                          updates: { timezoneDisplay: e.target.value as 'local' | 'utc' },
                        });
                        if (updated?.settings) setSettings(updated.settings);
                      }}
                    >
                      <option value="local">Local Timezone</option>
                      <option value="utc">UTC</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notification Test */}
              <div className="event-card">
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Notification Test</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Validate desktop notification permissions and operating system alert integration.
                </p>
                <div style={{ marginTop: '8px' }}>
                  <button className="btn btn-secondary" onClick={handleTestNotification}>
                    Send Test Notification
                  </button>
                </div>
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            /* Empty State */
            <div className="empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-subtle)' }}>
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <div className="empty-title">No competitions found</div>
              <div>
                {searchQuery
                  ? 'No records match your query parameters.'
                  : 'Track a CTF competition from ctftime.org or add one manually.'}
              </div>
              <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ marginTop: '12px' }}>
                + Add Competition
              </button>
            </div>
          ) : (
            /* Event Grid */
            <div className="event-grid">
              {filteredEvents.map((ev) => {
                const isLive = ev.lifecycle === 'live';
                return (
                  <div key={ev.id} className="event-card">
                    <div className="card-top">
                      <div>
                        <div className="badge-row" style={{ marginBottom: '6px' }}>
                          <span className={`badge badge-${ev.status}`}>
                            {ev.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {isLive && (
                            <span className="badge badge-lifecycle-live">LIVE</span>
                          )}
                          <span className="badge" style={{ background: '#1e293b', color: '#94a3b8' }}>
                            {ev.format.toUpperCase()}
                          </span>
                          {ev.weight !== undefined && (
                            <span className="badge" style={{ background: '#1e293b', color: '#38bdf8' }}>
                              Weight: {ev.weight}
                            </span>
                          )}
                        </div>
                        <h4 className="card-event-name">{ev.name}</h4>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="card-details-grid">
                      <div>
                        <span style={{ color: 'var(--text-subtle)' }}>Start: </span>
                        <span>{formatDisplayTime(ev.startAt)}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-subtle)' }}>End: </span>
                        <span>{formatDisplayTime(ev.endAt)}</span>
                      </div>
                      {ev.registrationDeadlineAt && (
                        <div>
                          <span style={{ color: 'var(--text-subtle)' }}>Deadline: </span>
                          <span style={{ color: '#fbbf24' }}>
                            {formatDisplayTime(ev.registrationDeadlineAt)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span style={{ color: 'var(--text-subtle)' }}>Mode: </span>
                        <span>{ev.teamMode === 'team' ? `Team (${ev.teamName || 'Yes'})` : 'Solo'}</span>
                      </div>
                    </div>

                    {ev.notes && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          background: 'var(--bg-primary)',
                          padding: '8px 10px',
                          borderRadius: '6px',
                        }}
                      >
                        {ev.notes}
                      </div>
                    )}

                    {/* Official URLs */}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                      {ev.websiteUrl && (
                        <a
                          href={ev.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#38bdf8', textDecoration: 'none' }}
                        >
                          Official Site &rarr;
                        </a>
                      )}
                      {ev.ctftimeUrl && (
                        <a
                          href={ev.ctftimeUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#818cf8', textDecoration: 'none' }}
                        >
                          CTFtime &rarr;
                        </a>
                      )}
                      {ev.registrationUrl && (
                        <a
                          href={ev.registrationUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#34d399', textDecoration: 'none' }}
                        >
                          Registration &rarr;
                        </a>
                      )}
                    </div>

                    {/* Actions bar */}
                    <div className="card-actions">
                      <select
                        className="filter-select"
                        value={ev.status}
                        onChange={(e) =>
                          handleStatusChangeQuick(ev.id, e.target.value as RegistrationStatus)
                        }
                      >
                        <option value="interested">Interested</option>
                        <option value="planned">Planned</option>
                        <option value="registered">Registered</option>
                        <option value="participated">Participated</option>
                        <option value="not_participating">Not Participating</option>
                      </select>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => {
                            setIsNewEvent(false);
                            setFormErrors([]);
                            setEditingEvent({ ...ev });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => handleDeleteEvent(ev.id, ev.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Edit / Add Modal */}
      {editingEvent && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
                {isNewEvent ? 'Track New CTF Competition' : `Edit "${editingEvent.name}"`}
              </h3>
              <button
                className="btn-icon"
                onClick={() => setEditingEvent(null)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              {formErrors.length > 0 && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '6px', color: '#f87171', fontSize: '12px' }}>
                  {formErrors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Competition Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. DEF CON CTF Qualifier"
                  value={editingEvent.name || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={editingEvent.status || 'interested'}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        status: e.target.value as RegistrationStatus,
                      })
                    }
                  >
                    <option value="interested">Interested</option>
                    <option value="planned">Planned</option>
                    <option value="registered">Registered</option>
                    <option value="participated">Participated</option>
                    <option value="not_participating">Not Participating</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Format</label>
                  <select
                    className="form-select"
                    value={editingEvent.format || 'online'}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        format: e.target.value as EventFormat,
                      })
                    }
                  >
                    <option value="online">Online</option>
                    <option value="onsite">On-site</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={
                      editingEvent.startAt
                        ? new Date(editingEvent.startAt).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        startAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={
                      editingEvent.endAt
                        ? new Date(editingEvent.endAt).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        endAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Registration Deadline (Optional)</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={
                      editingEvent.registrationDeadlineAt
                        ? new Date(editingEvent.registrationDeadlineAt).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        registrationDeadlineAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mode & Team Name</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className="form-select"
                      style={{ width: '100px' }}
                      value={editingEvent.teamMode || 'solo'}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          teamMode: e.target.value as TeamMode,
                        })
                      }
                    >
                      <option value="solo">Solo</option>
                      <option value="team">Team</option>
                    </select>
                    {editingEvent.teamMode === 'team' && (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Team Name"
                        value={editingEvent.teamName || ''}
                        onChange={(e) =>
                          setEditingEvent({ ...editingEvent, teamName: e.target.value })
                        }
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Official Website URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={editingEvent.websiteUrl || ''}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, websiteUrl: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Registration URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={editingEvent.registrationUrl || ''}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, registrationUrl: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Rating Weight</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 25.50"
                    value={editingEvent.weight !== undefined ? editingEvent.weight : ''}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        weight: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CTFtime URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://ctftime.org/event/..."
                    value={editingEvent.ctftimeUrl || ''}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, ctftimeUrl: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes & Strategies</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Notes, Discord link, target categories..."
                  value={editingEvent.notes || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, notes: e.target.value })}
                />
              </div>

              {/* Reminders section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                  Reminder Preferences
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={editingEvent.reminderPreferences?.sevenDays ?? true}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          reminderPreferences: {
                            ...DEFAULT_REMINDER_PREFERENCES,
                            ...editingEvent.reminderPreferences,
                            sevenDays: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>7 days before start</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={editingEvent.reminderPreferences?.twentyFourHours ?? true}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          reminderPreferences: {
                            ...DEFAULT_REMINDER_PREFERENCES,
                            ...editingEvent.reminderPreferences,
                            twentyFourHours: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>24 hours before start</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={editingEvent.reminderPreferences?.oneHour ?? true}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          reminderPreferences: {
                            ...DEFAULT_REMINDER_PREFERENCES,
                            ...editingEvent.reminderPreferences,
                            oneHour: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>1 hour before start</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={editingEvent.reminderPreferences?.fifteenMinutes ?? true}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          reminderPreferences: {
                            ...DEFAULT_REMINDER_PREFERENCES,
                            ...editingEvent.reminderPreferences,
                            fifteenMinutes: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>15 minutes before start</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={editingEvent.reminderPreferences?.deadline ?? true}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          reminderPreferences: {
                            ...DEFAULT_REMINDER_PREFERENCES,
                            ...editingEvent.reminderPreferences,
                            deadline: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>Registration deadline alert</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={editingEvent.reminderPreferences?.eventEnd ?? true}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          reminderPreferences: {
                            ...DEFAULT_REMINDER_PREFERENCES,
                            ...editingEvent.reminderPreferences,
                            eventEnd: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>15 minutes before end</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingEvent(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveModal}>
                {isNewEvent ? 'Create Competition' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal for Imports */}
      {importPreview && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Import Preview & Conflict Resolution</h3>
              <button
                className="btn-icon"
                onClick={() => setImportPreview(null)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', flex: 1 }}>
                  <div style={{ color: '#34d399', fontWeight: 600 }}>
                    {importPreview.analysis?.newEvents?.length || 0}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>New Records</div>
                </div>

                <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', flex: 1 }}>
                  <div style={{ color: '#38bdf8', fontWeight: 600 }}>
                    {importPreview.analysis?.identicalEvents?.length || 0}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>Identical Records</div>
                </div>

                <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', flex: 1 }}>
                  <div style={{ color: '#fbbf24', fontWeight: 600 }}>
                    {importPreview.analysis?.conflictingEvents?.length || 0}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>Conflicting Records</div>
                </div>
              </div>

              {importPreview.analysis?.conflictingEvents?.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                    Review Conflicting Competitions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                    {importPreview.analysis.conflictingEvents.map((conflict: any, idx: number) => {
                      const id = conflict.existing.id;
                      const choice = conflictResolutions[id] || 'use_imported';
                      return (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>
                              {conflict.existing.name}
                            </div>
                            <select
                              className="filter-select"
                              value={choice}
                              onChange={(e) =>
                                setConflictResolutions({
                                  ...conflictResolutions,
                                  [id]: e.target.value as any,
                                })
                              }
                            >
                              <option value="use_imported">Use Imported Data</option>
                              <option value="keep_existing">Keep Existing Record</option>
                            </select>
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {conflict.differingFields.map((df: any, fIdx: number) => (
                              <div key={fIdx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '8px', padding: '2px 0' }}>
                                <span style={{ color: '#818cf8' }}>{df.field}:</span>
                                <span style={{ color: '#f87171' }}>Current: {String(df.existingValue || 'none')}</span>
                                <span style={{ color: '#34d399' }}>Import: {String(df.incomingValue || 'none')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setImportPreview(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleApplyImport('replace')}>
                Replace All Existing
              </button>
              <button className="btn btn-primary" onClick={() => handleApplyImport('merge')}>
                Apply Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
