# Project.md - Learning Notes: Code-Rendered Video with Claude Opus 5.5

Study date: 2026-09-29. Sources: the 389-entry community prompt collection
(yihui-dev/awesome-opus5-5-videos), three open-source reels whose full source
was written by Opus 5.5, two agent skills that encode the craft, and one
production system (shipvideo). Everything marked "verified" was run in this
session.

## 1. What is actually happening

Opus 5.5 never emits pixels. It writes a program whose single entry point is
`seek(t)` (or `draw(t)` / `REEL.render(t)`): paint the exact frame for time
`t`. A headless browser calls that function once per frame, screenshots the
canvas, and pipes the images into ffmpeg. Music is either synthesized from
numpy and aligned to the renderer's event list, or a licensed track whose beat
grid is measured first. The model can therefore look at its own frames
(contact sheets), fix them, and re-render. That closed loop is what separates
the good results from the "meh" ones.

## 2. The frame contract (appears in every serious prompt and every codebase)

- `window.DURATION` (seconds) and `async window.seek(t)` are the only API.
- Every visual value is a pure function of `t`. Forbidden: `requestAnimationFrame`
  loops, `Date.now()`, `setTimeout`, CSS transitions/animations, physics that
  accumulates between frames, unseeded `Math.random()`.
- Springs are closed-form step responses. A value whose target changes N times
  is the sum of N spring responses, so it stays a pure function of time.
- Last frame equals first frame when a loop is wanted; export `[0, duration)`
  without duplicating the endpoint.
- Everything lives in one HTML file with fonts and images embedded, so the
  render does not touch the network.

## 3. What the 389-prompt corpus says

Numbers below are over the 279 prompts published in full (110 are partial).

| Metric | Value |
|---|---|
| Median prompt length | 169 characters |
| Prompts under 200 chars | 163 (58%) |
| Prompts over 1500 chars | 34 (12%) |
| Creators who used the exact same "showreel for a résumé" one-liner | 74 |
| Prompts that mention 15 seconds | 87 |
| Mention BPM or beat | 40 |
| Mention Playwright or ffmpeg | 34 |
| Mention motion blur or subframes | 31 |
| Name a seek(t)/draw(t) contract or "pure function of time" | 28 |
| Ask the model to ask for inputs first | 14 |
| Mention Remotion | 3 |

Categories: motion 223, interactive 68, 3D 51, explainer 47. Tech tags: canvas
288, three.js 130, svg 125, shader 95, gsap 59.

Three tiers emerge:

1. **One-liner** (58% of prompts). The model picks everything. Quality varies
   run to run; the famous line works because it plants an evaluation standard
   ("incredible motion designer", "your showreel") rather than instructions.
2. **Structured brief** (12%). Sectioned prompts that fix the contract, the
   beat grid, the banned list, the render pipeline, and a QA step. These are
   the reproducible ones and the ones that look like agency work.
3. **Director** (a handful). Opus orchestrates external image/video/music
   models through MCP and only writes the compositing code. Highest realism,
   needs paid model access.

## 4. Anatomy of a top-tier structured prompt

The most-copied structured prompt (twoclipping, reused verbatim by at least
seven other creators) has six sections. The pattern is the lesson, not the
content.

```text
<inputs>     Ask me for: 8 to 12 UI states, one accent color, a royalty-free
             song around 120 BPM.
<direction>  Dribbble-level UI motion. One shape, never cut ... Springs
             everywhere, a tiny overshoot at most ... The last frame is the
             first frame, so it loops.
             Banned: bouncy easing, particle bursts, glows, gradients on UI
             chrome, mismatched icon strokes, dead time, anything that looks
             like a template.
<structure>  120 BPM, 7 bars, something happens on every beat.
             Button -> loader -> check -> dynamic island -> music player ...
<build>      1. One HTML file, square 1440x1440. Every style is computed from
                time inside seek(t): no CSS transitions, no timers, no state
                carried between frames.
             2. Springs are closed-form step responses ...
             5. Analyze the song with numpy for the beat grid and start on a
                downbeat.
             6. Render with Playwright: 4 subframes per frame, blended with
                ffmpeg tmix for motion blur at 60fps.
             7. Render one frame per beat before the full render. Fix
                anything off the grid, cramped or hard to read.
<gotchas>    Never put will-change on anything the camera scales ... Text
             that swaps inside a morphing container needs its own enter and
             exit timing ... Make the last frame identical to the first,
             cursor position and speed included, or the loop stutters.
<start>      Ask me for the inputs, then show me the state list on the beat
             grid before you write any code.
```

Why each section matters:

- **inputs** turns a one-shot into a short interview, so real data and a real
  song go in. Every "real UI, real data, no placeholders" result comes from this.
- **direction** sets a taste bar and, more importantly, a banned list. The
  banned list is where "template look" is killed: no crossfades, no particle
  bursts, no glows, no holds longer than one second.
- **structure** is a beat map. "Something happens on every beat" converts
  vague pacing into a checklist the model can verify.
- **build** fixes the contract and the pipeline so the model does not
  improvise a broken one.
- **gotchas** are hard-won browser facts (will-change blur, text overlap in
  morphs, loop boundary) that the model does not know by default.
- **start** forces a plan review before code. Cheap to check, expensive to fix
  later.

Two other high-performing shapes:

- **Product brief with a timeline** (brainextends "Spotify", 18 s at 60 fps):
  `deliverables / art_direction / artwork / timeline (0.0-0.6 s ...) /
  persistent_player / motion_quality / audio / implementation_and_validation`.
  Key lines: "Do not stop at a storyboard, still images, or an implementation
  plan", "Outgoing titles must disappear before incoming titles occupy the
  same space", "Use 3-5 temporal subframe samples per output frame", "Inspect
  contact sheets and moving playback ... Fix visual defects before delivering".
- **Typography film with a quality gate** (gdgtify "Build the Floor"): assigns
  words architectural roles, writes a storyboard with second ranges, then
  "QUALITY GATE: Inspect eight representative frames. Check that the speech
  reads in the correct order ... Return the complete HTML implementation."

A Chinese-language example worth keeping (op7418, mobile-game reward VFX):
it ends with a self-check list before delivery: is the hero occluded by glow
or particles, is anything blown out to white, is the background cluttered or
showing stray outline artifacts, is small text legible, is anything still
jittering after the settle. Then "tell me each phase's duration and which
parameters control intensity". Same idea as the quality gate.

## 5. The recurring rules, distilled

1. One HTML file, one canvas, one `seek(t)`. Embed fonts and images.
2. Pure function of time. No rAF, timers, CSS transitions, accumulated
   physics, or unseeded random.
3. Closed-form springs, tiny overshoot at most; sum one spring per target
   change.
4. Put the piece on a BPM grid (120 is the default) and make something happen
   on every beat. Cuts land on beats and on exact frame boundaries.
5. Write a banned list. Common entries: crossfades, blur-ins, particle bursts,
   glows, lens flares, camera shake, gradients on UI chrome, holds over 1 s,
   dead time, template looks, tiny unreadable code or text.
6. Content that swaps inside a morphing container gets its own enter and exit
   timing so text never overlaps.
7. Loop: last frame equals first frame, including cursor position and
   velocity; export `[0, duration)`.
8. Render one frame per beat as a contact sheet first; fix; then full render.
9. Motion blur: 4 (3 to 8) sub-frames per output frame, blended with ffmpeg
   `tmix` or accumulated in WebGL over a 180-degree shutter.
10. 60 fps, H.264, `yuv420p`, `crf` 17-18, `+faststart`; export every aspect
    ratio in parallel; keep content inside a 9:16-safe area if a vertical cut
    is planned.
11. Sound is placed by measured transient peak at the visual event, never
    approximately. Loudness normalized to -14 LUFS.
12. Never `will-change` on anything the camera scales, or text blurs.
13. A flood/wipe must overscale past the corners and take about 0.3 s, or half
    the screen changes in one frame.
14. Ask for inputs, then show the beat map and a few stills before writing
    the full film.
15. Deliver the MP4 and the editable source, and say which parameters tune
    intensity.

## 6. Rendering recipes verified in this session

Environment: Node 22, Playwright 1.56 with its bundled Chromium, and a full
ffmpeg (the imageio-ffmpeg static build). Playwright's own ffmpeg lacks
libx264 and will make a naive pipeline hang, because ffmpeg exits and the
stdin write never drains.

### 6.1 Basic: seek(t) -> PNG -> ffmpeg

```js
const ff = spawn(FFMPEG, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', out], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let i = 0; i < total; i++) {
  await page.evaluate(t => window.seek(t), i / FPS);
  const png = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
}
ff.stdin.end();
```

Measured: 1280x720 at about 190-250 ms per frame with software rendering.

### 6.2 Motion blur with sub-frames and tmix (the community recipe)

Render `S` sub-frames per output frame spread across half the frame interval
(180-degree shutter), feed them at `FPS*S`, average groups of `S`, keep every
`S`-th frame.

```js
const FPS = 60, S = 4, SHUTTER = 0.5;
spawn(FFMPEG, ['-f', 'image2pipe', '-framerate', String(FPS * S), '-i', '-',
  '-vf', `tmix=frames=${S}:weights=1,select='not(mod(n\\,${S}))',setpts=N/${FPS}/TB`,
  '-r', String(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', out]);
for (let k = 0; k < S; k++) await page.evaluate(t => window.seek(t), (i + (k / S) * SHUTTER) / FPS);
```

Measured: 3 s at 60 fps (720 sub-frames) in 25 s. JPEG at quality 95 is
fine for sub-frames and 3x faster than PNG. The motion-broll skill centres
the sub-frames on the frame time (`(k - 1.5) * sub`) and selects
`eq(mod(n,4),3)`; the SuhaasNv reel instead accumulates 8 sub-frames in
WebGL over the first half of the interval so the shutter leads each frame and
a cut on a frame boundary never bleeds into the previous frame.

### 6.3 Contact sheet from a finished MP4

```bash
ffmpeg -i out.mp4 -vf "select='not(mod(n\,150))',scale=426:240,tile=3x2" -frames:v 1 sheet.jpg
```

For a QA sheet before the full render, call `seek(t)` at one time per beat
and tile the screenshots instead.

### 6.4 Score and mux

The 2046 reel synthesizes its score from `events.json` exported by the
renderer, masters with two-pass `loudnorm=I=-14:TP=-1.5:LRA=11`, then:

```bash
ffmpeg -i video.mp4 -i score.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest final.mp4
```

### 6.5 Alternative: Remotion

`npx skills add remotion-dev/skills` teaches Claude Code the Remotion
conventions; `npx remotion render` produces the file. Only 3 of 279 community
prompts mention it; the single-HTML route is what the model picks unaided.

## 7. Code architecture of the open-source reels

All three reels share one shape: a tiny time toolkit, scenes that are pure
functions of `t`, a compositor that owns transitions and post, a renderer
that grabs frames in parallel, and a score generated from the renderer's
own event list.

### 7.1 Time toolkit (identical idioms in all three)

```js
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const prog  = (t, a, b) => clamp((t - a) / (b - a));          // absolute window -> 0..1
const env   = (t, a, b, fi, fo) => Math.min(prog(t, a, a + fi), 1 - prog(t, b - fo, b));
// house style: outExpo for entrances, inExpo for exits, inOutExpo for wipes, outBack for pops
```

Closed-form spring (damped oscillator step response) and a settle wobble:

```js
function spring(t, f = 3, z = 0.4) {            // t = seconds since trigger, f in Hz, z damping
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f;
  if (z < 1) { const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)); }
  return 1 - Math.exp(-w * t) * (1 + w * t);
}
const wobble = (t, f = 6, k = 8) => (t <= 0 ? 0 : Math.sin(t * f * 2 * Math.PI) * Math.exp(-t * k));
// squash and stretch that preserves area: ctx.scale(1 + k, 1 - k) with k = wobble(...)
```

Randomness is an integer hash keyed by object index and stream number, never
`Math.random`. Temporal jitter is quantized: glyph scramble at 30 Hz via
`hash(i, Math.floor(t * 30))`, hand-drawn "boil" reseeded 12 times per second.
Camera shake is Perlin noise of `t`, not accumulated.

One energy scalar drives every hit. A list of `[time, amplitude]` pairs is
summed as exponential decays and feeds shake, zoom punch, chromatic
aberration and barrel warp at once; the score reads the same list:

```js
const IMPACTS = [[0.5, 0.35], [2.0, 1.0], [6.0, 1.1], ...CUTS.map(c => [c[0] / FPS, 0.5])];
function impact(t, k = 9) { let s = 0; for (const [ti, a] of IMPACTS) if (t >= ti) s += a * Math.exp(-(t - ti) * k); return s; }
```

### 7.2 Scenes and transitions

- Scenes are `{id, t0, t1, world(ctx, t), type(ctx, t)}`. Windows overlap by
  about 0.4 s and the compositor draws both during the overlap. Every start
  time sits on the 120 BPM eighth-note grid.
- Transitions are geometry, not crossfades: a slit that opens from the
  previous scene's horizon line, twelve vertical strips staggered 18 ms from
  alternating edges, a diagonal wipe, an iris. The incoming world is clipped
  to the shape; the outgoing type is clipped to its evenodd inverse, so old
  copy is cut away exactly where new picture arrives. Each edge is stroked
  twice (wide low-alpha glow plus thin bright core) and bloom picks it up.
- Match cuts: a Gaussian flash centred on the point the previous scene zoomed
  into, and the next scene starts its camera at that same point.
- The "world" layer gets bloom (threshold via CSS filter, then a 1/4, 1/8,
  1/16, 1/32 pyramid recombined with `lighter`); the "type" layer is drawn
  after bloom so text stays crisp.
- Montage re-shoots: a table of frame-exact cuts that call earlier scene
  functions with an old time plus local elapsed time. Gaps shrink 8, 7, 7, 5,
  4, 4, 4, 3 frames so the montage accelerates; every cut adds an impact.
- Motion trails and streaks evaluate the same position function at `t` and
  `t - dt` and draw a line between them. No particle state exists.
- Kinetic type: pre-measure words and per-character offsets once, clip to the
  line box, stagger words by 75 ms, rise from under the baseline with
  `outExpo`, exit upward with `inExpo`. Serif words write on one character at
  a time at 24 ms spacing. Scramble-decode keeps output length constant and
  locks characters left to right.
- Odometer: draw digit `d` and `d + 1` offset by the fractional roll inside a
  clip; ghost copies proportional to speed give cheap motion blur.
- Isometric city: one item list (buildings, lots, cars) re-sorted by depth
  every frame; faces backface-culled by rotated normal; traffic is platoons
  with `u = (u0 + v * t) mod length`.
- Two-link inverse kinematics by law of cosines, one module placed every
  0.25 s (an eighth note), with the servo sound pre-rolled by the lift time.
- Inverting an easing for sound sync: bisection on `yearAt(t)` finds the
  exact instant each odometer digit changes, and those instants become ticks.

### 7.3 Lens pass and motion blur (the WebGL2 version)

Each output frame accumulates 8 sub-frames drawn inside the first half of the
frame interval (180-degree shutter, leading the frame so a cut on a frame
boundary never bleeds backwards). The 2D canvas is uploaded as a texture and
added into an RGBA16F framebuffer with weight 1/8. The post shader applies
barrel warp and chromatic aberration scaled by `impact(t)`, a domain-warped
fBm "liquid chrome" whose gradient doubles as refraction, vignette, and
grain seeded by the output frame number (so it stays sharp after
accumulation). Resolve divides by accumulated weight and adds a half-LSB
dither to kill banding.

### 7.4 Renderers

- Playwright or Puppeteer pages in one Chromium, each pulling the next frame
  index from a shared queue; frames written atomically (`.tmp` then rename)
  so a render is resumable.
- Pixels come from `gl.readPixels` (raw RGBA through ffmpeg `-f rawvideo ...
  -vf vflip`) or `canvas.toDataURL('image/jpeg', 0.95)`.
- Fonts are awaited with `document.fonts.load()` before `ready`.
- Film grain is disabled for the MP4 render (`#nograin`) because moving grain
  pushed the bitrate from about 7 to about 100 Mbps; the live player keeps it.
- Canvas JPEGs are full-range BT.601, so the encode converts explicitly:
  `scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709`
  and tags `-colorspace bt709 -color_primaries bt709 -color_trc bt709`.
- Encode: `libx264 -preset slow -crf 17 -profile:v high -movflags +faststart`.
- QA: `--sheet=t1,t2,...` contact sheets, `--stills`, `--strip=a:b` (every
  frame in a span, for checking a hit), and crops that follow a world point
  through the camera.

### 7.5 Score from events

The renderer exports `REEL.events()` (ticks, cuts, locks, landings, hits) to
`events.json`; a numpy script builds instruments (polyBLEP saw, FM bell,
inharmonic clank, kick with pitch drop, swept band-passed noise for risers
and whooshes) and places each sound at its event time with pan derived from
screen x and pitch derived from index:

```python
for i, x in enumerate(EV["locks"]):
    left = i % 2 == 0
    send(x, clank(230 if left else 270), 0.46, p=(-0.4 if left else 0.4), r=0.22)
    send(x - 0.27, servo(...), 0.08)          # pre-roll equals the arm's lift time
```

Mix chain: sidechain from the kick list, synthetic-IR convolution reverb,
dotted-eighth ping-pong delay, tanh saturation, look-ahead limiter, then
two-pass loudnorm to -14 LUFS / -1.5 dBTP. Where a real song is used
instead, the prompts have numpy measure its beat grid and place UI sounds by
measured transient peak.

### 7.6 Long-form (minutes, many scenes): what the P(doom) author learned

- Storyboard first, as a table `| Time | Lyric | Shot | Out |`. The "Out"
  column forces every shot to name its exit transition. A recurring prop and a
  recurring set hold 156 s together.
- One subagent per chapter file, strict ownership: "Only edit your own
  chapter file. If a shared helper is missing, write it privately inside your
  IIFE." Shared characters pass through a global `CAST` registry, with
  fallbacks so the full timeline renders while chapters are unfinished.
- The brief Opus wrote for its own subagents contains the rules that matter:
  "Every shot must be a pure function of t"; "Every shot needs an event:
  something changes between its first frame and its last"; "Models overuse
  text. A sign that repeats the story is the classic failure"; "Lyrics are
  not text. Act the meaning of a line instead"; "Write the reads. One read at
  a time. Fast actions, slow meanings"; "Every seam gets a transition, and
  don't default to the same one every time"; "Avoid twinning: code copies
  values, so both arms end up at the same angle."
- Timing is the rule models get wrong most often: the first version packed a
  whole gag into 1.3 s and nobody could tell what had happened.
- Self-QA budget: at least one contact sheet per shot, a frame strip for
  every key motion and transition, and a crop for every face that carries the
  story. Render the sheet, open it with the image-reading tool, and check the
  first and last frame of every shot.
- Reliability fixes in the second version: per-part seeded "boil" so one
  moving object does not re-jitter everything drawn after it; draw every
  shape around its own centre because the brush library loses strokes far
  from the origin under zoom; additive glow instead of pigment mixing; an
  emotion table with beat-locked idle bodies and anticipation before each
  key; GPU flag probing so headless Chrome actually uses the GPU.

### 7.7 What the agent skills and the production system add

Three projects package the craft as instructions for the model. Their rules
overlap heavily with the community prompts and add a few things.

**opus-visual-motion-engine (skill).** The strictest contract:
"`render(t)` is the only state driver ... `seek(x)` renders the identical
frame no matter what was rendered before it. `t` is in seconds. Clamp `t` to
`[0, DURATION]`, never to `[0, 1]`: clamping seconds to 0..1 silently freezes
the whole timeline." Its motion rules:

- Five moves, each with one job: ENTER (siblings staggered 60-120 ms; "fade-up
  on every section is the AI tell"), EMPHASIS (scale swell at most 1.2),
  TRANSITION (0.2-0.6 s), CAMERA ("at most one move per scene, never during a
  text read"), HANDOFF ("exit to an empty frame, then enter reads as a
  slideshow"). "If a motion is none of these, delete it."
- Transitions carry meaning: hard cut = category change, match or morph =
  the same thing continuing, push or pan = traversal, iris = entering a new
  world. Never a default crossfade.
- Technique budget: each scene has one primary technique and no two scenes
  share it (kinetic slam, word waterfall, mask rise, typewriter clip, stroke
  draw, data chart, RGB glitch, iris, count-up, grid assemble, logo
  assemble).
- Settle-hold: at least 0.4 s for shapes and 1.2 s per 8 words for text. Two
  type sizes per frame at most. "A 60% full frame reads deliberate; a 95%
  full frame reads generated."
- Banned "AI tells": cream plus serif plus terracotta, near-black plus acid
  accent, uniform radius and shadow everywhere, purple gradients and
  glassmorphism, tracked all-caps eyebrows, Inter by default, everything
  animating at once at 300 ms, every scene fading out to empty.
- The plan must have 3-7 beats, a scene card per beat with the one primary
  technique, a signature moment "shown, not labeled", and a handoff table;
  "a scene without a card, or a cut without a handoff row, does not belong in
  the video."
- QA script: captures a frame every 0.5 s and fails on text collisions over
  20% (measured on glyph ink), clipped text, a frozen timeline, a
  determinism mismatch when frames are revisited out of order, and an empty
  handoff; warns on dead air over 2.5 s, sparse frames, an unsettled end,
  low contrast and tiny type. The text-only model reads the report's
  `coverage` and `diff` numbers per frame: coverage under 0.015 means empty,
  diff 0 across a scene means nothing moves, a diff spike marks a cut. The
  final critique question: "Does this look intentionally designed, or merely
  generated? Expect 2-3 generations."

**motion-graphics / motion-broll (skill).** Built for B-roll under a talking
head: "Every clip is one shape that never cuts ... every change lands on a
spoken word." Pace to speech, one change per spoken beat, 0.4-1.2 s apart.
Spring presets as `[omega, zeta]`: MORPH `[15, 0.84]`, FAST `[27, 0.86]`,
SLOW `[12.5, 0.9]`, SOFT `[10, 0.95]`, CAM `[7.5, 1]`. Its renderer is the
canonical tmix recipe: 4 sub-frames centred on the frame time over a
180-degree shutter, then

```text
-vf format=gbrap,tmix=frames=4:weights='1 1 1 1',select='eq(mod(n\,4)\,3)',setpts=N/FPS/TB
```

Alpha clips export as ProRes 4444 with `omitBackground` for compositing over
footage.

**shipvideo (production system).** A three-tool agent (web_fetch,
check_scene, render_video) that turns a URL into a launch film unattended.
Its director prompt is short and worth copying:

> "You are a motion designer who writes code ... 20 to 40 seconds. 6 to 10
> beats. Each beat is one idea, 2 to 5 seconds, then a clean cut to the
> next. Kinetic typography first: huge words that land with weight, then
> tighten into a sentence. Never more than 8 words on screen at once. Show
> the mechanism, not stock imagery ... Rhythm: fast beats for the problem, a
> breath for the name, a confident hold for the payoff ... Hold the final
> frame for 2 seconds ... Color: one bold background color per beat, two at
> most in the whole film ... Every element that should leave the screen must
> be animated out. Nothing may linger from a previous beat."

Story spine: hook on the pain or promise (2-3 beats), reveal the name, how
it works in 3 beats with one concrete visual each, proof or numbers only if
the source gives them ("never invent numbers"), end card. Process: fetch the
page, write a shot list, write the whole HTML, run `check_scene` (which seeks
the virtual clock every 3 s and returns the visible text and background per
timestamp, plus console errors), fix every beat with leftover or missing
text, render once. Instead of demanding a `seek(t)` contract, its renderer
injects a virtual clock: `performance.now`, `Date`, `requestAnimationFrame`,
`setTimeout` and `setInterval` are overridden, `__seek(t)` steps time in
1/60 s increments, fires due timers, flushes rAF callbacks and pauses every
CSS animation at the right `currentTime`. Ordinary CSS `@keyframes` code
then renders deterministically. Cost reported: about 100k tokens and four
minutes per film; the file is kept under 60 KB.

Where the three disagree: shipvideo recommends Inter, the skill flags it as a
tell; shipvideo wants clean cuts and full-bleed wipes, the skill wants carried
handoffs; the skill allows back-out and elastic easing for hero reveals, the
broll skill bans bouncy easing outright. Taste, not physics. Pick one and
write it into the banned list.

## 8. The merged prompt template

`prompts/video-prompt-template.txt` merges the rules from the community
prompts (sections 3-5), the open-source reels (section 7) and the eight skill
packages (section 9) into one prompt for Claude Code. It is plain text so it
can be copied whole.

How to use it: paste the whole file into Claude Code (Opus 5.5 or stronger),
started in an empty folder, and add one line saying what you want, or nothing.
There is nothing to fill in and nothing to delete. The model then:

1. Asks what the video is about and what material you have (one open
   question, skipped if your first message already says it).
2. Asks two rounds of multiple-choice questions through Claude Code's
   question tool, where you can always type your own answer. It skips anything
   your message or material already answers.
3. Shows a one-screen brief card for you to confirm or correct, including the
   one sentence the viewer should remember, which it writes from your material.
4. Shows three plans with a real key frame each, then builds, renders, scores
   itself and delivers.

The questions it asks:

| Round | Question | Options (several allowed where marked) |
|---|---|---|
| 1 | What is the video about, what material do you have, and what must or must not appear? | Free text: an article, a script, your narration audio, a product link or code folder, a reference video or image, your logo or brand colours |
| 2 | Type (several) | Motion-design piece / narrated explainer / product promo from your web app or code / story or art-style short |
| 2 | Where it will be watched (several) | Phone 9:16 / landscape 16:9 / square 1:1 |
| 2 | Length | 10-15 s / about 30 s / about 60 s / as long as your narration |
| 2 | Music | Made in code / you provide it / none |
| 3 | Voice | Your own recording / AI voice-over / none |
| 3 | Style | Propose three directions / you name one / follow your reference |
| 3 | Check-ins | Plans and key stills / plans only / don't stop |

Each question has at most four options, the limit of Claude Code's question
tool. Subtitles and, when several types are picked, which type leads are not
asked; the model proposes them on the brief card.

Several types can be combined. The leading type sets the structure and the
timing (beat grid, narration, product story or treatment); the others lend
rules only where they fit, and the leading type wins a conflict. Typical
combinations: a product promo led by narration (B leads, C lends the real-UI
capture), an explainer with a character (B leads, D lends the character
rules), a launch teaser in motion-design style (C leads, A lends the beat
grid).

| Section | What it controls | Taken mainly from |
|---|---|---|
| `<role>` | The quality bar | mg-styles-15 |
| `<intake>` | The questions, the brief card, the one sentence to remember | xilo-opus-video, wtt (style gate), dashi (one thing the film says), code-video-director (unattended mode) |
| `<process>` | Three plans with real key frames, `brief.md`, shot-by-shot stills, low-res preview | xilo-opus-video, lemo-opuscar, wtt |
| `<type>` A | Motion-design piece on a beat grid | mg-styles-15, @twoclipping |
| `<type>` B | Narrated explainer anchored to words | dashi-animationstyle, huashu grammars, wtt |
| `<type>` C | Product promo from captured real UI | video-shotcraft, shipvideo |
| `<type>` D | Story or art-style short with characters | lemo-opuscar, P(doom) / ClaudeAnimationBase, huashu |
| `<direction>` | Composition, colour, type sizes, contrast, dwell, pacing, banned list | dashi rules, opus-visual-motion-engine, mg-styles-15, code-video-director, huashu |
| `<motion>` | Spring tiers, shot structure, events not cycles, camera vocabulary, transitions | xilo, dashi, code-video-director, huashu, @twoclipping |
| `<sound>` | Cue sheet, sync points, beat fitting, narration first, ducking, mastering | mg-styles-15 audio library, video-shotcraft, code-video-director, lemo-opuscar |
| `<build>` | Frame contract, determinism, fonts, renderer, motion blur | all of them; canvas reset from dashi, shutter rule from the SuhaasNv reel |
| `<review>` | File checks, sheets, determinism test, scored rounds, independent reviewer | mg-styles-15 scale, xilo, wtt, huashu, video-shotcraft |
| `<deliver>` | Files, credits and the report | mg-styles-15, lemo-opuscar |

If you would rather install a skill than paste a prompt:

| Type | Skill to install |
|---|---|
| A, motion design | mg-styles-15 (prompts, harness, audio library) or xilo-opus-video |
| B, narrated explainer | dashi-animationstyle (Chinese narration, macOS) or huashu-art-motion |
| C, product promo | video-shotcraft (Remotion) |
| D, story or art style | lemo-opuscar, or huashu-art-motion for art-history looks |

A sample brief card, as the model would show it after the questions for a
narrated explainer:

```text
About: what a model's context window is, and why it forgets in long chats
Remember: the context window is everything the model can see at once; when it
  is full, the oldest text falls out
Audience: general public, watching on a phone
Type: narrated explainer
Length: 45 s (as long as your narration)   Format: 9:16 1080x1920, 30 fps (default)
On-screen language: Simplified Chinese
Music: none   Voice: your recording ./source/narration.wav
Subtitles: burned in plus .srt (default)
Style: three directions to propose
Check-ins: plans and key stills
Not wanted: robots, glowing brains, binary code rain
Unverified facts: none
Defaults used: frame rate, subtitle style
```

Not tested: the template has not been run end to end in Claude Code from
this container, which has no Anthropic API key. Each rule comes from a
source that was read, and the render recipes in section 6 were run here.

## 9. Skill packages: from one prompt to a repeatable workflow (added 2026-10-14)

Source: a post by @Cryptoxorz listing eight Claude video skills and a
100-second film made with the first of them. Seven of the eight have public
repositories and were cloned and read; four were also run here. The eighth
(archival-doc) is the author's own and has no public repository. The 290-repo index at
zhuyansen/awesome-claude-video-skills maps the wider field (promo 55,
frameworks 48, explainers 48, editing 41, shorts 36, motion/logo 19, story
and animation 17, music video 8).

The shift these packages represent: the one-line prompt of September is now
wrapped in a process. All three fix the same contract (`window.render(t)`,
deterministic, seeded random, no timers), then add what a prompt cannot
carry: an interview, a plan review, a style library, a QA loop with scores,
and scripts for rendering and audio.

### 9.1 xilo-opus-video (Kianzzz): the most general one

Workflow in SKILL.md: check the environment, ask what to make (an idea, an
article, a product URL, a codebase, or a reference video), propose three
plans that differ on purpose (A safe, B a different visual language, C a
different narrative structure), render a key-frame still or a 2-4 s sample
for each plan, let the user pick, write `brief.md` (a seven-block structured
prompt: role, inputs, direction, structure, build, gotchas, start), then
build shot by shot with three stills per shot for self-checks, render, score,
deliver. Everything lands in `opus-video/<slug>/` with `source/ previews/
brief.md index.html audio/ qa/ out/`.

What is worth copying verbatim:

- **Spring tiers.** One closed-form spring, four parameter tiers, and the rule
  that like elements share a tier within one film:

  | Use | Feel | w | z |
  |---|---|---|---|
  | buttons, toggles, indicator leading edge | fast, crisp | 22-26 | 0.75-0.85 |
  | cards, containers, camera | default | 14-16 | 0.70-0.75 |
  | big type, 3D objects, logo lockup | heavy, almost no overshoot | 9-11 | 0.85-1 |
  | mascots, stickers | lively, visible overshoot | 16-20 | 0.40-0.50 |

- **Code stack table.** Canvas 2D for pixel, flat, hand-drawn, particles;
  HTML/CSS/SVG for UI and type; WebGL shaders for texture passes (CRT, grain,
  halftone) over content drawn elsewhere; Three.js for 3D; p5.brush for
  painterly strokes (slow, measure one frame first); Remotion only for long
  multi-scene pieces or when a product codebase must be read; Manim for math.
  Rule: pick the look first, then the simplest code that makes it; when
  mixing, layer content, texture, sound, each runnable alone.
- **Green-screen characters plus code scenes.** When the user wants real
  people, have a video model generate the person on a pure green background,
  key with `chromakey=0x19FF0A:0.16:0.08,despill=type=green`, build the set,
  type and stickers as a code layer, and overlay with ffmpeg.
- **Hand-drawn feel:** seed stroke jitter with `floor(t * 12)` so lines
  change 12 times a second while the camera stays smooth per frame.
- **Chinese fonts.** Bundle a local font with `@font-face` (the system fonts
  differ per OS), wait for `document.fonts.ready` before `window.ready`,
  and for pixel styles rasterize text on a small canvas and threshold alpha.
- **Self-scoring QA.** After a full render, make a contact sheet and a
  phone-width (360 px) sheet, then score 1-10 on: opening (a hook in the
  first 2 s), phone readability, motion (no linear slides, no dead beats),
  change (something new every 2-4 s), composition (subject size, no empty
  or crowded frame), fidelity to the brief, sound sync. List the three worst
  problems with timestamps, fix, re-render only those seconds, repeat until
  every item is 8 or above. Two or three rounds is normal. Keep a
  `qa/review_log.md`.
- **Default-look warning.** "Dark background, centred big type, everything
  fading in and out" is what appears when nothing constrains the model.
  Name it in the brief's banned list.

Verified here: `render.py` rendered a still and a 2 s clip with four
sub-frames (60 frames x 4 samples in 66 s at 1280x720, PNG screenshots);
`audio_tools.py sfx` synthesized a four-event effects track from a JSON
timeline, `normalize` brought it to -15 LUFS / -0.9 dBTP (the docs warn that
clips under 10 s land 1-2 LU off target), and `check` wrote waveform and
spectrum images so a model that cannot hear can still inspect the mix.
`check_env.py` reported Chromium 141 with WebGL2 and only ffprobe missing.

### 9.2 lemo-opuscar (Lemomo): a style library with a voice pipeline

Forty-three styles (ink wash, ukiyo-e, whiteboard, brick toy, paper pop-up,
tilt-shift, sci-fi sitcom toon, data journalism, mid-century toon, and so
on), each a `STYLE.md` plus a demo film made entirely in code. Installed as
a Claude Code plugin (`claude plugin marketplace add lemomo-ai/lemo-opuscar`).
The skill is a thin hand-off to the library's `AGENTS.md`: one round of
questions in a single message, then `TREATMENT.md`, then style frames or a
model sheet rendered with the real drawing code, then produce.

**The style-prompt format.** `STYLE.md` holds only what is true for every
film in the style, 6-11 KB, with fixed section numbers: 1 essence and what it
is not, 2 materials and rendering, 3 colour logic, 4 type and subtitles, 5
motion quality, 6 camera grammar (a table of move, what it expresses, what
it can serve), 7 sound palette, 8 native moves (each with "fits content
like"), 9 pitfalls of the medium, 10 engine, 11 variation space (three
structures, three openings, three endings). Story, shots, BPM, palette and
props go to `DEMO.md`, which must open with "One example among many. Don't
reuse its story, arc, shots, props or timings." A number measured in the demo
becomes a rule in the style ("the subject fills at least 1/3 of the frame").

Examples of style invariants written as code-level rules:

- Sci-fi toon: "Line width is constant in screen space: transform points to
  screen, then stroke with an identity transform." Line boil: resample each
  outline every ~7 px, displace along the normal with low-frequency noise at
  ~1.7 px, cycle three boil drawings at 12 fps. Characters on twos (12 fps);
  camera, portal swirl and wipes on ones (24 fps). One palette per world,
  3-5 colours, maximally different from the previous world in hue and value.
- Ink wash: a five-tone ink opacity table (焦 .96, 浓 .82, 重 .60, 淡 .34,
  清 .16), one vermilion, never red type.
- Whiteboard: no hands, markers float with a real cast shadow; circles start
  at an angle and overlap past closure.
- Brick toy (3D): ambient occlusion mandatory, supersample 2x, tungsten HDRI
  turns whites orange.

**The pipeline adds voice.** One timeline drives picture, voice, score, foley
and subtitles:

```text
timeline (single source of truth)
   picture:  web page with render(t) -> headless Chrome, frame by frame
   voice:    TTS per line -> speech-to-text check -> word timings
   music:    score from the same timeline (samples + synthesis)
   sound:    procedural foley at event times
   subtitles: .srt + burned-in captions
mix (duck, compress, balance) -> mux, two-pass loudnorm -14 LUFS
```

- Each dialogue line keeps three texts: `text` for the TTS (phonetic
  respellings, "buh, buh-broken"), `sub` for the subtitle, `asr` for what the
  recognizer is expected to hear. Every generated line is transcribed back
  with faster-whisper and regenerated until it matches (character similarity
  at least 0.92 for CJK). Short clips get 0.6 s of silence padding or the
  recognizer mishears them.
- English voices use Kokoro offline, Chinese uses edge-tts. Voices are cast by
  measuring median pitch and variance on test lines; each character gets its
  own EQ. Interruptions are made by generating the line longer and truncating
  the audio.
- Lip sync comes from the audio: RMS (mouth open) and spectral centroid (wide
  versus round) at 24 Hz, sampled at the 12 fps drawing time, driving a
  parametric mouth with open, width, curl, skew, teeth, tongue.
- Subtitle duration is `max(audio + 0.35 s, 0.9 s + chars / 17)`, clipped at
  world cuts and before a silent beat. The burned-in captions and the `.srt`
  come from the same `window.SUBS`. A read-check tool enforces on-screen time
  of CJK chars / 4.5 + Latin chars / 15 + 1.5 s.
- Music cues take their start times from `events.json` so the first beat of
  each cue is the cut point; hard silences also zero the reverb tail
  ("a cut music cue without its reverb tail cut is not dead silence").
  Ducking is a 0.3 s max-filter of voice activity smoothed over 0.15 s,
  music at 0.42 x (1 - 0.55 x duck).

**Directing rules** (DIRECTOR.md): a film is judged in this order, sound,
rhythm, camera, directing. At least two real silences; use sound as a
transition at least twice; at least four different camera moves; blend every
pose with keyframes and easing, never switch poses inside an `if`; at least
four of six dimensions must differ from the demo. The failures seen most:
subject too small or against the edge, colour on the same colour, subtitles
covering the subject, a gag too fast to read, blank frames in transitions, a
timed effect that stops tracking the subject after a camera move.

### 9.3 mg-styles-15 (Vincentwei1021): fifteen motion-design films from one prompt each

Fifteen 10-second films (flat vector, line art, isometric, 3D render,
cel-boil, collage, liquid, morph, Bauhaus, synthwave, aurora glass, variety
show captions, paperclip, pixel, HUD), each with its prompt, full source and
soundtrack script. Every film went through make, review, revise at least
twice with an AI jury and a separate `rubric.md` ("Judge it harshly. Most
first renders deserve 5-7. Do not inflate.").

**The prompt skeleton is identical across all 15 files**; only four sections
change (Style, Output, Suggested technical route, Creative seed) plus a
Chinese block of checkable "signature features and key techniques". The
shared part is the most complete production brief in this study:

```text
You are the director, motion designer, engineer and sound designer of ONE
10-second motion-design film. The goal is the most classic, yet most
stunning form of this style, award-shortlist / high-end commercial quality.
A clean, template-looking result is a fail. Benchmarks: Buck, ManvsMachine,
Ordinary Folk, Giant Ant, Territory Studio, Apple keynote motion ...

# How to work
1. Treatment. One clear idea: a hook in the first 0.5 s (never open on more
   than 0.3 s of empty or black), an escalation, one unmistakable hero
   moment at ~60-75% of the runtime, and a composed end frame held
   ~0.8-1.2 s with living micro-motion. Keep one cue sheet (beats and hit
   times) that both the picture and the sound read from.
2. Key frames before motion. Render stills at 6-10 key times and actually
   look at them. Each still should be poster-worthy ... Iterate until nothing
   looks default, generic, cramped or "AI-template".
3. Motion. Preview at low resolution. Step through the fastest moves frame
   by frame: spacing, easing, arcs, overlap, anticipation and follow-through.
4. Sound. Genre-correct music and sound design locked to the cue sheet.
   Check that visual hits land on audio onsets. Master to the output spec.
5. Final. Check: exactly 10.00 s, resolution, fps, audio present and at the
   right loudness, no black frames, no fallback fonts or tofu, no clipped
   elements, no shimmer on thin lines, no gradient banding.
6. Write an honest self-critique.

# Before you deliver, score yourself honestly
1-10 on style fidelity, concept wow, motion craft, design and typography,
finish and texture, sound and sync, technical (6 = template-level, 8 =
high-end agency, 9 = award shortlist). Aim for 9; fix whatever scores
lowest first.
```

Output spec is fixed: exactly 10.000 s, H.264 with stereo AAC at 48 kHz,
-14 LUFS integrated, true peak at most -1 dBTP; 1920x1080 at 30 fps, except
cel and 3D at 24 fps and the caption film at 1080x1920. Assets must be CC0,
public domain, OFL or Apache, recorded in CREDITS.md; brand names invented.

Style-specific "key techniques" are written so a jury can check them. Three
examples:

- Cel-boil: animate on twos at 24 fps (12 drawings per second), cut to ones
  for fast actions, threes for holds; smear frames stretch a fast-moving
  object 150-300% for exactly one frame; line boil is 3-4 slightly different
  drawings cycled; paper grain multiplied at 10-15%.
- 3D render: a MoGraph-style cloner field with effector waves; material trio
  of subsurface gummy, glossy plastic, frosted glass or chrome; long-tail
  ease where 80% of the travel happens in the first 20% of the time;
  24 fps with shallow depth of field.
- Variety-show captions (花字): three-layer text (fill, thick white stroke,
  coloured outer stroke or shadow); pop 0 -> 1.15 -> 1.0 in about 8 frames
  with a 2-frame per-character stagger; appear 2-3 frames after the audio
  moment, which reads more natural than exactly on it.

**Harness.** `harness/render.mjs` expects `window.renderAt(t)` and
`window.__ready`, seeks any CSS or WAAPI animations to `t` as well, gives
each worker its own browser ("pages inside a single browser share one
compositor and don't parallelize"), writes lossless FFV1 segments and
concatenates them, and encodes with BT.709 tags and `-crf 14`. Motion blur
is sub-frames centred in a shutter window, averaged by `tmix`; morph and
line art use 4 samples, Bauhaus 8, the rest 1. Bauhaus snaps time to frame
centres so sub-samples never straddle a hard cut.

**Audio library.** `lib/audio/mgaudio`: polyBLEP oscillators, FM,
Karplus-Strong, 103 CC0 instrument samples, genre recipes (synthwave,
chiptune, lofi, guofeng, variety, explainer...), about 100 effects, and
loudness-normalized one-shots. The rule that matters: every sound has a
sync point (transients sync on the hit, a whoosh on its pass-by peak, a
riser on its end), so scripts pass the visual event time and never
pre-compute offsets. `hit_alignment()` reports onset error per hit (target
within 5 ms). Pictures mickey-mouse the music: one xylophone note per title
stroke, music muted 0.11 s before the big hit, a phone-speaker band check
(350 Hz to 9 kHz) so the boom still reads on a phone. Data also flows back:
the aurora film writes a 100 Hz loudness envelope that drives an on-screen
waveform, and the line-art film dumps pen-tip speed from the page for the
audio script.

**Techniques worth lifting from the demos:**

- Cel-boil: an exposure sheet `[[0, 8, 2], [8, 24, 1], ...]` (from, to,
  exposure) quantizes time to drawings; every primitive is re-seeded per
  drawing, which is what makes lines boil; fills are boiled separately and
  offset by (-5, 4) px to mimic hand colouring; the paper tooth texture is
  larger than the frame and shifted per drawing, "every cel is a new sheet";
  title glyph outlines come from the font via opentype.js and are inked as
  boiling strokes.
- Morph: no morph library. Shapes are SVG paths sampled to a fixed point
  count with `getPointAtLength`, same winding, start vertex matched by
  brute-force cyclic shift, then lerped through a bridge circle (A -> circle
  -> B) so unrelated shapes never tangle; holes collapse to their centroid
  and re-open; stretch along the travel direction and a landing squash about
  a pivot; colours mixed in OKLab.
- 3D: all motion is simulated in plain Python (contact ODE for drops, damped
  oscillator for jelly squash, gaussian effector sweeps for the cloner field)
  into `anim.npz` plus `events.json`; Blender only keyframes from that file
  and renders PNGs with Cycles; an HTML page composites the type, a hero
  punch and grain on top. Renders write `.tmp.png` then atomic rename.
- Synthwave: a VHS shader pass (YIQ, chroma blur, red smear trailing right,
  tracking band, head-switch noise, 3-px scanline dimming, CRT power-off) and
  a time remap to 15 fps "while tracking".
- Pixel: an indexed 320x180 frame with semantic colour slots mapped through
  a per-stage LUT into a 32-colour master palette, Bayer dithering, WebGL2
  CRT pass at 6x.
- Collage: `K = floor(t * 12)` step index with seeded placement jitter;
  resting pieces boil at 6 fps.

**Lessons the author wrote down.** "The same prompt makes a different film
every time. Each original film went through several rounds of iteration; a
single run usually does not reach the same finish." Only 4 of 15 soundtrack
scripts reproduce the published audio bit for bit; the others drift with
numerical library versions. Fonts are not shipped, so without them lettering
falls back to system fonts.

### 9.4 dashi-animationstyle (chuspeeism / 大师的AI小灶): narrated explainers in seven styles

Skill number 4 in the post. It turns a 15-60 s Chinese narration into a
1920x1080, 30 fps explainer with voice and subtitles, ready to drop into
CapCut. Picture is HTML/Canvas only, no image model. Seven tested styles:
flat flowchart, hand-drawn notes, retro newspaper, retro paper cut,
surreal collage, 3D cartoon, black-gold tech; plus a style dictionary of 27
more described as parameters.

Three ways to use it: an existing style on your narration; a new style built
from one reference image or video (2-4 rounds of stills, not guaranteed: the
author kept 7 of 11 attempts); or a verbal description ("a warm chalkboard
look") answered with 2-3 directions as stills.

Pipeline, all in one project folder: narration audio, whisper transcription
corrected against the script (it detects words in the audio that are not in
the script, usually neighbour sentences caught when the clip was cut, and can
trim them automatically), character-level subtitle timing, a storyboard
written by Claude and approved by the user, a generated `window.TL` timeline,
a page copied from the style template and rewritten shot by shot, three
stills approved by the user, the full render, then checks.

The design idea worth copying: **time comes from words, not seconds.**
`marks` name a phrase in a given subtitle line; the timeline generator
converts it to a second from the character timings, and the page asks
`TL.mark('分词器')`. No hard-coded seconds, so re-recording the narration
re-times every animation.

Rules backed by sources or measurement (`knowledge/讲解动画通用规则.md`):

- Subtitles at least 60 px, one line, about 20 characters. Any text the viewer
  must read at least 48 px at 1920 wide, because on a phone it shrinks to
  about 480 wide. Every still render also writes a 480-wide check image.
- Contrast 4.5:1 for text (WCAG 1.4.3), 3:1 for graphics; computed on the
  worst spot of a textured background.
- Bottom ~170 px is subtitle-only; title-safe margins 5% (EBU R 95).
- Two fixed highlight colours A and B for the two core nouns, used in
  picture, data and subtitles alike; other colours avoid their hue families.
- Dwell time: characters / 9 per second + ~0.5 s (from Netflix's Simplified
  Chinese spec); hold at least 1 s after a conclusion or stamp.
- Motion starts 0.03-0.1 s before its keyword; letter-by-letter text needs
  about 0.3 s after the keyword before a still shows the full word.
- No more than 3 flashes per second (WCAG 2.3.1).

Richness rules from a blind test (`knowledge/动效和画面变化.md`): every shot
lists entrance, main action, secondary action, exit or transition; a visible
change every 2-3 s (calibrated on shot lengths of a popular Chinese tech
channel, median 2.8-3.4 s), the first 3 s densest; secondary motion of
2-6 px, 1-3% scale, 1-2 degrees on 1.5-4 s periods, at most two kinds at
once; at least 3 transition types, never the same one 3 times in a row, and
transitions that suit the material (paper falls and tears, chalkboards get
erased, screens glitch, newspapers turn). A script measures this: one cell
every 2.5 s, mean pixel difference between neighbours, pass at 10 or more
with no near-identical pair. In the blind test, the version with the higher
score was the one the author judged richer in all three pairs.

A gotcha worth remembering: reset the whole canvas state at the start of
every frame. A `lineCap`, `setLineDash` or `globalAlpha` left over from the
previous frame is invisible in a sequential render but changes a single
still; three of the author's own example pages had this bug. The skill ships
a determinism check that compares "seek directly" against "seek elsewhere,
then come back" at three times.

Verified here: the bundled Token example in the hand-drawn-notes style was
created, three stills rendered in 6.6 s, and the full 21.2 s film rendered
in 165 s (259 ms per frame, software rendering). The richness check passed
with a mean of 29.0, no near-identical pairs, 100% of frames moving. On
Linux the macOS fonts fall back to WenQuanYi, and Chrome needs
`--no-sandbox` when running as root.

### 9.5 code-video-director (same author): motion feel you can measure

Not confirmed as part of the post, but by the same author and the most
technically ambitious of the set. It finishes unattended: "don't stop to
ask; when unsure pick the safer option and record the trade-off." Steps:
director sheet, route choice and one test frame, sound first (beats or
narration timing), storyboard with a per-shot event table, three-pass build
with locked layers, stills plus a 4 s motion sample, full render, automated
QA and a rework loop of at most three rounds, delivery notes.

What it adds that nothing else in this study has:

- **A motion analyzer.** A numpy optical-flow script removes camera motion,
  splits moves, and measures peak speed, move length, whether a move starts
  fast and ends slow, wobble area, how often the camera is moving, the spread
  of move durations, and cyclic repeats. Ten rules with thresholds calibrated
  on reference films, each with a fix that names a template helper. The
  diagnosis that motivated it: a weaker model's moves averaged 1.13 s at
  219 px/s peak with the camera always pushing; the reference averaged
  0.33 s at 963 px/s with peak speed in the first quarter of the move.
- **Pacing tiers.** Calm, promo and MV, each with its own thresholds, and
  switchable per section ("0-12 s promo, MV from 12 s").
- **Events, not cycles.** Pin each action to `ev(bar, beat)` so it happens
  once; escalate repeated hits with `ramp()`; `t % period` only for blinks,
  sparks and scrolling backgrounds. A detector flags looped main actions and
  storyboards where 30% of rows repeat the same sentence.
- **Layer locking.** Main action, auxiliary motion and impact effects are
  separate files, built and measured in three passes. Locking a layer records
  its file hashes and metrics; a relock is refused if a metric regresses by
  more than 10%, and the self-check puts "locked layer modified" at the top
  of the rework sheet. This stops the see-saw where every fix quietly breaks
  something that already passed.
- **A director sheet written to be judged.** Each hard requirement is the
  user's exact words beside a result that can be checked as right or wrong,
  with a tick box before delivery. Style is named and has a "must not appear"
  list. Motion chain: anticipation, acceleration, impact, squash or
  overshoot, settle, aftershock.
- **Sound alignment.** Song start = climax time in the song minus climax time
  in the film. Trust the low-frequency energy jump over an automatic beat
  grid. Narration is synthesized sentence by sentence and the scene changes
  0.1-0.2 s before the sentence starts.
- **Anti-slideshow composition checks**: dominant-colour share, correlation
  of edge layouts between frames 3 s apart, adjacent-second similarity.

### 9.6 huashu-art-motion (alchaincyf): art history as a renderer library

Skill number 5 in the post. It began as a code-only remake of a 15-second
"Art History Speedrun" and grew into a Canvas engine with 35 art-style
renderers and 9 explainer grammars.

**The speedrun mechanism.** One composition (a woman drinking tea, an orange
cat, a table, a window) and one character skeleton are drawn by N different
renderers. Consistency comes from the shared rig and choreography; the style
comes from swapping the renderer. The index warns that this shared room is
"the speedrun mechanism, not these styles' composition".

**Styles.** 17 "material layer" styles usable on any topic (Van Gogh,
Impressionism, Seurat, Ghibli watercolour, Chinese ink, Lichtenstein pop,
8-bit, vaporwave, Shinkai light, Rembrandt, cubism, Matisse cut-outs, flat
2026, Constructivism, Bauhaus, Pompeii mosaic, early ray-trace CGI) and 18
"era specimens" (cave, Egyptian tomb, Attic black-figure, Gothic
illumination, Renaissance sfumato, Mucha, Klimt, Munch, Dunhuang, Kusama,
Dalí, Hopper, Kirby comics, Monet, Haring, 1930s rubber-hose, Chinese shadow
puppet, Picasso blue period). Each recipe card records pipeline, hex values,
"how the painting lives" (motif animation), a signature transition,
performance, pitfalls and what is still weak, with frame-difference
measurements from each revision.

Rendering ideas worth copying from the recipes:

- **The material's physical process is the renderer.** Cave: a noise relief
  wall with lighting, pigment "eaten into rock" with a rock texture over it,
  charcoal boil from 9 Hz pattern jitter, firelight as an overlay blend.
  Ink: paper is the ground and ink only adds; brush resampled every 4 px of
  arc length with a pressure profile and bristle gaps; whites dug out with
  `destination-out`. 8-bit: everything painted on a 240x135 canvas and
  upscaled 8x without smoothing; dithering is "the only way the NES made
  gradients"; characters are rasterized per body part, quantized to a
  14-colour palette and outlined per part, or the parts merge into a blob.
- **A transition is the next style's signature language.** Two independent
  reviewers called this the most valuable line in the skill: enter
  Impressionism through dabs, Post-Impressionism through a swirl, Art
  Nouveau through an organic wipe, Gothic through a page turn.
- **Region palettes beat colour jitter**: a 7-8 colour swatch per region.
- **Fix the flicker, keep the life.** The first Impressionism pass reshuffled
  every stroke every 7-8 frames (frame difference 18, read as flicker); the
  fix pinned stroke positions with a per-cell hash and moved the "aliveness"
  into local motion (light dapples, poppies, clouds).
- **Two frame-rate layers**: the camera moves smoothly every frame while
  drawn elements step on twos or threes.

**Rhythm.** 128 BPM on an eighth-note grid; era lengths shrink
6, 4x5, 3x3, 2x3, 1x3, then a long ending: "speed comes from shorter
segments, not a faster tempo". A three-note motif is re-orchestrated for each
era. Hard onsets, no crossfades, no whooshes. The ending runs stop, suspend,
smash, react, close.

**Workflow.** Two tiers by model: an "open" tier for the strongest model,
which may combine libraries freely, and a "rail" tier for every other model:
shot table with three lock lines (style, palette, characters), a lint that
blocks coding until it is clean, one clip per shot (at most 8 s), concat,
QA per shot, and a delivery script that refuses to copy the film on a red
light and writes a fingerprinted facts section. New characters or styles go
through a three-direction gate with different compositions, "even when the
style is named". An independent reviewer that sees only the finished film is
mandatory; it caught a character raising a cup five times and a frame with
two heads.

**Characters.** "People come from AI frames; code composites." Code never
draws faces or robots; the options are a frame library (8 transparent PNGs per
action generated on green and keyed), hands and backs only, or none.
Code-drawn chibis, white-shell robots and faces on objects are banned unless
a designed mascot passed the three-direction gate.

**Calibrated gates.** A film gate reports red when fast-motion frames are
under 3.5% (calibrated on 13 films the author rated), when a blank run of
0.3 s or more appears mid-film, or when blue-purple frames reach 30%
(calibrated on 88 films, an "AI look" detector). Lesson: "the QA tools must
themselves be QA'd"; an earlier checker was all green while never executing
the transitions.

**Camera.** Named moves with numbers: slow push 0.6-1.5 s, punch 0.25-0.35 s
at 18-32%, whip 0.26-0.30 s, slam 0.17 s at scale 1.55 -> 0.94 -> 1.0.
Accents at most a third of shots, never three push-ins in a row, a warning at
8 or more push-ins per minute: "moving a bit every shot and slow-pushing every
shot are the same disease" (one 102 s film had about 48 push-ins).

**Explainer grammars.** 3Blue1Brown (one object on pure black, transforms,
colour as the concept's name), keynote UI, finance chart (axes, then data,
then one annotation, values honest), Kurzgesagt (the concept becomes an
object, the camera travels between scales, log-space zoom), Vox (an evidence
desk, the camera as an investigator's eye, elements stepping at 12 fps over a
24 fps camera), whiteboard (say a line, write a line), storytime (snap poses,
hold the reaction), kinetic type (the words are the actors), presenter.
Each card was written after measuring 2-5 reference films.

**Voice.** Reuse existing audio, the macOS system voice, or a Volcengine
voice clone; keys referenced by environment variable name only, cloud and
paid calls default to "ask". Cues name a word, not a second.

Verified here: twelve style stills rendered from the gallery film and the
14.4 s main film rendered at 30 fps (431 frames in about 210 s, software
rendering), then muxed with the repo's synthesized example score. The score
is a standalone example and drifts by one eighth note after the ninth
segment, because its segment table has one more three-eighth era than the
film.

### 9.7 wtt-code-animation-studio (WaterDJiang): from a script, with provenance locks

Skill number 6, a folder in the WaterDJiang/Wattter_openSkills collection.
Pipeline: content, script, style recommendation and choice, storyboard and
assets, voice timing, frame-by-frame drawing, MP4, audio and picture QA.

- **Script first, by input type**: an idea becomes dilemma, attempt, result;
  a product becomes task, capability, value; science becomes problem,
  mechanism, example, application; a poem becomes imagery, change, emotional
  landing. Named failure: a long article turned into a subtitle slideshow.
- **The one approval that cannot be skipped is style**, placed after the
  script and before the storyboard: one recommendation and two alternatives
  compared on the same key shot, with the user's own words recorded. "Run it
  all" does not count as consent, and silence never times out into a
  default. If the user picks B, do B.
- **Four independent visual axes per scene**: subject, style, motion
  (action and effect), renderer. One shared silhouette feeds the flat body,
  the sand mask and the particle targets, and the pose follows the global
  frame, so a character keeps its identity and motion phase when the style
  changes between shots.
- **Audio sets the length**: `frames = max(ceil(visual x fps), lead + voice +
  tail)` with the voice duration measured from the real WAV. A mismatch
  between the voice file's recorded text and the script fails loudly. It
  never speeds up the voice to fit a limit; it reports what to cut.
- **Recipes**: sand draws the full outline offscreen and reveals it through a
  time-varying mask, with grain fixed by seed; particles lerp from source to
  target per index and never re-pair nearest points per frame; pixel draws
  low-res and snaps poses to the grid; chalk uses broken multi-layer strokes
  over a fixed powder texture. Only flat, sand and particles are implemented;
  the other seven catalogue styles are implemented per film.
- **Determinism test**: render frame f, render an unrelated frame, render f
  again, compare hashes, at five points of the film.
- **Asset provenance**: every image, font, sound, voice file, music track and
  vendored library is registered with source URL and licence, sealed into a
  versioned history with hashes, and any change goes through a diff plus an
  authorization file. The render server refuses unregistered files and
  files whose hash changed, and blocks any request to another origin.
- **Offline voice cloning** with a local TTS model, enforced by an audit hook
  that raises on any network connection; each voice file carries a sidecar
  noting that a human still has to listen to it.

macOS-centric (system `say`, an Apple-silicon TTS model). Not run here.

### 9.8 video-shotcraft (Vincentwei1021): product promos from the real product

Skill number 7. Remotion-based, for turning a web page or front-end project
into a promo with 2.5D camera moves.

- **Capture the real product, not a redraw.** Start the dev server with fake
  but realistic data ("empty databases and lorem ipsum are scrap; real
  customer data cannot ship"), then capture a full-page 2x texture, element
  cutouts with transparent backgrounds, an "empty plate" with the element
  hidden (the backplate a fly-in lands on), a 4x shot of the hero element,
  and a `layout.json` of element boxes in page coordinates. Every animation
  targets those coordinates, so a flying row lands exactly in its real slot.
  Visual tokens come from the product's own design system.
- **124 shot recipe cards** in ten categories (opening, camera, transition,
  typography, UI entrance, interaction, data, light and emphasis, rhythm,
  outro), each with intent, motion core, a parameter table of "typical value
  / tuning feel", known pitfalls and a reference demo. "The card gives the
  semantics; the demo source is the parameter truth": never rewrite an
  approximation from the card name. Example, row embed: rows drop from the
  air, `rotateX` flattens them, a 2 px accent seam flashes once at the moment
  of contact, the flying row is a crop of the screenshot (never re-rendered,
  because re-rendered text visibly differs), and cue spacing is computed
  backwards from when the last row must land.
- **The 2.5D camera** keeps text sharp by using CSS `zoom` instead of `scale`
  inside a perspective container (`scale` makes Chromium rasterize the 3D
  layer at layout size and upscale it, which blurs text); translate solves to
  `960 / zoom - cx`. "Depth of field is atmosphere, never the fix for
  sharpness." Parallax uses one drive value times per-layer factors 0.35,
  0.7, 1.4, and the rail is computed backwards so the hero card stops
  centred. Full-screen live blur roughly triples render time.
- **Beat sync measured, not trusted**: a librosa beat track refit by least
  squares because the tempo estimate can be off by 2% (129.2 against a true
  131.97), residual within 15 ms, and a post-render check that the cuts still
  land within 3 frames. Encoder priming in AAC (about 1.28 frames at 48 kHz)
  is corrected as one constant. At most three whole-frame beat hits per film,
  16 beats apart. Sound starts only after picture lock; SFX positions are
  written relative to shot starts, never as bare frame numbers.
- **A case-law rulebook**: each rule carries the user's real complaint and a
  self-check. An independent reviewer runs in a clean context and must cite
  frame numbers. CI renders the first frame of every demo. In one library
  refresh, 66 demos were retired after an original, polish and redesign
  comparison found the polished versions "clean but bland".
- Ships an editable project, a BGM and no-BGM version from one timeline, and
  an optional export to a CapCut (JianYing) draft.

### 9.9 archival-doc (the post's author)

Skill number 8, which the author wrote: it does not draw. It finds public
domain and Creative Commons historical footage, checks each item's licence,
and cuts a documentary. No public repository was found; the screenshot shows
no link. Related public work for the same idea: the Internet Archive's own
Claude skill for search and download, and documentary pipelines that search
archive.org, NASA and Wikimedia Commons with licence filters.

### 9.10 What the eight packages agree on

- Interview first, one round, then a written plan (`brief.md`,
  `TREATMENT.md`, a storyboard, shot table or director sheet, a cue sheet)
  that the model follows and the user can reuse. Style is the decision most
  often reserved for the user, compared on the same key shot.
- Key frames before motion. Render 3-10 stills, look at them, fix layout.
  Several also render a phone-width check image.
- One timeline file feeds picture, sound and subtitles. Sounds are placed at
  visual event times with a sync point. The narration-driven packages anchor
  animation to words, and audio length sets shot length.
- A scored self-review, the lowest score fixed first, two or three rounds
  expected. The strongest packages turn taste into calibrated scripts
  (richness, motion feel, AI-look colour, blank runs) and use an independent
  reviewer that sees only the finished film and cites frame numbers.
- A banned list that names the default look: dark or blue-purple gradient
  background, centred big type, everything fading in and out, a slow push in
  every shot.
- Code is good at rules (type, charts, UI, pixel, painterly media); people
  and photoreal scenes come from image or video models on green, keyed and
  composited by code.
- Deliver the MP4, the source, a report of check numbers, and an honest list
  of weaknesses.

## 10. Sources

- https://github.com/yihui-dev/awesome-opus5-5-videos (389 prompts)
- https://github.com/SuhaasNv/claude-opus5.5-video
- https://github.com/nathankochera/opus-5.5-motion-graphics-2046
- https://github.com/JohnHeibel/PDoomVideo and https://github.com/JohnHeibel/ClaudeAnimationBase
- https://github.com/Lob0Garou/opus-visual-motion-engine
- https://github.com/Barty-Bart/motion-graphics
- https://github.com/diggerhq/shipvideo
- https://github.com/remotion-dev/skills
- https://github.com/Kianzzz/xilo-opus-video (skill: three plans, previews, brief, scored QA)
- https://github.com/lemomo-ai/lemo-opuscar (43 style prompts, voice and subtitle pipeline)
- https://github.com/Vincentwei1021/mg-styles-15 (15 films, prompts, harness, audio library)
- https://github.com/zhuyansen/awesome-claude-video-skills (290-repo index, security-graded)
- https://github.com/chuspeeism/dashi-animationstyle (narrated explainers, 7 styles, word-anchored timing)
- https://github.com/chuspeeism/code-video-director (motion analyzer, pacing tiers, layer locking)
- https://github.com/alchaincyf/huashu-art-motion (35 art-style renderers, 9 explainer grammars)
- https://github.com/WaterDJiang/Wattter_openSkills (folder wattter_skills/wtt-code-animation-studio)
- https://github.com/Vincentwei1021/video-shotcraft (product promos, 124 shot recipe cards, 2.5D camera)

### Community examples quoted or studied

| Creator | Category | Tech | Original post | Original vs remake |
|---|---|---|---|---|
| @ajith_io | motion | canvas | https://x.com/ajith_io/status/2103449416325890146 | https://skillry.dev/ai-videos/opus-5-5/ajith-io-890146 |
| @lukasersil | 3d | threejs, shader, canvas, svg | https://x.com/lukasersil/status/2103742861971726495 | https://skillry.dev/ai-videos/opus-5-5/lukasersil-726495 |
| @Dannnnnok | 3d | threejs, canvas | https://x.com/Dannnnnok/status/2103846630088716687 | https://skillry.dev/ai-videos/opus-5-5/dannnnnok-716687 |
| @twoclipping | motion | svg | https://x.com/twoclipping/status/2103273003555402193 | https://skillry.dev/ai-videos/opus-5-5/twoclipping-402193 |
| @twoclipping | 3d | canvas | https://x.com/twoclipping/status/2103835273813496100 | https://skillry.dev/ai-videos/opus-5-5/twoclipping-496100 |
| @verbove | explainer | canvas | https://x.com/verbove/status/2103483957266268381 | https://skillry.dev/ai-videos/opus-5-5/verbove-268381 |
| @TheGrootDev | motion | svg | https://x.com/TheGrootDev/status/2103516567824966114 | https://skillry.dev/ai-videos/opus-5-5/thegrootdev-966114 |
| @brainextends | motion | shader, svg | https://x.com/brainextends/status/2103801834930606193 | https://skillry.dev/ai-videos/opus-5-5/brainextends-606193 |
| @Gdgtify | motion | canvas | https://x.com/Gdgtify/status/2103458245213929495 | https://skillry.dev/ai-videos/opus-5-5/gdgtify-929495 |
| @HowDevelop | motion | canvas | https://x.com/HowDevelop/status/2103840883812733090 | https://skillry.dev/ai-videos/opus-5-5/howdevelop-733090 |
| @deedydas | explainer | svg, gsap | https://x.com/deedydas/status/2102787937482252537 | https://skillry.dev/ai-videos/opus-5-5/deedydas-252537 |
| @Ror_Fly | explainer | canvas | https://x.com/Ror_Fly/status/2102853258582880547 | https://skillry.dev/ai-videos/opus-5-5/ror-fly-880547 |
| @koldo2k | explainer | canvas, ai-image | https://x.com/koldo2k/status/2103129343253778767 | https://skillry.dev/ai-videos/opus-5-5/koldo2k-778767 |
| @op7418 | interactive | threejs, shader, canvas, gsap | https://x.com/op7418/status/2103724883301814408 | https://skillry.dev/ai-videos/opus-5-5/op7418-814408 |
| @zacxbt | interactive | canvas, pixel, playable | https://x.com/zacxbt/status/2103808699466944604 | https://skillry.dev/ai-videos/opus-5-5/zacxbt-944604 |
| @MandelDuck | interactive | threejs, shader, canvas | https://x.com/MandelDuck/status/2103802923465768972 | https://skillry.dev/ai-videos/opus-5-5/mandelduck-768972 |
| @gandamu_ml | interactive | threejs, shader, canvas, audio | https://x.com/gandamu_ml/status/2102919394775220530 | https://skillry.dev/ai-videos/opus-5-5/gandamu-ml-220530 |
| @LexnLin | interactive | threejs, shader | https://x.com/LexnLin/status/2103194052850241739 | https://skillry.dev/ai-videos/opus-5-5/lexnlin-241739 |
| @alexwtlf | motion | canvas | https://x.com/alexwtlf/status/2103713416367981005 | https://skillry.dev/ai-videos/opus-5-5/alexwtlf-981005 |

All 389 prompts: `prompts/*.md` and `data/videos.json` in yihui-dev/awesome-opus5-5-videos.
