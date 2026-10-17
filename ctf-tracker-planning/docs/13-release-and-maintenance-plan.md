# 13. Release and Maintenance Plan

## 13.1 Distribution options

Initial delivery should be an unpacked Chromium extension build for local testing. Store publication can be considered after validation.

Potential distribution paths:
- Unpacked extension for developer/testing use.
- Chrome Web Store submission.
- Browser-specific distribution where supported and appropriate.

No publication target is selected yet.

## 13.2 Versioning

Use semantic versioning:
- Major: incompatible data model or behavior changes.
- Minor: backward-compatible functionality.
- Patch: fixes and small improvements.

The manifest version, release notes, and exported schema version are separate concerns and should be managed explicitly.

## 13.3 Release artifacts

A release should contain:
- Source repository.
- Built extension folder or ZIP suitable for the selected distribution method.
- README and installation instructions.
- Changelog.
- Permission and privacy explanation.
- Test report and known limitations.
- License, once selected.

## 13.4 Maintenance

- Monitor CTFtime page structure changes through parser fixtures and regression tests.
- Update supported external-site rules deliberately.
- Re-test alarm behavior after relevant Chromium API changes.
- Maintain schema migrations for stored events and backups.
- Document any change that broadens host permissions.
- Keep the extension useful offline.
- Avoid introducing a backend unless a future requirement explicitly justifies it.

## 13.5 Troubleshooting topics for README

- Extension does not detect a CTFtime event.
- Event fields are missing or incorrect.
- Notification permission is blocked.
- Reminders did not appear while browser/device was asleep.
- Event was added twice or appears to be a duplicate.
- Import reports conflicts or invalid fields.
- Local records disappeared after storage clearing or uninstall.
- External site is not supported.
