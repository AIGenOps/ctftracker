# 10. Decisions and Remaining Validation

## 10.1 Finalized product decisions

| Topic | Final decision |
|---|---|
| Browser | Chromium-based browsers |
| Extension platform | Manifest V3 |
| Storage | `chrome.storage.local` |
| Cloud | No account/backend/sync in v1 |
| Interfaces | Popup plus full dashboard |
| Discovery | CTFtime, supported external sites, manual capture |
| Prompt | Top-right overlay |
| Dismissal | If dismissed without saving, ask again on the next visit |
| Saved event | Show saved status on future visits, not the initial question |
| Registration statuses | Interested, Planned, Registered, Participated, Not Participating |
| Participation | Solo and team |
| Reminders | 7d, 24h, 1h, 15m before start; 24h before deadline; 15m before end |
| Deadline lead | 24 hours default, configurable |
| End lead | 15 minutes default, configurable |
| Time display | Local timezone |
| Backup | JSON export |
| Restore | Merge by default; preview conflicts |
| Lifecycle | Cancellation/postponement separate from participation status |
| Visual style | Minimal dark interface |
| Registration verification | User-confirmed; page visit is not proof |
| Implementation | Not authorized by planning request; wait for explicit approval |

## 10.2 Remaining implementation-time validations

These do not block the product specification, but must be resolved during implementation.

### A. Current CTFtime markup
Inspect current event pages and listings before selecting parser rules. Build fixtures and tests from observed structures.

### B. External-site coverage
Define an initial list of supported sites or detection signatures. Do not promise universal detection.

### C. Browser versions
Set minimum versions for Chrome, Brave, and Edge after verifying required APIs and their behavior.

### D. Permission details
Confirm whether each workflow can use narrow host permissions and active-tab access. Avoid broad permanent access unless necessary.

### E. Timezone parsing
Determine which timestamp formats CTFtime actually exposes. Ambiguous values must be flagged rather than guessed.

### F. Reminder reconciliation
Verify current Chromium alarm behavior, service-worker startup patterns, and notification permission handling against supported versions.

### G. Import conflict UX
Implement a clear preview showing matched records, new records, and conflicting fields before applying the merge.

### H. Repository/release details
Repository name, hosting destination, license, icon assets, and packaging/distribution method are not specified. These should be chosen before publication, not assumed.

## 10.3 No further product decision is required to start technical discovery

The architecture and core behavior are defined. Once implementation is explicitly authorized, the first phase can validate the current CTFtime page structure and Chromium compatibility, then begin the repository and test foundation.
