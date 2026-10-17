# 7. Security, Privacy, and Permissions

## 7.1 Privacy principles

- Local-first: records remain in extension storage.
- No mandatory account or remote backend.
- No analytics/telemetry in v1.
- No reading or storing passwords, cookies, tokens, or authentication secrets.
- No automated registration, flag submission, or team joining.
- Only collect fields needed to track events.
- Provide export and clear explanation of local data-loss risks.

## 7.2 Permission principles

Candidate permissions:
- `storage`: persistent event records and settings.
- `alarms`: reminders.
- `notifications`: browser notifications.
- `tabs`: only if required for active tab metadata or navigation.
- Host permissions: CTFtime and explicitly supported external sites.

Validate actual permission needs during implementation. Avoid universal host access when a user-gesture-based active-tab flow can satisfy manual capture.

## 7.3 Threat model

### Malicious or malformed website content
Risk: page content may contain hostile strings, deceptive URLs, or malformed metadata.
Mitigations:
- Treat all content as text.
- Use safe DOM rendering; do not inject arbitrary HTML.
- Validate URL protocols and hosts.
- Do not interpret page content as instructions.
- Avoid evaluating page-provided code.

### Malformed import file
Risk: invalid data corrupts records or injects unsafe URLs.
Mitigations:
- Validate schema and size limits.
- Reject unknown or invalid enumerated values.
- Preview import results.
- Apply merge only after validation and user confirmation.
- Never execute imported data.

### Data loss
Risk: storage clearing, profile deletion, extension uninstall, or browser policy removes local data.
Mitigations:
- Clearly explain that local storage is not a backup.
- Offer JSON export.
- Validate restore flow.
- Avoid promising survival after uninstall or data clearing.

### Overbroad permissions
Risk: unnecessary access to browsing activity.
Mitigations:
- Use the smallest practical host permission set.
- Keep external detection limited to documented supported domains.
- Explain permissions in the README and settings.

### False registration status
Risk: user visits a registration page and extension marks them registered.
Mitigation:
- Registration state is user-confirmed in v1.
- Page visits and button presence are not proof.
- Any future verification integration requires separate source-specific design.

## 7.4 Data handling
- Store only event metadata and user notes.
- Do not include private notes in notifications by default.
- Do not transmit page content.
- Validate messages between content scripts and the service worker.
- Restrict message operations to an explicit allowlist.
- Never allow a content script to request arbitrary storage paths or execute arbitrary actions.

## 7.5 Release security checklist
- [ ] No secrets or credentials in source.
- [ ] No remote code.
- [ ] No unsafe dynamic HTML injection.
- [ ] Imported JSON is validated.
- [ ] URLs use approved schemes.
- [ ] Permissions match documented functionality.
- [ ] No unnecessary network requests.
- [ ] Content-script messages are validated.
- [ ] Build output contains only required assets.
- [ ] Privacy and data-loss notes are present.
