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

## 8. A synthesized prompt template

```text
<inputs>
Ask me for: the subject and a one-line promise, 8-12 moments or UI states,
real data for each, brand colors and fonts, formats (16:9 / 1:1 / 9:16), and a
royalty-free song around 120 BPM (or say "synthesize the score").
</inputs>

<direction>
Studio-grade motion design. State the taste bar in one sentence (e.g. Apple
keynote launch film, Dribbble-level UI motion, kinetic typography monument).
Springs with a tiny overshoot at most. The camera reframes so each moment
fills the frame. Last frame = first frame.
Banned: crossfades, blur-ins, particle bursts, glows, lens flares, camera
shake, gradients on UI chrome, holds over 1 s, dead time, anything that looks
like a template, text too small to read.
</direction>

<structure>
120 BPM, N bars, something happens on every beat. List the beats.
</structure>

<build>
1. One self-contained HTML file. window.DURATION and async window.seek(t).
   Every value computed from t: no CSS transitions, no timers, no rAF, no
   state carried between frames, seeded randomness only.
2. Closed-form springs; sum one spring per target change.
3. Outgoing content leaves before incoming content enters the same space.
4. If a song is supplied, measure its beat grid with numpy and start on a
   downbeat; otherwise synthesize the score from the renderer's event list.
5. Render with Playwright at 60 fps, 4 subframes per frame blended with
   ffmpeg tmix. H.264, yuv420p, crf 18, faststart. Export every format.
6. Before the full render: one frame per beat as a contact sheet. Fix
   anything cramped, unreadable, off-grid or overlapping. Then scan the final
   video for single-frame pops (frame-difference spikes 3x their neighbours).
</build>

<gotchas>
No will-change on anything the camera scales. Floods overscale past the
corners over ~0.3 s. Text inside a morphing container has its own mask and
timing. Export [0, duration) without the endpoint frame.
</gotchas>

<start>
Ask me for the inputs, then show the beat map and 4 stills before writing the
full film. Deliver the MP4, the source, and the list of tunable parameters.
</start>
```

## 9. Sources

- https://github.com/yihui-dev/awesome-opus5-5-videos (389 prompts)
- https://github.com/SuhaasNv/claude-opus5.5-video
- https://github.com/nathankochera/opus-5.5-motion-graphics-2046
- https://github.com/JohnHeibel/PDoomVideo and https://github.com/JohnHeibel/ClaudeAnimationBase
- https://github.com/Lob0Garou/opus-visual-motion-engine
- https://github.com/Barty-Bart/motion-graphics
- https://github.com/diggerhq/shipvideo
- https://github.com/remotion-dev/skills

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
