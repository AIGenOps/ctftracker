# CTF Tracker

A simple, private browser extension for Google Chrome, Brave, and Edge that helps you discover, organize, and track cybersecurity Capture The Flag (CTF) competitions so you never miss a match.

---

## What is CTF Tracker?

CTF Tracker runs quietly in your browser. Whenever you visit competition pages like CTFtime or other CTF websites, it notices the event and lets you save it to your schedule with a single click.

You can set reminders, track whether you are playing alone or with a team, and manage your entire competition calendar from a clean, distraction-free dashboard.

---

## What Does It Do?

- **One-Click Calendar Sync (New in v2.0):** Add any competition directly to Google Calendar or Outlook with one click, or download a `.ics` calendar file for Apple Calendar. All times and official links are pre-filled automatically.
- **Notices Competitions Automatically:** When you open an event page on CTFtime or a supported competition site, a small box appears in the top corner asking if you want to track it.
- **Sends Helpful Reminders:** Get timely desktop alerts before events start (1 week, 24 hours, 1 hour, or 15 minutes before) and before registration closes, so you are always ready.
- **Easy Dashboard:** View everything you have planned, see which competitions are live right now, and check past events.
- **Search and Filter:** Quickly find competitions by name, format (online or in-person), team name, or date.
- **Safe and 100% Private:** All your data stays on your computer. There are no accounts to create, no passwords to enter, and no tracking or third-party servers.
- **Backup and Restore:** Save your competition list as a file anytime to keep a backup or transfer it to another computer.

---

## Quick Setup Guide

### Option 1: Install Pre-Built Package (Recommended)

1. Download the latest package:
   - [Download `ctftracker-v2.0.0.zip`](https://github.com/AIGenOps/ctftracker/releases/download/v2.0.0/ctftracker-v2.0.0.zip)
2. Extract (unzip) the downloaded zip file into a folder on your computer.
3. Open your browser and go to the extensions manager:
   - **Google Chrome:** `chrome://extensions`
   - **Brave:** `brave://extensions`
   - **Microsoft Edge:** `edge://extensions`
4. Turn on **Developer mode** using the switch in the top-right corner.
5. Click the **Load unpacked** button in the top-left corner.
6. Select the folder you extracted in Step 2.
7. Click the puzzle icon on your browser toolbar and pin **CTF Tracker** for easy access.

### Option 2: Build from Source

If you are a developer and want to build the project yourself:

```bash
git clone https://github.com/AIGenOps/ctftracker.git
cd ctftracker
npm install
npm run build
```

Then load the `dist` folder via `chrome://extensions` following the steps above.

---

## How to Use It

1. **Browse as Normal:** Visit any event page on [CTFtime](https://ctftime.org).
2. **Save an Event:** When the prompt appears in the corner, choose your status:
   - **Registered:** You have already signed up and are playing.
   - **Planned:** You are planning to play.
   - **Interested:** You want to keep an eye on it.
3. **Open the Dashboard:** Click the CTF Tracker icon on your toolbar and click **Dashboard** to see your schedule, edit notes, change reminders, or add events manually.

---

## Testing

For developers who want to verify the codebase:

```bash
npm test
```

All 28 tests check date parsing, storage safety, reminders, and data backups.
