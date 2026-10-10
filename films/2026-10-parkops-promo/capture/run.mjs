#!/usr/bin/env node
// Runs one action file against the browser that browser.mjs opened.
//
//   node films/2026-10-parkops-promo/capture/run.mjs <actions.mjs>
//
// The file's default export gets { page, shot, api } and drives the dashboard:
//   await page.goto(...); await page.click(...);
//   await shot('station-map', { clip: { x, y, width, height } })   // -> assets/shots/station-map.jpg
//   await api('/api/admin/status')                                 // JSON with the signed-in session
// Every shot first blurs IPv4 addresses on the page, so none reaches the film.
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, '..', 'assets', 'shots');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const page = browser.contexts()[0].pages().find(p => p.url().startsWith('https://')) || browser.contexts()[0].pages()[0];

async function blurIPs(pg) {
  await pg.evaluate(() => {
    const IP = /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/g;
    const blur = root => {
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const hits = [];
      for (let n; (n = walk.nextNode());) if (IP.test(n.nodeValue) && !n.parentElement.closest('.ip-blur')) hits.push(n), IP.lastIndex = 0;
      for (const n of hits) {
        const s = document.createElement('span');
        s.innerHTML = n.nodeValue.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
          .replace(IP, m => `<span class="ip-blur" style="filter:blur(7px)">${m}</span>`);
        n.replaceWith(s);
      }
      document.querySelectorAll('input').forEach(i => { if (IP.test(i.value)) i.style.filter = 'blur(7px)'; IP.lastIndex = 0; });
    };
    blur(document.body);
  });
}

async function shot(name, opts = {}) {
  const pg = opts.page || page;
  await blurIPs(pg);
  await pg.waitForTimeout(opts.wait ?? 300);
  const file = path.join(SHOTS, `${name}.jpg`);
  await pg.screenshot({ path: file, type: 'jpeg', quality: opts.quality ?? 88, clip: opts.clip, fullPage: false, animations: 'allow' });
  console.log(`shot ${file}`);
  return file;
}

async function api(p) {                     // a fetch from inside the page: its cookie, its origin, no certificate fuss
  const r = await page.evaluate(async p => { const r = await fetch(p, { credentials: 'same-origin' }); return { ok: r.ok, status: r.status, body: await r.text() }; }, p);
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
  return JSON.parse(r.body);
}

// 1920 x 1080 CSS px at twice the pixels, so the film can push in on a shot and stay sharp
// (setViewportSize over CDP would drop the window's device scale factor to 1)
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 2, mobile: false });
const mod = await import(pathToFileURL(path.resolve(process.argv[2])).href);
fs.mkdirSync(SHOTS, { recursive: true });
try { await mod.default({ page, shot, api }); }
finally { process.exit(process.exitCode ?? 0); }   // leave without browser.close(): the window and its session stay
