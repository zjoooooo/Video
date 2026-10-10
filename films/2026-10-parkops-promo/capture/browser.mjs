#!/usr/bin/env node
// A visible Chromium on the ParkOps dashboard for taking product shots. A person signs in to it
// once (the password is never in a file or a script); run.mjs then drives it over CDP.
//
//   node films/2026-10-parkops-promo/capture/browser.mjs <profile-dir> [url]
//
// Keep the profile outside the repo: it holds the session cookie.
import { chromium } from 'playwright';

const [profile, url = 'https://10.3.13.76/dashboard'] = process.argv.slice(2);
if (!profile) { console.error('usage: browser.mjs <profile-dir> [url]'); process.exit(2); }
const ctx = await chromium.launchPersistentContext(profile, {
  headless: false, ignoreHTTPSErrors: true,                 // the server's certificate is from a private CA
  viewport: { width: 1440, height: 860 }, deviceScaleFactor: 2, colorScheme: 'dark',
  args: ['--remote-debugging-port=9333'],
});
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto(url);
console.log('ready on CDP port 9333; sign in in the window');
ctx.on('close', () => process.exit(0));
