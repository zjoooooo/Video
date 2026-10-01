# ParkOps Watch Dog Intro Film Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 60-second English film that shows ParkOps Watch Dog flagging the real CK36 lane outage within 23 seconds, rendered with the repository's seek(t) pipeline.

**Architecture:**
- One self-contained HTML film (`films/2026-10-parkops-intro/film.src.html`) draws every frame as a pure function of t. It reads its facts from `case.json` and its images from `assets/`, both inlined at build time by `render.mjs`.
- `scripts/score.py` synthesizes the score from the film's `EVENTS`, including an `arrangement` the film supplies.
- Four pipeline defects found in the earlier review are fixed first, so the new film is checked by a check that can fail.

**Tech Stack:** Canvas 2D, Playwright 1.62 (Chromium), ffmpeg (libx264, tmix, loudnorm), Python 3 with numpy via `uv run --with numpy`.

**Spec:** `docs/superpowers/specs/2026-10-01-parkops-intro-film-design.md`

## Global Constraints

- 1920×1080, 60 fps, 8 sub-frames per frame, H.264 yuv420p, crf 17, faststart.
- 120 BPM: one bar is 2 s, and scene changes fall on beats.
- DURATION = 60.
- Every visual value is a pure function of t. No requestAnimationFrame, timers, Date, or unseeded random; the `#play` preview path is the only exception.
- Each frame starts by resetting the canvas and filling the background.
- Colours come from the dashboard tokens:
  - bg `#0b0f17`, panel `#0e1320`, border `#243049`
  - text `#e5e7eb`, text-3 `#9ca3af`
  - ok `#34d399`, crit `#f87171`
  - primary `#4f46e5`, indigo-2 `#818cf8`
- Font: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. At most 8 words and two type sizes per frame.
- No IP addresses on screen, and no claim that the system was faster than a phone call.
- Every on-screen number must match the spec's §2 facts.
- Score voices are mid-to-high register only: marimba, chime, celesta, glass and pluck. No low reed or thud on hits. Master to -14 LUFS / -1.5 dBTP.
- Commit locally only. Never push.

## File Structure

| Path | Responsibility |
|---|---|
| `scripts/render.mjs` (modify) | per-mode work dir; `--check` with a fresh page for the reverse pass, cut times and PNG hashes |
| `tests/fixtures/leaky.src.html` (create) | a 2-second film that leaks canvas state, so `--check` must fail on it |
| `tests/fixtures/clean.src.html` (create) | the same film with a per-frame reset, so `--check` must pass |
| `tests/check.test.sh` (create) | runs both fixtures and asserts the exit codes |
| `scripts/score.py` (modify) | arrangement read from `events.arrangement` with today's arrangement as the default; warn on non-linear loudnorm |
| `films/2026-10-parkops-intro/case.json` (create) | the spec's §2 facts, the film's only data source |
| `films/2026-10-parkops-intro/assets/*` (create) | device icons and Watson sprite sheets copied from the ParkOps repo |
| `films/2026-10-parkops-intro/film.src.html` (create) | the film |
| `package.json` (modify) | `intro`, `intro:sheet`, `intro:check` scripts |

---

### Task 1: render.mjs check that can fail

**Files:**
- Modify: `scripts/render.mjs:33-35`, `scripts/render.mjs:80-89`
- Create: `tests/fixtures/leaky.src.html`, `tests/fixtures/clean.src.html`, `tests/check.test.sh`

**Interfaces:**
- Produces: `node scripts/render.mjs <film> --check`. It exits 1 when any sampled time renders differently on a fresh page than after a forward pass. Sampled times are 16 spread times plus every `EVENTS.cuts` time ± 0.1 s. The cut entry is a number or `[t, type]`.

- [ ] **Step 1:** Write `tests/fixtures/leaky.src.html`:
  - `DURATION = 2`.
  - For `t < 1`, it sets `ctx.lineCap = 'round'` and `ctx.lineWidth = 40` outside any save, then strokes a line.
  - For `t >= 1`, it strokes a line without setting `lineCap`.
  - It never resets the canvas.
  - `window.EVENTS = {cuts: [1]}`.

  Write `tests/fixtures/clean.src.html` as the same file with `ctx.reset()` and a background fill at the top of `render`.

- [ ] **Step 2:** Write `tests/check.test.sh`, which runs `--check` on both fixtures with `--out out/fixture.mp4` and asserts exit 1 for leaky and 0 for clean. Run it and expect FAIL: today's check passes leaky.

- [ ] **Step 3:** Change `render.mjs`:
  - The work dir becomes `${name}.${mode}.work`, where mode is `check`, `sheet` or `render`.
  - It is created only in the sheet and render branches.
  - In `--check`:
    - The times are 16 spread times plus each cut ± 0.1 s, clamped to `[0, DURATION)`.
    - Pass A runs forward on one page.
    - Pass B renders each time on a fresh page opened per time.
    - Both hash `canvas.toDataURL('image/png')`.

- [ ] **Step 4:** Run `bash tests/check.test.sh`. Expect PASS. Run `--check` on the September film and record the result: it is expected to fail now, because that film leaks state.

- [ ] **Step 5:** Fix the September film's leak:
  - Put `ctx.reset(); bg();` at the top of `render()`.
  - Add an explicit `ctx.lineCap = 'round'` in its s6 dashed boxes, so the look of the shipped film is kept.

  Re-run its `--check`. Expect PASS. Commit.

### Task 2: score.py arrangement from the film

**Files:**
- Modify: `scripts/score.py` (the `BARS`, `DRUMS`, `BASS`, `CHORD` and `CONTOUR` constants and the loudnorm pass)

**Interfaces:**
- Consumes: `events.arrangement`, optional:
  ```json
  {"bars": "C:intro C:A ...", "chords": {"Am": [33, [60, 64, 69]], ...},
   "drums": {"A": {"kick": "X......."}}, "bass": {"B": {"0": 0}}}
  ```
  Each key overrides the module default of the same name.
- Produces: the same WAV as today when `arrangement` is absent.

- [ ] **Step 1:** Render the September score to `out/score.before.raw.wav` (keep the raw file) and save its md5.
- [ ] **Step 2:** Merge `events.get("arrangement", {})` into the defaults, converting bass step keys from str to int.
- [ ] **Step 3:** Replace the second loudnorm pass:
  - Compute the gain as `-14 - measured_I` from pass 1.
  - Apply it as `volume=<gain>dB,alimiter=limit=0.8:attack=1:release=50:level=0`. That is one fixed gain plus a peak limiter at about -1.9 dBFS, leaving headroom for inter-sample peaks.
  - Re-measure. If the result is outside -14 ± 0.5 LUFS or above -1.5 dBTP, print a warning.
- [ ] **Step 4:** Re-render the September score:
  - The raw WAV md5 must equal Step 1's, since the arrangement is unchanged.
  - The mastered file must measure -14 ± 0.5 LUFS and ≤ -1.5 dBTP.

  Commit.

### Task 3: case data and assets

**Files:**
- Create: `films/2026-10-parkops-intro/case.json`, `films/2026-10-parkops-intro/assets/`

- [ ] **Step 1:** Write `case.json` with exactly the spec §2 values:
  - `fleet`: 193 stations, median flag 16.5 s, window
  - `site`: CK36, SJS, CK36_PMS, and the devices
  - `timeline`: the times as `"HH:MM:SS"` strings
  - `alerts`: the 4 titles
  - `flagSeconds`: 23
- [ ] **Step 2:** Copy these files from `git -C "/Users/justin/Project/ParkOps Agent" show origin/main:internal/server/dashboard/<file>`:
  - `dev-opc.png`, `dev-station.png`, `dev-camera.png`, `dev-nvr.png`
  - `mascot-welcome.webp`, `mascot-worried.webp`, `mascot-happy.webp`, `mascot-tail.webp`
  - `mascot.json`
- [ ] **Step 3:** Verify each sheet's frame count and frame size against `mascot.json` (12 columns): image width = 12 × frame w, and rows = ceil(n / 12). Commit.

### Task 4: the film, scenes 1–3 (fleet, question, brand)

**Files:**
- Create: `films/2026-10-parkops-intro/film.src.html`

**Interfaces:**
- Produces: `window.DURATION`, `window.seek(t)`, `window.EVENTS = {bpm, duration, cuts: [[t, type]], hits, runs, rolls, arrangement}` and `window.READY`.
- Inlined at build time:
  - `CASE` parsed from `__TEXT:case.json__`, which needs a text inliner in render.mjs (see Step 1)
  - images from `__ASSET:assets/<file>__`

- [ ] **Step 1:** Add a `__TEXT:path__` token to `render.mjs`'s inliner. It inlines a file's UTF-8 text, JSON-escaped as a JS string literal.
- [ ] **Step 2:** Build the time toolkit and the compositor:
  - The toolkit, from the September film: `prog`, the easings, the closed-form `spring`, `wobble`, `rise` kinetic type, and seam transitions (push, iris, wipe).
  - Every `render(T)` starts with `ctx.reset()` and fills the bg.
  - A `sprite(name, t, x, y, h)` draws Watson's frame `floor(t × 24)` from the sheet, using `mascot.json`.
- [ ] **Step 3:** Write scenes 0–14 s per the spec table:
  - 193-dot grid with a beat pulse
  - one dot blinks red
  - brand reveal with Watson `welcome`
- [ ] **Step 4:** Run `--check` (expect PASS) and a sheet for 0–14 s. Look at the sheet and fix collisions or empty frames. Commit.

### Task 5: the film, scenes 4–7 (CK36 map, lanes lost, flagged, which device)

- [ ] **Step 1:** Draw the CK36 station map as it appears on the real page:
  - Entry and Exit lane groups on either side of the CK36_PMS hub
  - BOOTH, TOPUP and NVR below
  - dashed links with packets at `u = (u0 + v·t) mod 1`
  - status dots
- [ ] **Step 2:** At 11:03:08 (film time 19 s), the 4 lane devices turn red, their links stop, and the packets freeze.
- [ ] **Step 3:**
  - A counter runs 0 → 23 s over 25–27 s.
  - The bell badge pops.
  - The 4 alert rows drop in on beats.
  - Watson plays `worried`.
- [ ] **Step 4:** Zoom to the red nodes and label site, lane and device in sequence, one read at a time. Then run `--check` and a sheet for 14–37 s, fix what you see, and commit.

### Task 6: the film, scenes 8–10 and the score

- [ ] **Step 1:** Draw a timeline of 11:03 → 11:59 → 12:01 → 12:04:
  - Nodes go green one by one at their real order: the PMS hub at 12:01, the 4 devices at 12:02, programs clear at 12:04.
  - Watson plays `happy`.
  - On-screen text: "All clear at 12:04."
- [ ] **Step 2:** Return to the fleet grid. Short-lived red flashes appear on random seeded dots, each green again within a beat. On-screen text: "Every station. Every problem." / "Flagged in ~16 s, typically."
- [ ] **Step 3:** End card: "Know first." / "ParkOps Watch Dog", with Watson `tail`.
- [ ] **Step 4:** Fill `EVENTS`. The `arrangement` follows the spec §5 arc:
  - bright major for the fleet
  - drums out and minor for the outage, with a tick run following the counter
  - an `alert` hit per alert row
  - a `mark` hit per node turning green
  - a build, then a resolve on C
- [ ] **Step 5:** Run `--check` and a full sheet at one frame per beat. Commit, then show the sheet to Justin and wait for his OK.

### Task 7: render, score, QA, deliver

- [ ] **Step 1:** Add the package.json scripts:
  ```json
  "intro": "node scripts/render.mjs films/2026-10-parkops-intro/film.src.html --out out/parkops-intro.video.mp4 --sub 8 && uv run --with numpy scripts/score.py out/2026-10-parkops-intro.events.json out/parkops-intro.wav && ffmpeg -y -loglevel error -i out/parkops-intro.video.mp4 -i out/parkops-intro.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/parkops-intro.mp4",
  "intro:sheet": "node scripts/render.mjs films/2026-10-parkops-intro/film.src.html --sheet --step 0.5",
  "intro:check": "node scripts/render.mjs films/2026-10-parkops-intro/film.src.html --check"
  ```
- [ ] **Step 2:** Run `npm run intro`. Then run `uv run --with numpy scripts/qa_pops.py out/parkops-intro.mp4` and expect 0 pops.
- [ ] **Step 3:** Pull frames at each seam and in the middle of fast motion. Check the motion blur and that no text overlaps.
- [ ] **Step 4:** Check every on-screen number against case.json.
- [ ] **Step 5:** Make a 3×3 preview sheet, send the MP4 and the sheet to Justin, and commit.
