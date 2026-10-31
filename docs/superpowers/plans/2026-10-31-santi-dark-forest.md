# 三体·黑暗森林打击 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 2:59.7 code-rendered film of the droplet's Doomsday Battle and the Singer's dual-vector foil, with natural Mandarin narration over the Pixabay track "Interstellar Space Travel".

**Architecture:** The film follows the existing pipeline: voice → plan → render → music → mux. `voice.py` gains a CosyVoice branch. `plan.py` snaps hand-read music anchors to real onsets and writes `timeline.json`, which the `seek(t)` canvas film reads. `music.py` passes the untouched track through `narrated.mix()`.

**Tech Stack:** Python 3 + numpy (via `uv`), DashScope SDK (`dashscope`), Node + Playwright (`scripts/render.mjs`), ffmpeg, Canvas 2D.

Spec: `docs/superpowers/specs/2026-10-31-santi-dark-forest-design.md`

## Global Constraints

- Film directory `films/2026-10-santi-dark-forest/`; outputs in `out/` named `santi-dark-forest.*`.
- 1920×1080, 60 fps, duration exactly the track: 179.7 s.
- Frame contract: `window.DURATION`, `async window.seek(t)`, every value a pure function of `t`. No `requestAnimationFrame` in the render path, no `Date.now()`, no unseeded `Math.random()`.
- Narration: `cosyvoice-v3-plus`, voice `longanyang`, DashScope intl websocket `wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference`, key from `$DASHSCOPE_API_KEY`, never printed.
- Music: `out/santi-music/interstellar-space-travel.mp3`, untouched and never committed; source https://pixabay.com/music/main-title-interstellar-space-travel-141121/
- No MIDI score and no cut "pings".
- Chinese type in `"Songti SC"`; on-screen text ≥ 26 px.
- The droplet belongs to Trisolaris, the foil to the Singer. The film never mixes them up.
- Master at -14 LUFS ±0.5, ≤ -1.5 dBTP.
- Commit only with the user's OK.

## Files

| File | Responsibility |
|---|---|
| `scripts/voice.py` (modify) | add the `engine: "cosyvoice"` branch; the OpenAI path stays unchanged |
| `films/2026-10-santi-dark-forest/narration.json` | the 11 Chinese lines |
| `films/2026-10-santi-dark-forest/plan.py` | anchors → onset snap → scenes/cues/lines/subs/cards → `timeline.json` |
| `films/2026-10-santi-dark-forest/film.src.html` | the `seek(t)` film |
| `films/2026-10-santi-dark-forest/music.py` | decode track → `narrated.mix()` |
| `package.json` (modify) | `santi`, `santi:sheet`, `santi:check` |

### timeline.json (the interface between plan.py and the film)

```json
{
  "estimated": false, "bpm": 120, "duration": 179.7,
  "scenes": {"open": 0, "fleet": 11.0, "drop": 25.0, "ember": 48.0, "foil": 74.0,
             "fall": 83.0, "paint": 117.0, "escape": 142.0, "back": 157.0, "end": 169.0},
  "cue": {"title": 11.0, "kills": [29.0, 34.0, 38.0, 43.0], "flick": 74.0,
          "planets": [88.0, 95.0, 102.0, 109.0], "sun": 117.0, "earth": 123.0},
  "lines": [{"id": "forest", "start": 2.0, "dur": 4.1, "text": "…"}],
  "subs":  [{"t0": 2.0, "t1": 3.9, "zh": "宇宙是一座黑暗森林"}],
  "cards": [{"t0": 11.0, "t1": 22.0, "kind": "title", "text": "黑暗森林"}]
}
```

The numbers above are the unsnapped anchors; plan.py replaces them with snapped values. `bpm` is written by `Planner.write` and is not used here.

---

### Task 1: CosyVoice narration

**Files:**
- Modify: `scripts/voice.py` (`speak()`)
- Create: `films/2026-10-santi-dark-forest/narration.json`

**Interfaces:**
- Produces: `films/2026-10-santi-dark-forest/voice.json` = `{"voice", "lines": [{"id", "text", "dur", "phrases": [[s, e], …]}]}`, plus clips in `out/2026-10-santi-dark-forest.voice/<id>.wav` (48 kHz mono). This is the same shape the OpenAI path writes.

- [ ] **Step 1: Write narration.json**

```json
{
  "engine": "cosyvoice",
  "model": "cosyvoice-v3-plus",
  "voice": "longanyang",
  "rate": 0.92,
  "lines": [
    {"id": "forest", "text": "宇宙是一座黑暗森林。每个文明，都是带枪的猎人。"},
    {"id": "fleet",  "text": "人类倾尽两个世纪，造出两千余艘恒星级战舰。它们列成方阵，等待着眼中弱小的敌人。"},
    {"id": "drop",   "text": "但它们面对的，是一滴水。"},
    {"id": "ember",  "text": "片刻之间，方阵熄灭了。"},
    {"id": "singer", "text": "在更高的地方，另一个文明只是瞥了一眼。它取出一片二向箔，像丢掉一张纸条。"},
    {"id": "quote",  "text": "毁灭你，与你有何相干。"},
    {"id": "fall",   "text": "空间开始跌落。三维，正在坍缩成二维。海王星、土星、木星……一个接一个，被拍进一幅无限精细的画里。"},
    {"id": "earth",  "text": "地球，连同它全部的历史，成了画中的一道纹路。"},
    {"id": "escape", "text": "只有一艘光速飞船，逃出了这幅正在合拢的画。"},
    {"id": "back",   "text": "回头望去，太阳系，已经是一幅画。"},
    {"id": "end",    "text": "给岁月以文明，而不是给文明以岁月。"}
  ]
}
```

`rate` is a taste knob (CosyVoice `speech_rate`, 0.5–2). 0.92 slows the delivery slightly for weight.

- [ ] **Step 2: Add the CosyVoice branch to `speak()` in scripts/voice.py**

Replace the fetch inside `speak()` (from `req = {...}` through the `except` block) with:

```python
def speak(text, voice, dest):
    """Fetches one clip as 48 kHz mono WAV unless the same request is already cached."""
    cosy = spec.get("engine") == "cosyvoice"
    req = {"model": spec["model"], "voice": voice, "input": text, "instructions": spec.get("instructions", ""), "response_format": "wav"}
    if cosy: req = {"engine": "cosyvoice", "model": spec["model"], "voice": voice, "input": text, "rate": spec.get("rate", 1.0)}
    tag = hashlib.sha1(json.dumps(req, sort_keys=True).encode()).hexdigest()[:12]
    raw = cache / f"{dest}.{tag}.raw.wav"
    if not raw.exists():
        raw.write_bytes(cosyvoice(req) if cosy else openai(req, dest))
    out = cache / f"{dest}.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", str(out)], check=True)
    return trim(out), phrases(out)


def openai(req, dest):
    r = urllib.request.Request("https://api.openai.com/v1/audio/speech", data=json.dumps(req).encode(),
                               headers={"Authorization": f"Bearer {api_key()}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"OpenAI TTS failed for {dest}: HTTP {e.code} {e.read()[:300].decode(errors='replace')}")


def cosyvoice(req):
    """DashScope CosyVoice over the international websocket; run under `uv run --with dashscope`."""
    import dashscope
    from dashscope.audio.tts_v2 import SpeechSynthesizer, AudioFormat
    dashscope.api_key = os.environ.get("DASHSCOPE_API_KEY") or sys.exit("no DashScope key: set DASHSCOPE_API_KEY")
    dashscope.base_websocket_api_url = "wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference"
    try:
        audio = SpeechSynthesizer(model=req["model"], voice=req["voice"], format=AudioFormat.WAV_48000HZ_MONO_16BIT,
                                  speech_rate=req["rate"]).call(req["input"])
    except Exception as e:
        sys.exit(f"CosyVoice failed for {req['input'][:20]}…: {e!r}")
    return audio or sys.exit(f"CosyVoice returned no audio for {req['input'][:20]}…")
```

Also update the module docstring's first line to: `Narration with OpenAI or DashScope CosyVoice text-to-speech, one clip per line, cached so a line is only paid for once.` and add a usage line: `uv run --with dashscope python3 scripts/voice.py films/<film>/narration.json   # when narration.json has "engine": "cosyvoice"`.

- [ ] **Step 3: Check that the OpenAI path is untouched**

Run: `python3 scripts/voice.py films/2026-10-galaxy-look-up/narration.json`
Expected: every line prints its duration and comes from the cache (no API call: the request hash is unchanged); `voice.json` is byte-identical (`git diff --stat films/2026-10-galaxy-look-up/voice.json` is empty).

- [ ] **Step 4: Record the narration**

Run: `uv run -q --with dashscope python3 scripts/voice.py films/2026-10-santi-dark-forest/narration.json`
Expected: 11 lines, each with a duration and ≥1 phrase; `voice.json` is written. Every `dur` should be under its window in Task 2's table (longest: `fall` ≤ 14 s).

- [ ] **Step 5: Send `out/2026-10-santi-dark-forest.voice/` concatenated as one m4a to the user to listen to** (the same way as the voice comparison file).

- [ ] **Step 6: Commit** (with the user's OK): `git add scripts/voice.py films/2026-10-santi-dark-forest/narration.json films/2026-10-santi-dark-forest/voice.json`

---

### Task 2: plan.py and timeline.json

**Files:**
- Create: `films/2026-10-santi-dark-forest/plan.py`

**Interfaces:**
- Consumes: `voice.json` (Task 1), the track mp3, `narrated.Planner` (`say(lid, at) -> (start, end, phrases)`, `write(scenes, duration) -> tl`, `.cue` dict).
- Produces: `timeline.json` as specified above.

- [ ] **Step 1: Write plan.py**

```python
"""Lays the 三体 film out on its music and narration and writes timeline.json.

    uv run --with numpy films/2026-10-santi-dark-forest/plan.py

The film is cut to the track, not the other way round: the anchors below were read off a 1 s loudness map of
"Interstellar Space Travel", and each is snapped to the strongest onset within half a second, so cuts and
kills land on the music's own hits. Narration lines go into the gaps; subtitles follow the voice's phrases.
"""
import json, pathlib, re, subprocess, sys
import numpy as np

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from narrated import Planner

TRACK = ROOT / "out/santi-music/interstellar-space-travel.mp3"
DURATION = 179.7
SR, HOP = 22050, 256


def onsets(x):
    """Spectral-flux onset strength of mono samples x; returns (times, strength)."""
    frames = np.lib.stride_tricks.sliding_window_view(x, 2048)[::HOP]
    spec = np.log1p(np.abs(np.fft.rfft(frames * np.hanning(2048), axis=1)))
    flux = np.maximum(0, np.diff(spec, axis=0)).sum(1)
    # flux peaks while a hit is still a quarter window from the frame's end: stamp 3/4 in (measured: a click at 1.2 s -> 1.196)
    return (np.arange(len(flux)) + 1) * HOP / SR + 1536 / SR, flux


def snap(t, times, flux, win=0.5):
    """The strongest onset within win seconds of t."""
    near = (times > t - win) & (times < t + win)
    return round(float(times[near][np.argmax(flux[near])]), 3)


def split_sub(text, ph):
    """Cuts a line at Chinese punctuation into subtitle pieces (trailing ，。；： dropped), timed by the voice's
    phrases when the counts agree, else by character count across the spoken span."""
    parts = [p for p in re.split(r"(?<=[，。；：？！…])", text) if p.strip()]
    show = lambda p: p.rstrip("，。；：")
    if len(parts) == len(ph): return [(a, b, show(p)) for (a, b), p in zip(ph, parts)]
    t0, t1, n = ph[0][0], ph[-1][1], sum(len(show(p)) for p in parts)
    out, t = [], t0
    for p in parts:
        d = (t1 - t0) * len(show(p)) / n; out.append((round(t, 3), round(t + d, 3), show(p))); t += d
    return out


# self-checks: one click at 1.2 s snaps there; subtitles split by phrase and by length
_x = np.zeros(SR * 2, np.float32); _x[int(1.2 * SR):int(1.2 * SR) + 64] = 1.0
assert abs(snap(1.0, *onsets(_x)) - 1.2) < 0.02, snap(1.0, *onsets(_x))
assert split_sub("甲，乙。", [[0, 1], [1.2, 2]]) == [(0, 1, "甲"), (1.2, 2, "乙")]
assert split_sub("甲甲，乙。", [[0, 3]]) == [(0, 2.0, "甲甲"), (2.0, 3.0, "乙")]

if not TRACK.exists(): sys.exit(f"missing {TRACK}: https://pixabay.com/music/main-title-interstellar-space-travel-141121/")
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(TRACK), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                     capture_output=True, check=True).stdout
T, F = onsets(np.frombuffer(pcm, np.int16).astype(np.float32) / 32768)
at = lambda t: snap(t, T, F)

P = Planner(HERE)
assert not P.estimated, "record the narration first (voice.json); the estimator cannot time Chinese"
cue = P.cue
scenes = {"open": 0.0, "fleet": at(11.0), "drop": at(25.0), "ember": at(48.0), "foil": at(74.0),
          "fall": at(83.0), "paint": at(117.0), "escape": at(142.0), "back": at(157.0), "end": at(169.0)}
cue["title"] = scenes["fleet"]
cue["kills"] = [at(t) for t in (29.0, 34.0, 38.0, 43.0)]
cue["flick"] = scenes["foil"]
cue["planets"] = [at(t) for t in (88.0, 95.0, 102.0, 109.0)]      # Neptune, Uranus, Saturn, Jupiter
cue["sun"], cue["earth"] = scenes["paint"], at(123.0)

# line id, earliest start, must end by (the next scene or the next line's window)
PLACE = [("forest", 2.0, scenes["fleet"]), ("fleet", scenes["fleet"] + 2.0, scenes["drop"]),
         ("drop", scenes["drop"] + 0.5, cue["kills"][0] + 1.0), ("ember", scenes["ember"] + 1.0, scenes["ember"] + 7.0),
         ("singer", scenes["ember"] + 8.0, scenes["foil"]), ("quote", scenes["foil"] + 1.5, scenes["fall"]),
         ("fall", scenes["fall"] + 3.0, cue["planets"][3] + 4.0), ("earth", cue["earth"] + 2.0, scenes["escape"]),
         ("escape", scenes["escape"] + 2.0, scenes["back"]), ("back", scenes["back"] + 1.0, scenes["end"]),
         ("end", scenes["end"] + 1.0, DURATION - 2.0)]
subs = []
for lid, t0, by in PLACE:
    s, e, ph = P.say(lid, t0)
    assert e <= by, f"{lid} runs to {e:.1f} s, past {by:.1f} s; shorten the line or raise its rate"
    subs += [{"t0": a, "t1": b + 0.3, "zh": z} for a, b, z in split_sub(P.V[lid]["text"], ph)]
if subs: subs[-1]["t1"] = min(subs[-1]["t1"], DURATION - 1.0)

cards = [{"t0": cue["title"], "t1": cue["title"] + 9.0, "kind": "title", "text": "黑暗森林"},
         {"t0": scenes["foil"] + 1.0, "t1": scenes["fall"] - 0.5, "kind": "quote", "text": "毁灭你，与你有何相干。"},
         {"t0": scenes["end"] + 0.5, "t1": DURATION - 0.6, "kind": "end", "text": "给岁月以文明，而不是给文明以岁月。"},
         {"t0": scenes["end"] + 3.5, "t1": DURATION - 0.6, "kind": "credit", "text": "刘慈欣《三体》"}]
subs = [s for s in subs                                          # quote and end are on their cards; no subtitle twice if not any(c["t0"] - 1 < s["t0"] < c["t1"] and c["kind"] in ("quote", "end") for c in cards)]

tl = P.write(scenes, DURATION)
tl["subs"], tl["cards"] = subs, cards
(HERE / "timeline.json").write_text(json.dumps(tl, indent=1, ensure_ascii=False) + "\n")
print(f"{len(subs)} subtitles, kills at {cue['kills']}, planets at {cue['planets']}")
```

- [ ] **Step 2: Run it**

Run: `uv run -q --with numpy films/2026-10-santi-dark-forest/plan.py`
Expected: no assertion fails. It prints "measured narration, 180 s film", the 10 scenes each within 0.5 s of their anchor, the 11 line starts, and the subtitle count. If an `assert e <= by` fires, shorten that line in narration.json (or raise `rate`), then re-run Task 1 Step 4.

- [ ] **Step 3: Commit** (with the user's OK): `plan.py`, `timeline.json`.

---

### Task 3: Film skeleton (sky, type, subtitles, cards, contract)

**Files:**
- Create: `films/2026-10-santi-dark-forest/film.src.html`
- Modify: `package.json` (add the three scripts)

**Interfaces:**
- Consumes: `timeline.json` via `const TL = JSON.parse(__TEXT:timeline.json__)`.
- Produces, for Tasks 4–7: helpers `clamp, ramp, ease, easeIO, window01, lerp, rng(seed)`, `text(s, x, y, opts)`, `stars(t, alpha)`, constants `W=1920, H=1080, ZH='"Songti SC", serif'`, and a scene dispatch in `render(t)` that calls `drawFleet(t)`, `drawSinger(t)`, `drawFall(t)` and `drawEscape(t)` (stubs that draw nothing in this task).

- [ ] **Step 1: package.json scripts**, alongside `vas`:

```json
"santi": "uv run -q --with dashscope python3 scripts/voice.py films/2026-10-santi-dark-forest/narration.json && uv run -q --with numpy films/2026-10-santi-dark-forest/plan.py && node scripts/render.mjs films/2026-10-santi-dark-forest/film.src.html --out out/santi-dark-forest.video.mp4 --sub 8 && uv run -q --with numpy films/2026-10-santi-dark-forest/music.py out/santi-dark-forest.wav && ffmpeg -y -loglevel error -i out/santi-dark-forest.video.mp4 -i out/santi-dark-forest.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/santi-dark-forest.mp4",
"santi:sheet": "node scripts/render.mjs films/2026-10-santi-dark-forest/film.src.html --sheet --step 2",
"santi:check": "node scripts/render.mjs films/2026-10-santi-dark-forest/film.src.html --check",
```

- [ ] **Step 2: Write the skeleton.** Follow `films/2026-10-galaxy-look-up/film.src.html` for the page shell, the time helpers, `text()`, the warm-up gradient before `window.READY`, the export block and the hand-play loop. Additions:
  - `rng(seed)`: mulberry32, used once at load time to build static star and ship tables (built once, never mutated, so frames stay pure).
  - `stars(t, a)`: about 2,400 points in 3 depth layers, drifting `-t * (2, 5, 11) px/s` with wrap, twinkle `0.75 + 0.25 * sin(t * f + phase)`; colours `#cfd8ff` / `#ffffff` / `#9fb4ff`.
  - Background `#04060b` with a faint radial `#0b1424` glow; a 0.6 vignette.
  - Subtitles: `TL.subs`, `"Songti SC"` 34 px, `#e8ecf4`, centred at `H - 92`, fade 0.25 s, with a soft shadow.
  - Cards: `title` is 132 px, tracking 0.5 em, with a slow 9 s scale 1.0→1.04; `quote` is 64 px with a cold `#bcd3ff` glow; `end` is 56 px; `credit` is 28 px at alpha 0.6, below the end card. Each fades in over 0.8 s and out over 0.6 s.
  - Global fade from black over 0–1.5 s, and to black over the last 1.2 s.

- [ ] **Step 3: Check**

Run: `npm run santi:check` → Expected: exit 0 ("no frame depends on an earlier one").
Run: `npm run santi:sheet` → Expected: a contact sheet in which every frame has stars; the title card shows at about 0:12–0:20, the quote card at about 1:15–1:22, the end card from about 2:50; subtitles sit inside the frame and do not overlap the cards.

- [ ] **Step 4: Commit** (with the user's OK).

---

### Task 4: Fleet and droplet (scenes fleet, drop, ember: 0:11–1:14)

**Files:** Modify `film.src.html` (`drawFleet(t)`)

**Interfaces:** Consumes `SC.fleet, SC.drop, SC.ember, SC.foil, CUE.kills`.

The design, every value a function of `t`:
- **Formation:** 48 × 42 = 2,016 ships in a slab tilted toward the camera. Ship *i* sits at (gx, gy, gz) and is projected with `s = 900 / (900 + z)`. Each ship is a small lozenge (12×4 px × s), warm gold `#ffcf7a`, with an engine glow (additive arc, radius 6·s). The camera dollies in from `SC.fleet` to `SC.drop` (z offset 1600→600, `easeIO`) with a slow 3° roll.
- **Droplet:** a teardrop path (circle plus a tangent point), mirror white, with a highlight that slides along it with `t`. Its path is a fixed polyline of 5 passes through the slab, one per accent: it enters at `SC.drop` and pass *k* ends at `CUE.kills[k]`. Position = piecewise `easeIO` along the polyline. A cyan streak follows it (12 trailing samples of the same function at `t - j·0.008`).
- **Kills:** ship *i* has `tk_i` = the moment the droplet passes nearest to it, precomputed once from the polyline at load. Its light is `1` before `tk_i`. At `tk_i` comes a white flash `exp(-(t - tk_i) / 0.08)`, then an ember `0.25·exp(-(t - tk_i) / 2.5)` drifting 20 px/s outward. Ships are ordered so most die in waves on the four accents; about 1% (the escapees) never die.
- **Ember (0:48–1:14):** the slab is dark with drifting embers. From `SC.ember + 10` the camera cranes up (everything translates down and shrinks toward one point), so by `SC.foil - 4` the whole battlefield is a faint smudge near the Sun's dot. This is the handover to the Singer's scale.

- [ ] **Step 1:** Build the ship table and the `tk_i` precompute at load (a pure function of the static tables).
- [ ] **Step 2:** Draw the formation, droplet and kills.
- [ ] **Step 3:** Check: `npm run santi:check` exits 0. Then render a sheet for this stretch only:
  Run: `node scripts/render.mjs films/2026-10-santi-dark-forest/film.src.html --sheet --from 10 --to 76 --step 1.5`
  Expected:
  - 0:12–0:24: a bright, ordered, gold fleet.
  - 0:26–0:47: the droplet is visible in every frame, with waves of flashes on each accent.
  - After 0:48: dark embers only.
  - By 1:10: the battlefield is a speck.
- [ ] **Step 4: Commit** (with the user's OK).

---

### Task 5: The Singer and the foil (scenes ember tail, foil: ~1:02–1:23)

**Files:** Modify `film.src.html` (`drawSinger(t)`)

**Interfaces:** Consumes `SC.ember, SC.foil, SC.fall, CUE.flick`.

- **The Singer's field:** from `SC.ember + 14`, a vast cold field fades in across the frame: a sparse lattice of dim blue-white "sensing" points (about 900, seeded) that slowly brighten in a wave toward a far yellow dot (the Sun, at about (1340, 560), radius 4 px). No creature is drawn.
- **The flick (`CUE.flick`):** a small white parallelogram (28×18 px) appears at the left edge with a 0.12 s brightness kick, then tumbles (rotation `t·2.1`, foreshortened by `cos`) along an eased path to the Sun dot. It arrives at `SC.fall`, shrinking with distance.
- The quote card (Task 3) sits over this. Keep the frame's upper third quiet so the card reads.

- [ ] **Step 1:** Implement. **Step 2:** `--sheet --from 60 --to 85 --step 1` shows the field, the foil leaving on the 1:14 accent, and the foil reaching the Sun at the start of the fall. `santi:check` exits 0. **Step 3:** Commit (with the user's OK).

---

### Task 6: Dimensional collapse (scenes fall, paint: 1:23–2:22)

**Files:** Modify `film.src.html` (`drawFall(t)`)

**Interfaces:** Consumes `SC.fall, SC.paint, SC.escape, CUE.planets, CUE.sun, CUE.earth`.

- **Camera:** a 3/4 view of the solar system plane. The planets have shaded radial-gradient spheres on fixed orbits; their angles depend on `t` but turn slowly.
- **The 2D front:** a plane that sweeps inward from beyond Neptune. Its radius `R(t)` is piecewise `easeIO`, hitting each planet's orbit radius exactly at `CUE.planets[k]` (Neptune, Uranus, Saturn, Jupiter), the Sun at `CUE.sun`, and Earth at `CUE.earth`. The order (Sun before Earth) follows the spec's structure table. Between them the front shows as a thin iridescent shimmer line, with a faint "fall" ripple of concentric arcs.
- **Flattening:** body *b* with hit time `h_b` gets `f = easeIO(ramp(t, h_b, h_b + 3.5))`. The sphere's y-scale goes 1→0.02 and its radius spreads ×(1 + 9f) into a flat disc. The disc is filled with fine guilloché line art: a sum of 3–5 rotated epitrochoids, line width 0.6 px, an iridescent hue sweep from `hsl(200→320)`, opacity 0.7f. Everything is seeded per body, so it is static apart from `f`.
- **The Sun:** it becomes the largest disc, with a golden-white guilloché.
- **Earth:** a blue sphere becomes a dense medallion, with a slow push-in on it from `CUE.earth + 1` to `SC.escape - 2`. A ring of tiny "history" glyphs (dots and arcs) is etched into it.
- **Painting:** by `SC.escape`, everything behind the front is one continuous flat, shimmering picture.

- [ ] **Step 1:** Implement. **Step 2:** `--sheet --from 82 --to 143 --step 2`. Expected:
  - The front is visible every frame.
  - Each planet flattens at its cue.
  - The Sun at about 1:57 and Earth at about 2:03 are the two biggest moments.
  - By 2:20 the frame reads as one painting.
  - `santi:check` exits 0.
- **Step 3:** Commit (with the user's OK).

---

### Task 7: Escape, look back, end (scenes escape, back, end: 2:22–2:59.7)

**Files:** Modify `film.src.html` (`drawEscape(t)`)

**Interfaces:** Consumes `SC.escape, SC.back, SC.end`.

- **Escape (2:22–2:37):** a warm point (`#ffd9a0`, with a 3-px core and a glow) races outward from the painting's edge, with a light-speed streak (length ∝ `ramp`) and starlight aberration (stars stretch radially away from the ship's heading). Behind it, the flat front expands outward and nearly catches it, then falls back.
- **Look back (2:37–2:49):** cut to the ship's rear view. The whole painted solar system hangs in the dark as one flat, faintly glowing disc framed by a thin gold hairline ("装裱"), slowly receding (scale 1→0.55) and tilting a few degrees.
- **End (2:49–2:59.7):** the painting dims to 0.25. The end card and credit come from Task 3. Fade to black over the last 1.2 s.

- [ ] **Step 1:** Implement. **Step 2:** `--sheet --from 140 --to 179.5 --step 1.5` shows the escape, the framed painting and the end card. `santi:check` exits 0. **Step 3:** Commit (with the user's OK).

---

### Task 8: Music, review, final render

**Files:**
- Create: `films/2026-10-santi-dark-forest/music.py`

- [ ] **Step 1: music.py**

```python
"""The 三体 film's music: "Interstellar Space Travel" by Lexin_Music (Pixabay licence), untouched, laid under
the narration by narrated.mix(): the music dips under speech and the master lands at -14 LUFS.

    uv run --with numpy films/2026-10-santi-dark-forest/music.py [out/santi-dark-forest.wav]

The track is not committed (the Pixabay licence forbids redistributing the file); it lives in out/santi-music/.
"""
import json, pathlib, subprocess, sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from narrated import SR, mix

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out/santi-dark-forest.wav"
TL = json.loads((HERE / "timeline.json").read_text())
SRC = ROOT / "out/santi-music/interstellar-space-travel.mp3"
if not SRC.exists(): sys.exit(f"missing {SRC}: https://pixabay.com/music/main-title-interstellar-space-travel-141121/")

music_wav = OUT.with_suffix(".music.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(SRC), "-ac", "2", "-ar", str(SR), "-c:a", "pcm_s16le", str(music_wav)], check=True)
I, TP, clarity = mix(music_wav, TL, ROOT / f"out/{HERE.name}.voice", OUT, duck=0.42)
print(f"voice sits {clarity:.1f} dB above the music while speaking")
print(f"wrote {OUT}  ({I} LUFS, {TP} dBTP)")
```

- [ ] **Step 2:** Run: `uv run -q --with numpy films/2026-10-santi-dark-forest/music.py`
  Expected: no warning; -14 ±0.5 LUFS, ≤ -1.5 dBTP, clarity > 0 dB.
- [ ] **Step 3: Preview.** Render a 30 fps preview (`--fps 30 --sub 1 --out out/santi-dark-forest.preview.mp4`) and mux it with the wav. Then hand the preview MP4 plus `npm run santi:sheet` to an **independent art-director subagent** (fresh context, strict, scores out of 10 with the top three fixes). It must not be the builder's own reviewer.
- [ ] **Step 4:** Fix and re-review until the score is ≥ 9/10.
- [ ] **Step 5:** Run `npm run santi` for the final render at `--sub 8`, then run `npm run santi:check` again.
- [ ] **Step 6:** Send `out/santi-dark-forest.mp4` to the user. Remind them that Claude cannot hear the audio, so they should judge the voice and music fit themselves.
- [ ] **Step 7: Commit** (with the user's OK): `music.py`, `package.json`, `film.src.html`, `timeline.json`.
