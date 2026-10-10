// The film's product shots, taken from the live dashboard with the signed-in session.
//
//   node films/2026-10-parkops-promo/capture/run.mjs films/2026-10-parkops-promo/capture/shots.mjs [name ...]
//
// Read-only apart from what the dashboard audits by itself: a camera view and a view-only remote
// screen. Nothing here sends a command, marks a notification read, or saves a setting.
const BASE = 'https://10.3.13.76';
const J71 = 'b02387d0-0ed6-49b7-97e7-7650fe2ec516';          // the station map: five entry lanes, six exit lanes
const CONTENT = { x: 330, y: 0, width: 1260, height: 830 };   // the station page's centred column
const label = s => `[aria-label="${s}"]`;
async function settle(page, ms = 120000) {                   // the rail's card has said neither "Connecting…" nor "loading the picture" for 6 s
  for (let quiet = 0, t0 = Date.now(); quiet < 6; await page.waitForTimeout(1000)) {
    if (Date.now() - t0 > ms) throw new Error('the picture never settled');
    quiet = /Connecting|loading the picture/.test(await page.locator('#station').innerText()) ? 0 : quiet + 1;
  }
}

const SHOTS = {
  async bell({ page, shot }) {
    await page.goto(`${BASE}/dashboard`); await page.waitForTimeout(3000);
    await page.click('#po-bell'); await page.waitForTimeout(1500);
    await shot('bell');
  },
  async map({ page, shot }) {
    await page.goto(`${BASE}/dashboard?station=${J71}`); await page.waitForTimeout(4000);
    await shot('map', { clip: CONTENT });
  },
  async opc({ page, shot }) {
    await page.goto(`${BASE}/dashboard?station=${J71}`); await page.waitForTimeout(3500);
    await page.click(label('Show the OPC: PC health, processes and services')); await page.waitForTimeout(3000);
    await shot('opc', { clip: CONTENT });
  },
  async camera({ page, shot }) {
    await page.goto(`${BASE}/dashboard?station=${J71}`); await page.waitForTimeout(3500);
    await page.click(label('Show the live picture of J71 ENTRY1 Camera')); await settle(page);
    await shot('camera', { clip: CONTENT });
  },
  async vnc({ page, shot }) {
    await page.goto(`${BASE}/dashboard?station=${J71}`); await page.waitForTimeout(3500);
    await page.click(label('Show the screen of J71X1 Station')); await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Connect', exact: true }).click(); await settle(page);
    await shot('vnc', { clip: CONTENT });
    await page.getByRole('button', { name: 'Disconnect' }).click().catch(() => {});
  },
  async tools({ page, shot }) {
    await page.goto(`${BASE}/dashboard?station=${J71}`); await page.waitForTimeout(3500);
    await page.click(label('Tools')); await page.waitForTimeout(1500);
    await shot('tools');
    await page.keyboard.press('Escape');
  },
  async activity({ page, shot }) {
    await page.goto(`${BASE}/dashboard?station=${J71}&tab=activity`); await page.waitForTimeout(3500);
    await shot('activity', { clip: CONTENT });
  },
  async galaxy({ page, shot }) {
    await page.goto(`${BASE}/galaxy`); await page.waitForTimeout(9000);
    await page.evaluate(() => document.querySelectorAll('input').forEach(i => { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); i.blur(); }));   // the browser autofills the search box with the username
    await page.waitForTimeout(1500);
    await shot('galaxy', { quality: 92 });
  },
  async carpark({ page, shot }) {
    await page.goto(`${BASE}/carpark?station=${J71}`); await page.waitForTimeout(7000);
    await shot('carpark', { quality: 92 });
  },
  async reports({ page, shot }) {
    await page.goto(`${BASE}/dashboard?admin=reports&tab=audit`); await page.waitForTimeout(4000);
    await shot('audit');
  },
  async signin({ page, shot }) {                              // a fresh, signed-out context shows the sign-in card
    const ctx = await page.context().browser().newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/dashboard`); await p.waitForTimeout(3000);
    await shot('signin', { page: p });
    await ctx.close();
  },
};

export default async ctx => {
  const want = process.argv.slice(3);
  for (const [name, fn] of Object.entries(SHOTS)) {
    if (want.length && !want.includes(name)) continue;
    try { await fn(ctx); } catch (e) { console.error(`${name}: ${e.message.split('\n')[0]}`); process.exitCode = 1; }
  }
};
