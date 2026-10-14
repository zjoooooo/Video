# Galaxy Explorer《Look Up》Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 92-second horizontal promo film of Galaxy Explorer, made from real footage of the product captured frame by frame, with English coral narration, burned-in Chinese subtitles and an organ-and-piano score.

**Architecture:**
- **Capture:** `capture.mjs` temporarily patches galaxy-explorer's video hooks. It replaces `requestAnimationFrame` with a manual stepper, drives each shot through `GalaxyVideoDirector` and the app's own window hooks, and writes one 1080p JPEG per frame into `out/galaxy-look-up/shots/<shot>/`.
- **Composite:** `film.src.html` follows the usual `seek(t)` contract. For each `t` it draws the right footage frame, then the letterbox, type, subtitles and the twist.
- **Sound:** narration, plan, score and mix go through the shared `scripts/narrated.py`.

**Tech Stack:** Playwright Chromium on the Metal GPU (ANGLE), galaxy-pro-video's `server.mjs`/`browser.mjs`, ffmpeg, OpenAI TTS (`scripts/voice.py`), fluidsynth + MuseScore_General.sf3, Python 3 + numpy via `uv`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-14-galaxy-look-up-design.md`.
- 1920×1080, 60 fps, AAC 192k. Letterbox picture area 1920×804, bars 138 px each.
- On-screen text ≥ 26 px. Titles in Helvetica Neue UltraLight/Thin, tracking 0.3 em, colour `#f3efe6`. Subtitles in PingFang SC Light, set inside the lower bar. Accent `#ffd45a` appears at most three times.
- Every overlay value is a pure function of `t`. No `requestAnimationFrame`, `Date.now`, CSS animation or unseeded `Math.random` in the film.
- Only claims listed in spec §6. Never say "open source". There is one comet (Halley's Comet), not two.
- galaxy-explorer must end every run with `git status` showing only `.claude/` and `.superpowers/` untracked. `capture.mjs` applies the video hooks with `video-patch.sh on` and removes them in `finally`.
- Cuts on bar lines, cues on beats (120 BPM, 2 s bars, from `narrated.py`).
- Review gate: an independent art-director subagent must score the 30 fps preview at 9/10 or higher before the `--sub 8` render. Claude cannot hear audio, so Justin judges it.

## Verified facts this plan relies on (spike, 2026-10-14)

- Swapping in a manual `requestAnimationFrame` stepper and calling `GalaxyVideoDirector.resetForShot()` in the same `evaluate` gives bit-identical frames on two fresh browsers: 30 galaxy frames, 420 wormhole frames and 180 Jupiter frames compared by md5.
- If manual mode starts in a later `evaluate`, a few native frames slip in and the frames differ (PSNR 34 dB).
- Speed is 28–53 ms per frame on the Metal GPU with a 3840×2160 backing canvas (the patch's `dpr=2`).
- The real wormhole is about 7 s (420 frames). `flySolarTo('jupiter')` settles in 156 frames.
- A `file://` film page that draws `file://` JPEGs taints its canvas unless Chromium runs with `--allow-file-access-from-files`.

## File Structure

| Path | Responsibility |
|---|---|
| `scripts/render.mjs` (modify) | add `--allow-file-access-from-files` to the Chromium launch |
| `films/2026-10-galaxy-look-up/capture.mjs` | patch on/off, stepper, shot recipes, frame writer, `--verify` |
| `films/2026-10-galaxy-look-up/narration.json` | the 7 spoken lines (line 1 *Look up.* is type only) |
| `films/2026-10-galaxy-look-up/subs.json` | Chinese subtitle text per line id |
| `films/2026-10-galaxy-look-up/plan.py` | lays out scenes and cues, writes `timeline.json`, `zh.srt` and `en.srt` |
| `films/2026-10-galaxy-look-up/music.py` | organ + piano score composed to `timeline.json`, mixed under the voice |
| `films/2026-10-galaxy-look-up/film.src.html` | `seek(t)` compositor |
| `package.json` (modify) | `look-up`, `look-up:capture`, `look-up:sheet`, `look-up:check` |

---

### Task 1: Frame-stepped capture harness

**Files:**
- Modify: `scripts/render.mjs` (the `chromium.launch()` line)
- Create: `films/2026-10-galaxy-look-up/capture.mjs`

**Interfaces:**
- Produces: `node films/2026-10-galaxy-look-up/capture.mjs [shot ...] [--verify]`.
  - It writes `out/galaxy-look-up/shots/<shot>/00000.jpg …` (1920×1080, JPEG q 0.93) and `out/galaxy-look-up/shots/<shot>/meta.json` containing `{frames, fps: 60}`.
  - `--verify` captures each named shot twice on fresh pages and exits 1 if any md5 differs.

- [ ] **Step 1: Let the film page read local frames.** In `scripts/render.mjs` change `const browser = await chromium.launch();` to:

```js
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });   // films may draw footage frames from out/
```

- [ ] **Step 2: Check existing films are unaffected.** Run `npm run promo:check`. Expected: `deterministic: N frames identical …`.

- [ ] **Step 3: Write `capture.mjs`** with this skeleton. The shot recipes are filled in by Task 2; here, define only `probe`.

```js
#!/usr/bin/env node
// Captures Galaxy Explorer footage frame by frame. The product's video mode runs on a fixed-step
// clock, so we swap requestAnimationFrame for a manual stepper: one step = one 1/60 s frame.
//   node films/2026-10-galaxy-look-up/capture.mjs [shot ...] [--verify]
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
  window.__frame = () => {                             // render one frame and read it before it is presented
    window.__step();
    const src = document.getElementById('cv'), c = window.__c ||= Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 });
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, 1920, 1080);
    const u = c.toDataURL('image/jpeg', 0.93); return u.slice(u.indexOf(',') + 1);
  };
}

// Shot recipes. prepare: director prepare key; run(ctl): steps and records frames.
// ctl.rec(n, perFrame?) records n frames, calling perFrame(i) in the page before each one;
// ctl.step(n) advances n frames without recording.
export const SHOTS = {
  probe: { prepare: 'galaxy-overview', run: c => c.rec(30, i => GalaxyVideoDirector.applyCameraPreset('galaxy-slow-rotation', i * 1000 / 60)) },
};

async function capture(browser, url, name, dir) {
  const shot = SHOTS[name]; if (!shot) throw new Error(`unknown shot ${name}`);
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await installRecordingInitScript(ctx, { language: shot.lang || 'en' });
  await ctx.addInitScript(stepper);
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.goto(url, { waitUntil: 'load' });
  await waitForDirector(page);
  if (!shot.ui) await page.addStyleTag({ content: `${HIDE}{opacity:0!important;pointer-events:none!important}` });
  if (shot.warm) await page.evaluate(k => GalaxyVideoDirector.resetForShot(k, 0), shot.warm);   // load textures first
  await page.evaluate(async k => { await GalaxyVideoDirector.resetForShot(k, 0); window.__manual = true; }, shot.prepare);   // same task: no native frame slips in
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const hashes = []; let n = 0;
  const ctl = {
    page,
    step: async (k = 1) => { for (let i = 0; i < k; i++) await page.evaluate(() => window.__step()); },
    until: async (fn, max = 900) => { let k = 0; while (k < max && !(await page.evaluate(fn))) { await page.evaluate(() => window.__step()); k++; } return k; },
    rec: async (k, perFrame) => {
      for (let i = 0; i < k; i++) {
        const buf = shot.ui
          ? (perFrame && await page.evaluate(perFrame, i), await page.evaluate(() => window.__step()), await page.screenshot({ type: 'jpeg', quality: 93 }))
          : Buffer.from(await page.evaluate(async ([f, i]) => { if (f) await (0, eval)(f)(i); return window.__frame(); }, [perFrame && String(perFrame), i]), 'base64');
        fs.writeFileSync(path.join(dir, `${String(n++).padStart(5, '0')}.jpg`), buf);
        hashes.push(createHash('md5').update(buf).digest('hex'));
      }
    },
  };
  await shot.run(ctl);
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ frames: n, fps: FPS }));
  await ctx.close();
  return hashes;
}

const args = process.argv.slice(2), verify = args.includes('--verify');
const names = args.filter(a => !a.startsWith('--'));
const patch = on => execFileSync(`${PRO}/video-patch.sh`, [on ? 'on' : 'off'], { stdio: 'inherit' });
patch(true);
const server = await startServer({ root: APP });
const browser = await chromium.launch({ args: [...GPU_LAUNCH_ARGS, '--mute-audio'] });
try {
  const url = buildVideoUrl(server.url, { fps: FPS, width: 1920, height: 1080 });
  for (const name of names.length ? names : Object.keys(SHOTS).filter(k => k !== 'probe')) {
    const t0 = Date.now();
    const a = await capture(browser, url, name, path.join(OUT, name));
    console.log(`${name}: ${a.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    if (verify) {
      const b = await capture(browser, url, name, path.join(OUT, `${name}.verify`));
      const bad = a.findIndex((h, i) => h !== b[i]);
      console.log(bad < 0 && a.length === b.length ? `${name}: deterministic` : `${name}: NOT deterministic from frame ${bad}`);
      if (bad >= 0 || a.length !== b.length) process.exitCode = 1;
      fs.rmSync(path.join(OUT, `${name}.verify`), { recursive: true, force: true });
    }
  }
} finally {
  await browser.close(); await server.close(); patch(false);
}
```

- [ ] **Step 4: Verify the harness.** Run `node films/2026-10-galaxy-look-up/capture.mjs probe --verify`.
  Expected: `probe: 30 frames …`, then `probe: deterministic`, then `video hooks OFF`.
  Afterwards `git -C ../galaxy-explorer status --short` must show only `?? .claude/` and `?? .superpowers/`.

- [ ] **Step 5: Commit.**

```bash
git add scripts/render.mjs films/2026-10-galaxy-look-up/capture.mjs
git commit -m "Look Up: frame-stepped Galaxy Explorer capture"
```

### Task 2: Shot recipes and the footage bank

**Files:** Modify `films/2026-10-galaxy-look-up/capture.mjs` (the `SHOTS` object).

**Interfaces:**
- Consumes: `ctl.step`, `ctl.until`, `ctl.rec` from Task 1, and the app's window hooks:
  - solar: `selectSolarBody(id)`, `flySolarTo(id)`, `selectSolarComet(i)`, `flySolarToComet(i)`, `solarFly`, `solarComets`;
  - sky: `skyConDir(i)`, `skyGetLook()`, `skyLook(x,y,z)`, `selectSky(i)`;
  - DOM: `#beacons .beacon`, `#bp-solar-link`.
- Produces: shot names that `plan.py` (Task 4) refers to. Each needs at least the footage length below; the extra is handle for re-timing.

| shot | recipe | frames |
|---|---|---|
| `sun` | warm/prepare `sun-close-view`; `sun-surface-orbit` preset over the shot | 660 |
| `sky` | prepare `sky-overview`; slerp `skyLook` from Leo → Scorpius → Sagittarius (indices 4, 7, 8), `selectSky(i)` on arrival so each gold figure fades in | 960 |
| `earth` | warm `solar-overview`; `selectSolarBody('earth'); flySolarTo('earth')`; `until(solarFly === null)`; record the ride-along | 300 |
| `moon` | same with `'moon'` | 300 |
| `jupiter` | same with `'jupiter'` | 300 |
| `saturn` | same with `'saturn'` | 300 |
| `halley` | `solarComets[0].angle = -0.35`, `selectSolarComet(0)`, `flySolarToComet(0)`, wait for the fly to finish, then record | 300 |
| `wormhole` | warm `solar-overview`, prepare `galaxy-solar-beacon`; click beacon 0, step 20, click `#bp-solar-link`, record | 440 |
| `rise` | prepare `galaxy-low-angle`; `fixed-wide-galaxy` preset | 660 |
| `lmc` | prepare `galaxy-external-overview`; `magellanic-clouds-wide` | 480 |
| `cena` | prepare `centaurus-a-arrival`; `centaurus-a-dust-lane-and-jet`, then `centaurus-a-pull-away` | 720 |
| `m87` | prepare `m87-arrival`; `m87-jet-axis` | 360 |
| `ui` | `ui: true`; prepare `galaxy-overview` with the UI visible; `galaxy-slow-rotation`; frames 200–320 add a real horizontal drag with `page.mouse` (down at 960,540, +3 px per frame, up) | 900 |

- [ ] **Step 1: Write each recipe** as an entry in `SHOTS`, following `probe`.
  - Preset shots map the frame to the camera's timeline duration: `i => GalaxyVideoDirector.applyCameraPreset(P, Math.min(1, i / N) * CAM_MS[P])`. Since `CAM_MS` lives in Node, pass the duration in as a literal by building the function string.
  - Fly shots call `await ctl.page.evaluate(() => { selectSolarBody('jupiter'); flySolarTo('jupiter'); })`, then `await ctl.until(() => window.solarFly === null)`, then `await ctl.rec(300)`.
  - The selection pin (the vertical line through the planet) is part of the product. If the art director objects, drop `selectSolarBody` and call only `flySolarTo`.
- [ ] **Step 2: Capture everything.** Run `node films/2026-10-galaxy-look-up/capture.mjs`. Expected: one line per shot, then `video hooks OFF`.
- [ ] **Step 3: Verify the two riskiest shots.** Run `node films/2026-10-galaxy-look-up/capture.mjs sky ui --verify`. Expected: both `deterministic`.
  - If `ui` is not deterministic (CSS transitions run on the wall clock), add `*{transition:none!important;animation:none!important}` for that shot and re-verify.
- [ ] **Step 4: Review contact sheets.** For each shot run `ffmpeg -pattern_type glob -i 'out/galaxy-look-up/shots/<shot>/*.jpg' -vf "select='not(mod(n,60))',scale=384:-1,tile=5x2" -frames:v 1 out/galaxy-look-up/<shot>.sheet.jpg` and look at it. Re-frame any shot where the subject leaves the 1920×804 letterbox window.
- [ ] **Step 5: Commit.** `git add films/2026-10-galaxy-look-up/capture.mjs && git commit -m "Look Up: shot recipes"`

### Task 3: Narration and voice

**Files:** Create `films/2026-10-galaxy-look-up/narration.json`, `films/2026-10-galaxy-look-up/subs.json`.

- [ ] **Step 1: Write `narration.json`.**

```json
{
  "model": "gpt-4o-mini-tts",
  "voice": "coral",
  "instructions": "Trailer narrator for a short film about exploring the universe. Hushed, intimate and full of wonder at first, growing in quiet awe as the film opens up. Unhurried, with long natural pauses. Never salesy. The last line is warm and simple, almost a smile.",
  "lines": [
    {"id": "eyes",    "text": "For as long as we've had eyes, we've looked up, and drawn stories in the stars."},
    {"id": "further", "text": "Now go further."},
    {"id": "past",    "text": "Past the Moon. Past a living Sun."},
    {"id": "stars",   "text": "Out into eighty-five thousand stars, every one of them made by code."},
    {"id": "jets",    "text": "Further still, to galaxies that fire jets of plasma across the dark."},
    {"id": "page",    "text": "And all of it lives in one web page."},
    {"id": "open",    "text": "No install. Just open it, and look up."}
  ]
}
```

- [ ] **Step 2: Write `subs.json`.**

```json
{
  "look":    "抬头看。",
  "eyes":    "自从有了眼睛，我们就抬头仰望，把故事画进星空。",
  "further": "现在，走得更远。",
  "past":    "越过月球，越过一颗活着的太阳。",
  "stars":   "冲进八万五千颗星，每一颗都由代码生成。",
  "jets":    "再远一些，有星系向黑暗射出等离子喷流。",
  "page":    "而这一切，都在一个网页里。",
  "open":    "不用安装。打开它，抬头看。"
}
```

- [ ] **Step 3: Generate the voice.** Run `python3 scripts/voice.py films/2026-10-galaxy-look-up/narration.json`. Expected: `films/2026-10-galaxy-look-up/voice.json` with 7 lines, each carrying `dur` and `phrases`.
- [ ] **Step 4: Commit.** Add `narration.json`, `subs.json` and `voice.json`, then commit with `"Look Up: narration"`.

### Task 4: Plan, timeline and subtitles

**Files:** Create `films/2026-10-galaxy-look-up/plan.py`.

**Interfaces:**
- Consumes: `voice.json`, `subs.json`, and `Planner` from `scripts/narrated.py` (`say`, `beat`, `bar`, `cue`, `write(scenes, duration)`).
- Produces: `timeline.json`. On top of what `Planner.write` already emits it adds `"reel"`, a list of `{"shot", "t0", "t1", "in", "rate"}` where `in` is the first footage frame and `rate` is footage frames per film frame (negative plays backwards). It also adds `"subs"`, a list of `{"t0", "t1", "zh"}`. Also produces `out/galaxy-look-up.zh.srt` and `out/galaxy-look-up.en.srt`.

- [ ] **Step 1: Write `plan.py`.** Lay out the spec §3 structure on bar lines:

```python
"""Lays out "Look Up" on its narration and writes timeline.json plus zh/en subtitles.

    python3 films/2026-10-galaxy-look-up/plan.py
"""
import json, pathlib, sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from narrated import Planner

P = Planner(HERE)
say, beat, bar, cue = P.say, P.beat, P.bar, P.cue
SUBS = json.loads((HERE / "subs.json").read_text())
reel, subs = [], []

def shot(name, t0, t1, at=0, rate=1.0):       # footage `name` from frame `at`, played at `rate`
    reel.append({"shot": name, "t0": t0, "t1": t1, "in": at, "rate": rate})

def line(lid, at):
    s, e, ph = say(lid, at)
    subs.append({"t0": s, "t1": e + 0.3, "zh": SUBS[lid], "en": P.V[lid]["text"]})
    return s, e, ph

# hook: the Sun, then black and "Look up."
shot("sun", 0, 4.0, at=120)
cue["look"] = 4.0; subs.append({"t0": 4.0, "t1": 6.0, "zh": SUBS["look"], "en": "Look up."})
# I: the sky
sky = 6.0
s, e, _ = line("eyes", sky + 1.0)
shot("sky", sky, bar(e + 2.0))
# II: outwards through the Solar System, two bars a shot
go = bar(e + 2.0)
line("further", go + 0.5)
t = go
for name in ["earth", "moon", "sun", "jupiter", "saturn", "halley"]:
    shot(name, t, t + 4.0, at=360 if name == "sun" else 0); t += 4.0
line("past", go + 8.5)
# burst: the wormhole backwards, then the galaxy rises
burst = t
shot("wormhole", burst, burst + 4.0, at=430, rate=-1.6)
cue["burst"] = burst + 4.0
shot("rise", burst + 4.0, burst + 14.0)
s, e, _ = line("stars", burst + 5.0)
# III: beyond
beyond = bar(max(e + 1.0, burst + 14.0))
shot("lmc", beyond, beyond + 4.0)
shot("cena", beyond + 4.0, beyond + 10.0); cue["jet"] = beyond + 6.0
shot("m87", beyond + 10.0, beyond + 12.0)
line("jets", beyond + 0.5)
# twist: into a browser window
twist = beyond + 12.0
cue["twist"] = twist
shot("ui", twist, twist + 14.0)
s, e, _ = line("page", twist + 2.0)
s, e, _ = line("open", e + 1.2)
cue["url"] = beat(e + 0.5)
end = bar(e + 4.0)

def srt(key, path):
    fmt = lambda x: f"{int(x // 3600):02}:{int(x % 3600 // 60):02}:{int(x % 60):02},{int(round(x % 1 * 1000)):03}"
    path.write_text("".join(f"{i}\n{fmt(s['t0'])} --> {fmt(s['t1'])}\n{s[key]}\n\n" for i, s in enumerate(subs, 1)), encoding="utf-8")

P.write({"hook": 0, "sky": sky, "go": go, "burst": burst, "beyond": beyond, "twist": twist}, end)
tl = json.loads((HERE / "timeline.json").read_text())
tl["reel"], tl["subs"] = reel, [{"t0": s["t0"], "t1": s["t1"], "zh": s["zh"]} for s in subs]
(HERE / "timeline.json").write_text(json.dumps(tl, indent=1, ensure_ascii=False))
srt("zh", ROOT / "out/galaxy-look-up.zh.srt"); srt("en", ROOT / "out/galaxy-look-up.en.srt")
print(f"duration {end:.1f} s, {len(reel)} shots, {len(subs)} subtitles")
```

- [ ] **Step 2: Run it.** `python3 films/2026-10-galaxy-look-up/plan.py`. Expected: `duration ~92 s, 15 shots, 8 subtitles`.
- [ ] **Step 3: Check it.**
  - Every `reel` entry's highest footage frame, `in + (t1 - t0) * 60 * |rate|`, must fit inside that shot's `meta.json` frames.
  - Every `t0` that starts a scene must lie on a bar line (`t0 % 2 == 0`).

  Add these two `assert`s at the end of `plan.py`:

```python
for r in reel:
    n = json.loads((ROOT / f"out/galaxy-look-up/shots/{r['shot']}/meta.json").read_text())["frames"]
    last = r["in"] + (r["t1"] - r["t0"]) * 60 * r["rate"]
    assert 0 <= min(r["in"], last) and max(r["in"], last) < n, f"{r['shot']} needs frames up to {last:.0f}, has {n}"
assert all(abs(r["t0"] / 2 - round(r["t0"] / 2)) < 1e-6 for r in reel), "a cut is off the bar grid"
```

- [ ] **Step 4: Commit.** Add `plan.py` and `timeline.json`, then commit with `"Look Up: plan and subtitles"`.

### Task 5: Score

**Files:** Create `films/2026-10-galaxy-look-up/music.py`.

**Interfaces:** Consumes `timeline.json` (`scenes`, `cue`, `duration`) and `Score`, `render`, `mix`, `BEAT`, `BAR` from `scripts/narrated.py`. Produces `out/galaxy-look-up.wav`.

- [ ] **Step 1: Write `music.py`.** Follow the structure of `films/2026-10-parkops-promo/music.py`: `HERE`/`ROOT`/`OUT` set-up, `TL = json.load(timeline.json)`, `Score(seed=…)`, channels and `PROGRAM`, then `score.midi()`, `render()`, `mix()`. The content:
  - Key D minor → F major at the burst.
  - Channels: `ORGAN` (GM 19 Church Organ), `PIANO` (0), `STR` (48), `CHOIR` (52), `TIMP` (47), `CEL` (8). Percussion only for a suspended cymbal swell (ch 9, note 49 at low velocity) before the burst.
  - `hook` (0–4): organ low D1+D2 at velocity 110 on t=0, cut dead at `cue.look`. Silence until the sky.
  - `sky`: solo piano, Dm–B♭–F–C, one chord per bar, a high celesta note each time a constellation figure appears.
  - `go`: piano eighth-note ostinato (A–D–E–F over the chord root), strings enter `go + 8`, and density doubles in the last 4 bars before `burst`.
  - `burst`: organ + strings + choir full on F major at `cue.burst`, a timpani roll into it, then F–C–Dm–B♭ through `beyond`.
  - `cue.jet`: timpani hit plus organ pedal low F.
  - `twist`: everything drops out except solo piano. Restate the sky motif and end on a held F major chord at `cue.url`, ringing for 4 s.
- [ ] **Step 2: Run it.** `uv run --with numpy films/2026-10-galaxy-look-up/music.py`. Expected: `out/galaxy-look-up.wav`, mastered to -14 LUFS by `mix()`.
- [ ] **Step 3: Commit** with `"Look Up: organ and piano score"`.

### Task 6: The compositor

**Files:** Create `films/2026-10-galaxy-look-up/film.src.html`.

**Interfaces:**
- Consumes: `timeline.json` via `__TEXT:timeline.json__`, and footage at `../../out/galaxy-look-up/shots/<shot>/NNNNN.jpg` relative to `films/2026-10-galaxy-look-up/film.html`.
- Produces: `window.DURATION`, `async window.seek(t)`, `window.EVENTS = {bpm, duration, cuts}` and `window.READY`.

- [ ] **Step 1: Footage layer.** Skeleton:

```html
<!doctype html><meta charset="utf-8"><canvas width="1920" height="1080"></canvas>
<style>html,body{margin:0;background:#000}</style>
<script>
// Frame contract: window.DURATION (seconds) and async window.seek(t); every value is a pure function of t
const TL = JSON.parse(__TEXT:timeline.json__), CUE = TL.cue, W = 1920, H = 1080, DURATION = TL.duration;
const ctx = document.querySelector('canvas').getContext('2d');
const BAR = 138, PIC = H - 2 * BAR;                       // 2.39:1 letterbox
const cache = new Map();
const img = src => { if (!cache.has(src)) { const im = new Image(); im.src = src; cache.set(src, im.decode().then(() => im)); if (cache.size > 48) cache.delete(cache.keys().next().value); } return cache.get(src); };
const frameOf = (r, t) => Math.round(r.in + (t - r.t0) * 60 * r.rate);
const shotAt = t => TL.reel.find(r => t >= r.t0 && t < r.t1);
async function footage(t) {
  const r = shotAt(t); if (!r) return null;
  return img(`../../out/galaxy-look-up/shots/${r.shot}/${String(frameOf(r, t)).padStart(5, '0')}.jpg`);
}
async function render(t) {
  const im = await footage(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (im) ctx.drawImage(im, 0, 0, W, H);
  // overlays follow
}
window.DURATION = DURATION;
window.EVENTS = { bpm: TL.bpm, duration: DURATION, cuts: TL.reel.slice(1).map(r => r.t0) };
window.seek = async t => render(Math.min(Math.max(t, 0), DURATION - 1e-6));
document.fonts.ready.then(() => { window.READY = true; });
</script>
```

- [ ] **Step 2: Run `npm run look-up:sheet`.** This step also adds to `package.json`:
  - `"look-up:capture": "node films/2026-10-galaxy-look-up/capture.mjs"`
  - `"look-up:sheet": "node scripts/render.mjs films/2026-10-galaxy-look-up/film.src.html --sheet --step 2"`
  - `"look-up:check": "node scripts/render.mjs films/2026-10-galaxy-look-up/film.src.html --check"`

  Expected: contact sheets that show the right footage in each scene.
- [ ] **Step 3: Overlays.** Add these as pure functions of `t`, in draw order:
  1. **Letterbox.** Black bars of `BAR` px. From `CUE.twist + 2` they ease away over 4 s (closed-form spring).
  2. **Hook card.** Hard black from `CUE.look` to `sky`, with *Look up.* centred, set as a title.
  3. **Burst flash.** A white flash with a radial glow, peaking at `CUE.burst`, about 0.3 s up and 1.2 s down.
  4. **Corner whisper.** *85,000 stars · generated in code* in the bottom-right of the picture during `rise`. Menlo 24 px, 45% opacity.
  5. **Twist.** The footage shrinks into a generic browser window: rounded rect, three neutral dots, address bar reading `zjoooooo.github.io/galaxy-explorer`. Scale it from 1.0 to 0.62 from `CUE.twist + 2` to `CUE.twist + 6`, behind a dark gradient.
  6. **Titles.** *One web page. No install.* with the `page` line. **Galaxy Explorer** plus the URL in gold `#ffd45a` at `CUE.url`.
  7. **Subtitles.** `TL.subs` in the lower bar: PingFang SC Light 34 px, `#f3efe6`, fading 0.15 s in and out. After the bars leave, set them on a soft dark band instead.
  8. **End.** An iris close over the last 1.5 s. A small *AI voice* credit on the end card.
- [ ] **Step 4: Check determinism.** `npm run look-up:check`. Expected: `deterministic: N frames identical …`.
- [ ] **Step 5: Commit** with `"Look Up: compositor"`.

### Task 7: Review to 9/10

- [ ] **Step 1: Preview.**

```bash
node scripts/render.mjs films/2026-10-galaxy-look-up/film.src.html --out out/galaxy-look-up.preview.mp4 --fps 30 --sub 1
ffmpeg -y -loglevel error -i out/galaxy-look-up.preview.mp4 -i out/galaxy-look-up.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest out/galaxy-look-up.preview.av.mp4
```

- [ ] **Step 2: Art-director review.** Dispatch an independent art-director subagent (not the builder's own reviewer). Give it the preview's contact sheets (`npm run look-up:sheet`) and spec §2–4. Ask it to score 1–10 against: hook strength in the first 3 s, a sense of escalating scale, cut rhythm, type quality, how well the twist lands, and honesty (spec §6). Fix and re-review until it scores ≥ 9.
- [ ] **Step 3: Fact check.** Check every narration line and on-screen phrase against spec §6. Fix any mismatch.
- [ ] **Step 4: Commit the fixes.**

### Task 8: Final render and delivery

- [ ] **Step 1: Add the `look-up` script** to `package.json`:

```json
"look-up": "python3 scripts/voice.py films/2026-10-galaxy-look-up/narration.json && python3 films/2026-10-galaxy-look-up/plan.py && node scripts/render.mjs films/2026-10-galaxy-look-up/film.src.html --out out/galaxy-look-up.video.mp4 --sub 8 && uv run --with numpy films/2026-10-galaxy-look-up/music.py out/galaxy-look-up.wav && ffmpeg -y -loglevel error -i out/galaxy-look-up.video.mp4 -i out/galaxy-look-up.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/galaxy-look-up.mp4"
```

- [ ] **Step 2: Render.** `npm run look-up`. Expected: `out/galaxy-look-up.mp4`, about 92 s, 1920×1080, 60 fps. Check with `ffprobe`.
- [ ] **Step 3: Run the pop QA.** `uv run --with numpy scripts/qa_pops.py out/galaxy-look-up.mp4`. Expected: no pops reported.
- [ ] **Step 4: Confirm galaxy-explorer is clean.** `git -C ../galaxy-explorer status --short` shows only `.claude/` and `.superpowers/`.
- [ ] **Step 5: Commit, update memory, and send.** Commit `package.json`, update the `video-project-goal` memory, then send `out/galaxy-look-up.mp4` to Justin with SendUserFile and ask him to judge the audio. Publishing to README, Bilibili or YouTube needs his explicit go-ahead.
