#!/usr/bin/env node
// Captures Galaxy Explorer footage frame by frame. The product's video mode runs on a fixed-step
// clock, so requestAnimationFrame is swapped for a manual stepper: one step = one 1/60 s frame.
//
//   node films/2026-10-galaxy-look-up/capture.mjs [shot ...] [--verify]
//
// Writes out/galaxy-look-up/shots/<shot>/NNNNN.jpg (3840x2160, so the film can push in without loss;
// the ui shot is a 1920x1080 page screenshot) and meta.json. --verify captures each
// shot twice on fresh pages and exits 1 if any frame differs. The product repo gets its video hooks
// (galaxy-pro-video/video-patch.sh) only while this runs.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PRO = '/Users/justin/Project/galaxy-pro-video';            // local-only promo tooling (never pushed)
const APP = '/Users/justin/Project/galaxy-explorer';
const { GPU_LAUNCH_ARGS, buildVideoUrl, waitForDirector, installRecordingInitScript } = await import(`${PRO}/src/browser.mjs`);
const { startServer } = await import(`${PRO}/src/server.mjs`);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'out/galaxy-look-up/shots');
const FPS = 60;
// the director clamps a preset's elapsed time to that camera's duration in its timeline
const CAM_MS = Object.fromEntries(JSON.parse(fs.readFileSync(`${PRO}/config/timeline.json`, 'utf8')).shots.map(s => [s.camera, s.endMs - s.startMs]));
const HIDE = '#lang,#title,#skyback,#solarback,#solarlabels,#solarstrip,#solartime,#solarscale,#msg,#scalecmp,#scalecmp-close,#beacon-panel,#audio,#audiolist,#audiobtn,#beacons,#skylabels,#return-mw,#galaxystrip,.gx-video-cursor';

function stepper() {                                   // runs in the page before any app script
  const native = window.requestAnimationFrame.bind(window);
  let q = new Map(), id = 0;
  window.__manual = false;
  window.requestAnimationFrame = cb => {
    const k = ++id; q.set(k, cb);
    if (!window.__manual) native(ts => { if (!window.__manual && q.has(k)) { q.delete(k); cb(ts); } });
    return k;
  };
  window.cancelAnimationFrame = k => q.delete(k);
  window.__step = () => { const run = [...q.values()]; q = new Map(); const ts = performance.now(); run.forEach(cb => cb(ts)); };
  window.__ptr = (type, x, y) => {                     // synthetic mouse pointer: real ones only arrive with native frames
    const target = type === 'down' ? document.getElementById('cv') : document;
    target.dispatchEvent(new PointerEvent(`pointer${type}`, { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'up' ? 0 : 1, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  };
  window.__anim = ms => document.getAnimations().forEach(a => { a.pause(); a.currentTime = ms; });   // CSS animations onto the frame clock
  window.__frame = () => {                             // render one frame and read the 3840x2160 backing before it is presented
    window.__step();
    const u = document.getElementById('cv').toDataURL('image/jpeg', 0.93); return u.slice(u.indexOf(',') + 1);
  };
}

// camera preset P at fraction f of its move
const cam = (page, P, f) => page.evaluate(([P, ms]) => GalaxyVideoDirector.applyCameraPreset(P, ms), [P, Math.min(1, Math.max(0, f)) * CAM_MS[P]]);

// Shot recipes. prepare: director prepare key (warm: one to load first, for its textures).
// run(c): c.rec(n, perFrame?) records n frames, awaiting perFrame(i) before each; c.step(n) advances
// without recording; c.until(fn) steps until fn() is true in the page.
const smooth = x => (x = Math.min(1, Math.max(0, x)), x * x * (3 - 2 * x));
const slerp = (a, b, t) => {
  const d = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)), th = Math.acos(d);
  if (th < 1e-4) return b;
  const s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return { x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb, z: a.z * wa + b.z * wb };
};
// a real mouse drag over `frames` frames (OrbitControls turns the camera), released at the end
const ptr = (c, type, x, y) => c.page.evaluate(([type, x, y]) => window.__ptr(type, x, y), [type, x, y]);
// the product's own wheel zoom, dispatched directly (Playwright's wheel also waits for native frames)
const wheel = (c, deltaY) => c.page.evaluate(d => document.getElementById('cv').dispatchEvent(new WheelEvent('wheel', { deltaY: d, clientX: 960, clientY: 540, bubbles: true, cancelable: true })), deltaY);
async function drag(c, dx, dy, frames) {
  await ptr(c, 'down', 960, 540);
  for (let i = 1; i <= frames; i++) { await ptr(c, 'move', 960 + dx * i / frames, 540 + dy * i / frames); await c.step(); }
  await ptr(c, 'up', 960 + dx, 540 + dy);
}
// fly the solar camera to a body (or the comet) with the product's own fly-to, optionally turn
// around it with a drag (to find the terminator), then ride along while a slow drag orbits it (parallax)
const ride = (id, frames, { turn, angle = -0.35, drift = 0.6, dolly = 0 } = {}) => ({   // dolly: a wheel notch out every n frames
  prepare: 'solar-overview',
  run: async c => {
    await c.page.evaluate(([id, angle]) => {
      if (id === 'halley') { solarComets[0].angle = angle; selectSolarComet(0); flySolarToComet(0); }
      else { selectSolarBody(id); flySolarTo(id); }
    }, [id, angle]);
    await c.until(() => window.solarFly === null);
    if (turn) await drag(c, turn[0], turn[1], 40);
    await c.step(60);                                  // let the arrival (and the drag's damping) settle
    await ptr(c, 'down', 960, 540);
    await c.rec(frames, async i => {
      await ptr(c, 'move', 960 + i * drift, 540);
      if (dolly && i % dolly === 0) await wheel(c, 100);
    });
    await ptr(c, 'up', 960 + frames * drift, 540);
  },
});
// a galaxy beacon's own "fly to this galaxy", then a slow real drag around it while recording
const visit = (label, frames, zoom = 0, turn = null, dxPerFrame = 0.5) => ({
  prepare: 'galaxy-overview',
  run: async c => {
    await c.page.evaluate(label => [...document.querySelectorAll('#beacons .beacon')].find(b => b.textContent.includes(label)).click(), label);
    await c.step(20);
    await c.page.evaluate(() => document.querySelector('#bp-flyto').click());
    await c.until(() => getComputedStyle(document.getElementById('return-mw')).display !== 'none');
    await c.page.evaluate(() => window.closeBeaconExtras());   // like closing the card: no selection ring left behind
    for (let i = 0; i < zoom; i++) { await wheel(c, -100); await c.step(2); }
    if (turn) await drag(c, turn[0], turn[1], 40);
    await c.step(60);
    await ptr(c, 'down', 700, 540);
    await c.rec(frames, i => ptr(c, 'move', 700 + i * dxPerFrame, 540));
    await ptr(c, 'up', 700 + frames * dxPerFrame, 540);
  },
});
const preset = (prepare, P, frames) => ({ prepare, run: c => c.rec(frames, i => cam(c.page, P, i / (frames - 1))) });

export const SHOTS = {
  probe: { prepare: 'galaxy-overview', run: c => c.rec(30, i => cam(c.page, 'galaxy-slow-rotation', i / 600)) },
  sun: { prepare: 'sun-close-view', run: c => c.rec(660, i => cam(c.page, 'sun-surface-orbit', i / 659)) },
  // Leo, then Scorpius, then Sagittarius toward the galactic centre; each gold figure appears on arrival
  sky: {
    prepare: 'sky-overview',
    run: async c => {
      const [leo, sco, sgr] = await c.page.evaluate(() => [4, 7, 8].map(i => window.skyConDir(i)));
      const legs = [[0, 200, leo, leo, 4], [200, 320, leo, sco, -1], [320, 520, sco, sco, 7], [520, 640, sco, sgr, -1], [640, 960, sgr, sgr, 8]];
      await c.rec(960, async i => {
        const [a, b, from, to, sel] = legs.find(([a, b]) => i >= a && i < b);
        const v = slerp(from, to, smooth((i - a) / (b - a)));
        await c.page.evaluate(([v, sel, first]) => { window.skyLook(v.x, v.y, v.z); if (first && sel >= 0) window.selectSky(sel); }, [v, sel, i === a + 30]);
      });
    },
  },
  earth: ride('earth', 300, { turn: [260, 0], drift: 0.7 }), moon: ride('moon', 300, { turn: [300, -40], drift: -0.6 }),
  sunwide: ride('sun', 300, { drift: 0.4, dolly: 7 }),   // pulling away from the Sun until the inner orbits show
  jupiter: ride('jupiter', 300, { drift: -0.8 }), saturn: ride('saturn', 300, { drift: 0.7 }), halley: ride('halley', 300, { angle: -0.2, drift: -0.5 }),
  // the real wormhole from the galaxy into the Solar System (the film plays it backwards)
  wormhole: {
    warm: 'solar-overview', prepare: 'galaxy-solar-beacon',
    run: async c => {
      await c.page.evaluate(() => document.querySelectorAll('#beacons .beacon')[0].click());
      await c.step(20);
      await c.page.evaluate(() => document.querySelector('#bp-solar-link').click());
      await c.rec(440);
    },
  },
  rise: preset('galaxy-low-angle', 'fixed-wide-galaxy', 660),
  lmc: visit('Large Magellanic', 480, 6),
  cena: visit('Centaurus A', 720, 12, [220, -120]),          // turned until the dust lane crosses the halo
  m87: visit('M87', 480, 8),
  // the product as people see it: UI on, and a real drag that turns the galaxy
  ui: {
    ui: true, prepare: 'galaxy-overview',
    run: c => c.rec(1300, async i => {
      if (i <= 480) await cam(c.page, 'galaxy-slow-rotation', i / 999);   // drift; from the press on, the drag turns it
      if (i === 480) await ptr(c, 'down', 760, 560);
      if (i > 480 && i <= 600) await ptr(c, 'move', 760 + (i - 480) * 6, 560 + (i - 480) * 0.35);   // a wide, quick swing that tips it face-on
      if (i === 601) await ptr(c, 'up', 1480, 602);
    }),
  },
};

async function capture(url, name, dir) {   // a fresh browser per shot: reusing one changes the pixels
  const browser = await chromium.launch({ args: [...GPU_LAUNCH_ARGS, '--mute-audio'] });
  try { return await shoot(browser, url, name, dir); } finally { await browser.close(); }
}

async function shoot(browser, url, name, dir) {
  const shot = SHOTS[name]; if (!shot) throw new Error(`unknown shot ${name}`);
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await installRecordingInitScript(ctx, { language: shot.lang || 'en' });
  await ctx.addInitScript(stepper);
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.goto(url, { waitUntil: 'load' });
  await waitForDirector(page);
  if (!shot.ui) await page.addStyleTag({ content: `${HIDE}{opacity:0!important;pointer-events:none!important}` });
  if (shot.warm) await page.evaluate(k => GalaxyVideoDirector.resetForShot(k, 0), shot.warm);
  await page.evaluate(async k => { await GalaxyVideoDirector.resetForShot(k, 0); window.__manual = true; }, shot.prepare);   // same task: no native frame slips in
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const hashes = []; let n = 0;
  const c = {
    page,
    step: async (k = 1) => { for (let i = 0; i < k; i++) await page.evaluate(() => window.__step()); },
    until: async (fn, max = 900) => { let k = 0; while (k < max && !(await page.evaluate(fn))) { await page.evaluate(() => window.__step()); k++; } return k; },
    rec: async (k, perFrame) => {
      for (let i = 0; i < k; i++) {
        if (perFrame) await perFrame(i);
        let buf;
        if (shot.ui) { await page.evaluate(n => { window.__step(); window.__anim(n * 1000 / 60); }, n); buf = await page.screenshot({ type: 'jpeg', quality: 93 }); }
        else buf = Buffer.from(await page.evaluate(() => window.__frame()), 'base64');
        fs.writeFileSync(path.join(dir, `${String(n++).padStart(5, '0')}.jpg`), buf);
        hashes.push(createHash('md5').update(buf).digest('hex'));
      }
    },
  };
  await shot.run(c);
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ frames: n, fps: FPS }));
  return hashes;
}

const args = process.argv.slice(2), verify = args.includes('--verify');
const names = args.filter(a => !a.startsWith('--'));
const patch = on => execFileSync(`${PRO}/video-patch.sh`, [on ? 'on' : 'off'], { stdio: 'inherit' });
patch(true);
const server = await startServer({ root: APP });
try {
  const url = buildVideoUrl(server.url, { fps: FPS, width: 1920, height: 1080 });
  for (const name of names.length ? names : Object.keys(SHOTS).filter(k => k !== 'probe')) {
    const t0 = Date.now();
    const a = await capture(url, name, path.join(OUT, name));
    console.log(`${name}: ${a.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    if (verify) {
      const b = await capture(url, name, path.join(OUT, `${name}.verify`));
      const bad = a.findIndex((h, i) => h !== b[i]);
      const ok = bad < 0 && a.length === b.length;
      console.log(ok ? `${name}: deterministic` : `${name}: NOT deterministic from frame ${bad}`);
      if (!ok) process.exitCode = 1;
      fs.rmSync(path.join(OUT, `${name}.verify`), { recursive: true, force: true });
    }
  }
} finally {
  await server.close(); patch(false);
}
