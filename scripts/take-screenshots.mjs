import puppeteer from 'puppeteer-core';
import { resolve } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import http from 'http';

const rootDir = process.cwd();
const distDir = resolve(rootDir, 'dist');
const screenshotsDir = resolve(rootDir, 'screenshots');

if (!existsSync(screenshotsDir)) {
  mkdirSync(screenshotsDir, { recursive: true });
}

// Serve dist directory and fixtures locally
const server = http.createServer((req, res) => {
  const urlPath = req.url?.split('?')[0] || '/';

  if (urlPath === '/' || urlPath === '/dashboard.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(resolve(distDir, 'dashboard.html')));
    return;
  }
  if (urlPath === '/popup.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(resolve(distDir, 'popup.html')));
    return;
  }
  if (urlPath === '/event/3409') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(resolve(rootDir, 'fixtures/ctftime/event_3409.html')));
    return;
  }

  // Assets
  if (urlPath.startsWith('/assets/')) {
    const assetPath = resolve(distDir, urlPath.slice(1));
    if (existsSync(assetPath)) {
      const type = assetPath.endsWith('.css')
        ? 'text/css'
        : assetPath.endsWith('.js')
        ? 'application/javascript'
        : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(readFileSync(assetPath));
      return;
    }
  }

  if (urlPath === '/content.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(readFileSync(resolve(distDir, 'content.js')));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = 4567;
server.listen(PORT, async () => {
  console.log(`Preview server listening at http://localhost:${PORT}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });

    // Pre-seed sample competitions
    await page.goto(`http://localhost:${PORT}/dashboard.html`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const now = new Date();
      const liveStart = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
      const liveEnd = new Date(now.getTime() + 46 * 3600 * 1000).toISOString();

      const upcomingStart = new Date(now.getTime() + 5 * 86400 * 1000).toISOString();
      const upcomingEnd = new Date(now.getTime() + 7 * 86400 * 1000).toISOString();

      const sampleEvents = [
        {
          id: 'defcon_ctf_2026',
          name: 'DEF CON CTF Qualifier 2026',
          status: 'registered',
          lifecycle: 'live',
          format: 'online',
          source: 'ctftime',
          sourceEventId: '3409',
          websiteUrl: 'https://defcon.org',
          startAt: liveStart,
          endAt: liveEnd,
          teamMode: 'team',
          teamName: 'PwnMasters',
          weight: 98.5,
          notes: 'Focus on binary exploitation and hypervisor escape challenges.',
          reminderPreferences: {
            sevenDays: true,
            twentyFourHours: true,
            oneHour: true,
            fifteenMinutes: true,
            deadline: true,
            eventEnd: true,
            deadlineLeadMinutes: 1440,
            endLeadMinutes: 15,
          },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          dismissedPrompt: false,
          verifiedFields: ['name', 'startAt'],
        },
        {
          id: 'hitcon_2026',
          name: 'HITCON CTF 2026',
          status: 'planned',
          lifecycle: 'upcoming',
          format: 'online',
          source: 'ctftime',
          sourceEventId: '3340',
          websiteUrl: 'https://hitcon.org',
          startAt: upcomingStart,
          endAt: upcomingEnd,
          registrationDeadlineAt: new Date(now.getTime() + 3 * 86400 * 1000).toISOString(),
          teamMode: 'team',
          teamName: 'PwnMasters',
          weight: 91.16,
          notes: 'Team roster finalized on Discord channel.',
          reminderPreferences: {
            sevenDays: true,
            twentyFourHours: true,
            oneHour: true,
            fifteenMinutes: true,
            deadline: true,
            eventEnd: true,
            deadlineLeadMinutes: 1440,
            endLeadMinutes: 15,
          },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          dismissedPrompt: false,
          verifiedFields: ['name', 'startAt'],
        },
        {
          id: 'sas_finals_2026',
          name: 'SAS CTF 2026 Finals',
          status: 'interested',
          lifecycle: 'upcoming',
          format: 'onsite',
          source: 'ctftime',
          sourceEventId: '3409',
          websiteUrl: 'https://ctf.thesascon.com',
          startAt: new Date(now.getTime() + 14 * 86400 * 1000).toISOString(),
          endAt: new Date(now.getTime() + 15 * 86400 * 1000).toISOString(),
          teamMode: 'solo',
          weight: 49.5,
          notes: 'Bali On-site Attack-Defense Finals.',
          reminderPreferences: {
            sevenDays: true,
            twentyFourHours: true,
            oneHour: true,
            fifteenMinutes: true,
            deadline: true,
            eventEnd: true,
            deadlineLeadMinutes: 1440,
            endLeadMinutes: 15,
          },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          dismissedPrompt: false,
          verifiedFields: ['name'],
        },
      ];

      localStorage.setItem('ctf_tracker_events', JSON.stringify(sampleEvents));
      window.location.reload();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    // 1. Dashboard screenshot
    const dashboardFile = resolve(screenshotsDir, 'dashboard.png');
    await page.screenshot({ path: dashboardFile });
    console.log(`Saved: ${dashboardFile}`);

    // 2. Open Add / Edit Modal on Dashboard and capture
    await page.evaluate(() => {
      const btn = document.querySelector('.top-bar button.btn-primary');
      btn?.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const modalFile = resolve(screenshotsDir, 'competition_modal.png');
    await page.screenshot({ path: modalFile });
    console.log(`Saved: ${modalFile}`);

    // 3. Popup screenshot
    const popupPage = await browser.newPage();
    await popupPage.setViewport({ width: 380, height: 490, deviceScaleFactor: 2 });
    await popupPage.goto(`http://localhost:${PORT}/popup.html`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    const popupFile = resolve(screenshotsDir, 'popup.png');
    await popupPage.screenshot({ path: popupFile });
    console.log(`Saved: ${popupFile}`);

    // 4. CTFtime Page with Injected Prompt Overlay
    const eventPage = await browser.newPage();
    await eventPage.setViewport({ width: 1366, height: 850, deviceScaleFactor: 2 });
    await eventPage.evaluateOnNewDocument(() => {
      window.chrome = {
        runtime: {
          sendMessage: (msg) => {
            if (msg.type === 'DETECT_EVENT') {
              return Promise.resolve({
                shouldPrompt: true,
                existingEvent: null,
              });
            }
            return Promise.resolve({ success: true });
          },
        },
      };
    });
    await eventPage.goto(`http://localhost:${PORT}/event/3409`, { waitUntil: 'networkidle0' });
    const contentJs = readFileSync(resolve(distDir, 'content.js'), 'utf-8');
    await eventPage.evaluate((code) => {
      const script = document.createElement('script');
      script.textContent = code;
      document.body.appendChild(script);
    }, contentJs);
    await new Promise((r) => setTimeout(r, 600));
    const overlayFile = resolve(screenshotsDir, 'prompt_overlay.png');
    await eventPage.screenshot({ path: overlayFile });
    console.log(`Saved: ${overlayFile}`);

    console.log('All screenshots captured successfully.');
  } catch (err) {
    console.error('Screenshot error:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
