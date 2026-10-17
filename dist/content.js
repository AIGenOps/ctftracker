(function(){function e(e){if(!e||typeof e!=`string`)return;let t=e.trim();if(t)try{let e=new URL(t);return e.protocol!==`http:`&&e.protocol!==`https:`?void 0:e.pathname===`/`&&!e.search&&!e.hash?`${e.protocol}//${e.host}`:e.toString()}catch{return}}function t(e){if(!e)return;if(e instanceof Date)return isNaN(e.getTime())?void 0:e.toISOString();let t=e.trim();if(!t)return;let n=new Date(t);if(!isNaN(n.getTime()))return n.toISOString();let r=t.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*/i,``).replace(/([A-Za-z]{3})\./g,`$1`),i=new Date(r);if(!isNaN(i.getTime()))return i.toISOString()}function n(e){try{let t=new URL(e);if(!t.hostname.includes(`ctftime.org`)&&!t.hostname.includes(`localhost`)&&!t.hostname.includes(`127.0.0.1`))return null;let n=t.pathname.match(/\/event\/(\d+)/);return n?n[1]:null}catch{return null}}function r(r,i){let a=[],o=[],s=n(i)||void 0;s||o.push(`Could not extract CTFtime event ID from URL.`);let c,l=r.querySelector(`.page-header h2`)||r.querySelector(`h2`);if(l&&l.textContent)c=l.textContent.trim();else{let e=r.querySelector(`meta[property="og:title"]`)?.getAttribute(`content`);if(e)c=e.trim();else{let e=r.querySelector(`title`)?.textContent;e&&(c=e.replace(/^CTFtime\.org\s*\/\s*/i,``).trim())}}c||a.push(`name`);let u=e(r.querySelector(`link[rel="canonical"]`)?.getAttribute(`href`))||(s?`https://ctftime.org/event/${s}/`:void 0),d,f,p=null,m=r.querySelector(`a[href$=".ics"]`);if(m&&m.parentElement&&(p=m.parentElement.textContent||null),!p){let e=r.querySelectorAll(`p`);for(let t=0;t<e.length;t++){let n=e[t].textContent||``;if((n.includes(`—`)||n.includes(`&mdash;`)||n.includes(` - `))&&n.includes(`UTC`)){p=n;break}}}if(p){let e=p.replace(/&mdash;/g,`—`).replace(/&nbsp;/g,` `).trim().split(/—|–/);if(e.length>=2){let n=e[0].trim(),r=e[1].trim(),i=r.match(/\b(20\d\d)\b/),a=n;i&&!n.match(/\b(20\d\d)\b/)&&(a=n.replace(/,\s*(\d\d:\d\d)/,` ${i[1]}, $1`)),d=t(a),f=t(r)}}d||a.push(`startAt`),f||a.push(`endAt`);let h=`unknown`,g=r.querySelectorAll(`b`);for(let e=0;e<g.length;e++){let t=g[e].textContent?.trim().toLowerCase()||``;if(t===`on-site`||t===`onsite`){h=`onsite`;break}if(t===`on-line`||t===`online`){h=`online`;break}if(t===`hybrid`){h=`hybrid`;break}}let _,v=r.querySelectorAll(`a[href^="http"]`);for(let t=0;t<v.length;t++){let n=v[t];if((n.parentElement?.textContent||``).toLowerCase().includes(`official url`)){let t=n.getAttribute(`href`);if(t&&!t.includes(`ctftime.org`)){_=e(t);break}}}let y,b=(r.body?.textContent||``).match(/Rating weight:\s*([\d\.]+)/i);if(b){let e=parseFloat(b[1]);isNaN(e)||(y=e)}return{source:`ctftime`,sourceEventId:s,canonicalUrl:u,name:c,startAt:d,endAt:f,timezone:`UTC`,websiteUrl:_,format:h,weight:y,missingFields:a,warnings:o}}function i(e,t){try{if(new URL(t).hostname.endsWith(`.ctfd.io`))return!0;let n=!!e.querySelector(`meta[name="generator"][content*="CTFd"]`),r=!!e.querySelector(`a[href="/challenges"], a[href="/scoreboard"], a[href="/teams"]`),i=!!e.querySelector(`.navbar-brand, .navbar-title`);return!!(n||r&&i)}catch{return!1}}function a(t,n){let r=[],i=e(n),a,o=t.querySelector(`.navbar-brand, .navbar-title, h1`);o&&o.textContent&&(a=o.textContent.trim()),!a&&t.title&&(a=t.title.replace(/\s*[-|]\s*CTFd.*$/i,``).trim()),a||r.push(`name`);let s,c=t.querySelector(`a[href*="/register"]`);if(c){let t=c.getAttribute(`href`);if(t)try{s=e(new URL(t,n).toString())}catch{}}return{source:`external`,canonicalUrl:i,name:a,websiteUrl:i,registrationUrl:s,format:`online`,missingFields:[`startAt`,`endAt`,...r],warnings:[`Detected as external CTF platform; verify event start and end dates.`]}}function o(e,t,n){let r=document.getElementById(`ctftracker-prompt-root`);r&&r.remove();let i=document.createElement(`div`);i.id=`ctftracker-prompt-root`,i.style.all=`initial`,i.style.position=`fixed`,i.style.top=`16px`,i.style.right=`16px`,i.style.zIndex=`2147483647`,i.style.fontFamily=`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;let a=i.attachShadow({mode:`open`}),o=document.createElement(`style`);o.textContent=`
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
  `;let c=document.createElement(`div`);c.className=`ctf-card`,c.setAttribute(`role`,`dialog`),c.setAttribute(`aria-label`,`CTF Tracker Notification`);let l=e.startAt?new Date(e.startAt).toLocaleString(void 0,{month:`short`,day:`numeric`,hour:`2-digit`,minute:`2-digit`}):`Date TBD`;if(!t)c.innerHTML=`
      <div class="header">
        <div class="badge-row">
          <span class="badge badge-source">${s(e.source)}</span>
        </div>
        <button class="btn-dismiss" title="Dismiss" aria-label="Dismiss">&times;</button>
      </div>
      <div class="title">${s(e.name)}</div>
      <div class="meta">
        <span>${s(l)}</span>
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
    `;else{let n=t.status.replace(`_`,` `).toUpperCase();c.innerHTML=`
      <div class="header">
        <div class="badge-row">
          <span class="badge badge-source">${s(e.source)}</span>
          <span class="badge badge-status">${s(n)}</span>
        </div>
        <button class="btn-dismiss" title="Dismiss" aria-label="Dismiss">&times;</button>
      </div>
      <div class="title">${s(t.name)}</div>
      <div class="meta">
        <span>${s(l)}</span>
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
    `}a.appendChild(o),a.appendChild(c),document.body.appendChild(i);let u=()=>{i.remove(),n.onDismiss()};a.querySelector(`.btn-dismiss`)?.addEventListener(`click`,u);let d=a.querySelector(`#sub-menu`),f=a.querySelector(`#btn-not-yet`),p=a.querySelector(`#btn-change-status`),m=()=>{d&&d.classList.toggle(`open`)};f?.addEventListener(`click`,m),p?.addEventListener(`click`,m),a.querySelector(`#btn-registered`)?.addEventListener(`click`,()=>{n.onSaveStatus(`registered`),i.remove()}),a.querySelector(`#btn-interested`)?.addEventListener(`click`,()=>{n.onSaveStatus(`interested`),i.remove()}),a.querySelector(`#btn-planned`)?.addEventListener(`click`,()=>{n.onSaveStatus(`planned`),i.remove()}),a.querySelector(`#btn-dashboard`)?.addEventListener(`click`,()=>{n.onOpenDashboard(),i.remove()}),a.querySelectorAll(`.sub-btn[data-status]`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.currentTarget.getAttribute(`data-status`);t&&(n.onSaveStatus(t),i.remove())})});let h=e=>{e.key===`Escape`&&u()};return window.addEventListener(`keydown`,h),()=>{window.removeEventListener(`keydown`,h),i.remove()}}function s(e){let t=document.createElement(`div`);return t.textContent=e,t.innerHTML}async function c(){let e=window.location.href,t=null;if(n(e)?t=r(document,e):i(document,e)&&(t=a(document,e)),t&&t.name)try{if(typeof chrome>`u`||!chrome.runtime?.sendMessage)return;let e=await chrome.runtime.sendMessage({type:`DETECT_EVENT`,candidate:t});if(!e||!e.shouldPrompt)return;let n=`ctftracker_dismissed_${t.sourceEventId||t.canonicalUrl||t.name}`;if(sessionStorage.getItem(n))return;o({name:t.name,startAt:t.startAt,source:t.source===`ctftime`?`CTFtime`:`External CTF`},e.existingEvent||null,{onSaveStatus:async e=>{await chrome.runtime.sendMessage({type:`PROMPT_SAVE_EVENT`,candidate:t,status:e})},onOpenDashboard:()=>{chrome.runtime.sendMessage({type:`OPEN_DASHBOARD`,eventId:e.existingEvent?.id})},onDismiss:()=>{sessionStorage.setItem(n,`true`)}})}catch(e){console.debug(`CTF Tracker detector message skipped:`,e)}}typeof chrome<`u`&&chrome.runtime?.onMessage?.addListener&&chrome.runtime.onMessage.addListener((e,t,o)=>{if(e.type===`GET_PAGE_EVENT_INFO`){let e=window.location.href,t=n(e),s=null;return s=t?r(document,e):i(document,e)?a(document,e):{source:`manual`,name:document.title,canonicalUrl:e,websiteUrl:e,missingFields:[`startAt`,`endAt`],warnings:[`Manually captured web page.`]},o({parsed:s}),!0}}),document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,c):c()})();