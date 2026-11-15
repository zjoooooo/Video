#!/usr/bin/env node
// Renders a seek(t) film to MP4. Playwright steps time, ffmpeg blends sub-frames (tmix) and encodes.
//
//   node scripts/render.mjs films/x/film.src.html --out out/x.mp4 [--fps 60] [--sub 4] [--workers 6]
//   node scripts/render.mjs films/x/film.src.html --sheet [--from 0 --to 10 --step 0.5 --offset 0.45]
//   node scripts/render.mjs films/x/film.src.html --check     (exit 1 if a frame depends on an earlier one)
//   --gpu: WebGL on the GPU (Metal) instead of software GL, ~14x faster for films with a 3D layer. A page's first frame
//   can differ from later ones by a level or two in a few pixels, so run --check without it.
//
// film.src.html may contain __ASSET:relative/path__ tokens (replaced by the file's base64) and
// __TEXT:relative/path__ tokens (replaced by the file's text as a JS string literal); the
// self-contained result is written next to it as film.html.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { values: o, positionals: [src] } = parseArgs({ allowPositionals: true, options: {
  out: { type: 'string' }, fps: { type: 'string', default: '60' }, sub: { type: 'string', default: '4' },
  shutter: { type: 'string', default: '0.5' }, workers: { type: 'string', default: '6' },
  sheet: { type: 'boolean' }, check: { type: 'boolean' }, gpu: { type: 'boolean' },
  from: { type: 'string' }, to: { type: 'string' }, step: { type: 'string', default: '0.5' }, offset: { type: 'string', default: '0.45' },
} });
if (!src) { console.error('usage: render.mjs <film.src.html> [--out x.mp4 | --sheet | --check]'); process.exit(2); }

const dir = path.dirname(src);
const built = src.replace(/\.src\.html$/, '.html');
if (built !== src) fs.writeFileSync(built, fs.readFileSync(src, 'utf8')
  .replace(/__ASSET:(.+?)__/g, (_, p) => fs.readFileSync(path.join(dir, p)).toString('base64'))
  .replace(/__TEXT:(.+?)__/g, (_, p) => JSON.stringify(fs.readFileSync(path.join(dir, p), 'utf8'))));

const name = path.basename(dir);
const out = o.out || `out/${name}.mp4`;
fs.mkdirSync(path.dirname(out), { recursive: true });           // a fresh clone has no out/ yet
const mode = o.check ? 'check' : o.sheet ? 'sheet' : 'render';
const work = path.join(path.dirname(out), `${name}.${mode}.work`);   // one per mode: a check never deletes a render's frames
if (mode !== 'check') {
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
}

const browser = await chromium.launch({ args: ['--allow-file-access-from-files',   // films may draw footage frames from out/
  ...(o.gpu ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [])] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
async function open() {
  const page = await context.newPage();
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(pathToFileURL(path.resolve(built)).href);
  await page.waitForFunction('window.READY === true', null, { timeout: 15000 });
  return page;
}
const grab = async (page, t, quality = 0.95, tag = '', type = 'image/jpeg') => Buffer.from(await page.evaluate(async ([t, quality, tag, type]) => {
  await window.seek(t);
  const c = document.querySelector('canvas');
  if (tag) {                                          // QA label, contact sheets only
    const g = c.getContext('2d');
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    g.fillStyle = '#000'; g.fillRect(0, 1080 - 70, 260, 70);
    g.fillStyle = '#fff'; g.font = '600 48px Menlo, monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText(tag, 16, 1080 - 18); g.restore();
  }
  const url = c.toDataURL(type, quality);
  return url.slice(url.indexOf(',') + 1);
}, [t, quality, tag, type]), 'base64');
async function pool(jobs, n, fn) {
  let next = 0, done = 0;
  const pages = await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, open));
  await Promise.all(pages.map(async page => {
    while (next < jobs.length) {
      const j = next++;
      await fn(page, jobs[j], j);
      if (++done % Math.ceil(jobs.length / 20) === 0) console.log(`  ${done}/${jobs.length}`);
    }
  }));
}
const ffmpeg = args => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const write = (file, buf) => { fs.writeFileSync(file + '.tmp', buf); fs.renameSync(file + '.tmp', file); };

const first = await open();
const DURATION = await first.evaluate('window.DURATION');
const events = await first.evaluate('window.EVENTS || null');
if (events) fs.writeFileSync(path.join(path.dirname(out), `${name}.events.json`), JSON.stringify(events));
await first.close();
const FPS = +o.fps, S = +o.sub, from = +(o.from ?? 0), to = +(o.to ?? DURATION);

if (o.check) {
  // A frame must depend on t alone: render every time once in order on one page, then again
  // each on a fresh page, and compare lossless pixels. Times around each cut catch transitions.
  const cuts = (events?.cuts || []).map(c => (Array.isArray(c) ? c[0] : c));
  const times = [...new Set([
    ...Array.from({ length: 16 }, (_, i) => DURATION * (i + 0.37) / 16),
    ...cuts.flatMap(c => [c - 0.1, c + 0.1]),
  ].filter(t => t >= 0 && t < DURATION).map(t => +t.toFixed(3)))].sort((x, y) => x - y);
  const hash = async (page, t) => createHash('sha1').update(await grab(page, t, 1, '', 'image/png')).digest('hex');
  const page = await open();
  const a = []; for (const t of times) a.push(await hash(page, t));
  await page.close();
  const bad = [];
  for (const [i, t] of times.entries()) {
    const fresh = await open();
    if (await hash(fresh, t) !== a[i]) bad.push(t);
    await fresh.close();
  }
  console.log(bad.length ? `NOT deterministic at t = ${bad.join(', ')}` : `deterministic: ${times.length} frames identical in order and on fresh pages`);
  if (bad.length) process.exitCode = 1;
} else if (o.sheet) {
  const times = []; for (let t = from + +o.offset; t < to; t += +o.step) times.push(+t.toFixed(3));
  await pool(times, +o.workers, async (page, t, j) =>
    write(path.join(work, `f_${String(j).padStart(4, '0')}.jpg`), await grab(page, t, 0.9, t.toFixed(2))));
  const base = path.join(path.dirname(out), `${name}.sheet`);
  for (const f of fs.readdirSync(path.dirname(out))) if (f.startsWith(`${name}.sheet_`)) fs.rmSync(path.join(path.dirname(out), f));
  ffmpeg(['-framerate', '1', '-i', path.join(work, 'f_%04d.jpg'), '-vf', 'scale=640:360,tile=3x3:padding=4:color=black', '-q:v', '3', `${base}_%02d.jpg`]);
  console.log(`${times.length} frames -> ${base}_NN.jpg`);
} else {
  const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS);          // [from, to), endpoint excluded
  const jobs = [];
  for (let i = n0; i < n1; i++) for (let k = 0; k < S; k++) jobs.push((i + (k / S) * +o.shutter) / FPS);   // shutter leads the frame
  console.log(`${n1 - n0} frames x ${S} sub-frames at ${FPS} fps`);
  const t0 = Date.now();
  await pool(jobs, +o.workers, async (page, t, j) => write(path.join(work, `s_${String(j).padStart(6, '0')}.jpg`), await grab(page, t)));
  console.log(`captured in ${((Date.now() - t0) / 1000).toFixed(0)} s, encoding`);
  ffmpeg(['-framerate', String(FPS * S), '-i', path.join(work, 's_%06d.jpg'),
    '-vf', `tmix=frames=${S}:weights='${Array(S).fill(1).join(' ')}',select='eq(mod(n\\,${S})\\,${S - 1})',setpts=N/${FPS}/TB,` +
           'scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p,' +
           'setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv',
    '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out]);
  console.log(`wrote ${out}`);
}
await browser.close();
if (mode !== 'check') fs.rmSync(work, { recursive: true, force: true });
