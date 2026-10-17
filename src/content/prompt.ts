import { CTFEvent, RegistrationStatus } from '../core/event-schema';

export interface PromptCallbacks {
  onSaveStatus: (status: RegistrationStatus) => void;
  onOpenDashboard: () => void;
  onDismiss: () => void;
}

/**
 * Creates and mounts a shadow-DOM isolated prompt overlay in the top-right corner.
 */
export function showPromptOverlay(
  eventCandidate: {
    name: string;
    startAt?: string;
    source: string;
  },
  existingEvent: CTFEvent | null,
  callbacks: PromptCallbacks
): () => void {
  // Avoid duplicate injection
  const existingContainer = document.getElementById('ctftracker-prompt-root');
  if (existingContainer) {
    existingContainer.remove();
  }

  const hostEl = document.createElement('div');
  hostEl.id = 'ctftracker-prompt-root';
  hostEl.style.all = 'initial';
  hostEl.style.position = 'fixed';
  hostEl.style.top = '16px';
  hostEl.style.right = '16px';
  hostEl.style.zIndex = '2147483647';
  hostEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const shadow = hostEl.attachShadow({ mode: 'open' });

  // Stylesheet
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .ctf-card {
      width: 320px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 16px;
      color: #f8fafc;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-size: 13px;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge-source {
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .badge-status {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .btn-dismiss {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 2px 6px;
      font-size: 16px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .btn-dismiss:hover {
      background: #1e293b;
      color: #f1f5f9;
    }

    .title {
      font-size: 14px;
      font-weight: 600;
      color: #f1f5f9;
      line-height: 1.4;
      word-break: break-word;
    }

    .meta {
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 4px;
    }

    .btn {
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s;
      border: 1px solid transparent;
      outline: none;
    }
    .btn:focus-visible {
      box-shadow: 0 0 0 2px #6366f1;
    }

    .btn-primary {
      background: #4f46e5;
      color: white;
    }
    .btn-primary:hover {
      background: #4338ca;
    }

    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
      border-color: #334155;
    }
    .btn-secondary:hover {
      background: #334155;
      color: white;
    }

    .sub-menu {
      display: none;
      flex-direction: column;
      gap: 6px;
      padding-top: 4px;
      border-top: 1px solid #1e293b;
    }
    .sub-menu.open {
      display: flex;
    }

    .sub-btn {
      padding: 6px 10px;
      border-radius: 6px;
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      cursor: pointer;
      font-size: 11px;
      text-align: left;
    }
    .sub-btn:hover {
      background: #334155;
      color: white;
    }
  `;

  // Content rendering
  const card = document.createElement('div');
  card.className = 'ctf-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'CTF Tracker Notification');

  const startFormatted = eventCandidate.startAt
    ? new Date(eventCandidate.startAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date TBD';

  if (!existingEvent) {
    // NEW EVENT PROMPT
    card.innerHTML = `
      <div class="header">
        <div class="badge-row">
          <span class="badge badge-source">${escapeHtml(eventCandidate.source)}</span>
        </div>
        <button class="btn-dismiss" title="Dismiss" aria-label="Dismiss">&times;</button>
      </div>
      <div class="title">${escapeHtml(eventCandidate.name)}</div>
      <div class="meta">
        <span>${escapeHtml(startFormatted)}</span>
      </div>
      <div style="font-size: 12px; color: #cbd5e1;">Track participation for this competition?</div>
      <div class="actions-grid">
        <button class="btn btn-primary" id="btn-registered">Registered</button>
        <button class="btn btn-secondary" id="btn-not-yet">Not yet &darr;</button>
      </div>
      <div class="sub-menu" id="sub-menu">
        <button class="sub-btn" id="btn-interested">Mark as Interested</button>
        <button class="sub-btn" id="btn-planned">Mark as Planned</button>
      </div>
    `;
  } else {
    // ALREADY SAVED EVENT
    const statusLabel = existingEvent.status.replace('_', ' ').toUpperCase();
    card.innerHTML = `
      <div class="header">
        <div class="badge-row">
          <span class="badge badge-source">${escapeHtml(eventCandidate.source)}</span>
          <span class="badge badge-status">${escapeHtml(statusLabel)}</span>
        </div>
        <button class="btn-dismiss" title="Dismiss" aria-label="Dismiss">&times;</button>
      </div>
      <div class="title">${escapeHtml(existingEvent.name)}</div>
      <div class="meta">
        <span>${escapeHtml(startFormatted)}</span>
      </div>
      <div class="actions-grid">
        <button class="btn btn-primary" id="btn-dashboard">Dashboard</button>
        <button class="btn btn-secondary" id="btn-change-status">Change Status &darr;</button>
      </div>
      <div class="sub-menu" id="sub-menu">
        <button class="sub-btn" data-status="registered">Registered</button>
        <button class="sub-btn" data-status="planned">Planned</button>
        <button class="sub-btn" data-status="interested">Interested</button>
        <button class="sub-btn" data-status="participated">Participated</button>
        <button class="sub-btn" data-status="not_participating">Not Participating</button>
      </div>
    `;
  }

  shadow.appendChild(style);
  shadow.appendChild(card);
  document.body.appendChild(hostEl);

  const close = () => {
    hostEl.remove();
    callbacks.onDismiss();
  };

  shadow.querySelector('.btn-dismiss')?.addEventListener('click', close);

  const subMenu = shadow.querySelector('#sub-menu') as HTMLElement | null;
  const btnNotYet = shadow.querySelector('#btn-not-yet');
  const btnChangeStatus = shadow.querySelector('#btn-change-status');

  const toggleSubMenu = () => {
    if (subMenu) {
      subMenu.classList.toggle('open');
    }
  };

  btnNotYet?.addEventListener('click', toggleSubMenu);
  btnChangeStatus?.addEventListener('click', toggleSubMenu);

  shadow.querySelector('#btn-registered')?.addEventListener('click', () => {
    callbacks.onSaveStatus('registered');
    hostEl.remove();
  });
  shadow.querySelector('#btn-interested')?.addEventListener('click', () => {
    callbacks.onSaveStatus('interested');
    hostEl.remove();
  });
  shadow.querySelector('#btn-planned')?.addEventListener('click', () => {
    callbacks.onSaveStatus('planned');
    hostEl.remove();
  });

  shadow.querySelector('#btn-dashboard')?.addEventListener('click', () => {
    callbacks.onOpenDashboard();
    hostEl.remove();
  });

  shadow.querySelectorAll('.sub-btn[data-status]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const status = (e.currentTarget as HTMLElement).getAttribute('data-status') as RegistrationStatus;
      if (status) {
        callbacks.onSaveStatus(status);
        hostEl.remove();
      }
    });
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    hostEl.remove();
  };
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
