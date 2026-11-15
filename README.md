# Video

A small pipeline for making videos with code, plus notes and a prompt for
making them with Claude Code. A film is a web page that can draw any moment
on request; the renderer steps through time, captures every frame in a
headless browser, blends sub-frames for motion blur and encodes an MP4 with
ffmpeg.

## What is here

| Path | What it is |
|---|---|
| `prompts/video-prompt-template.txt` | Paste it into Claude Code; it asks what you want, then plans, builds, renders and reviews a film |
| `Project.md` | Study notes: how code-rendered video works, rules collected from open-source films and skills, how the template was put together |
| `scripts/render.mjs` | Renders a film page to MP4, a contact sheet, or a determinism check |
| `scripts/score.py` | Synthesizes music from the film's event list, so sounds land on visual events |
| `scripts/voice.py` | Text-to-speech narration (OpenAI or DashScope CosyVoice), keys read from environment variables |
| `scripts/narrated.py` | Helpers to lay a film out around its narration and mix the music under the voice |
| `scripts/qa_pops.py` | Finds single-frame pops and dead air in a finished MP4 |
| `tests/` | Checks that the renderer catches a frame that depends on an earlier one |

## Setup

Needs Node (tested with 22), ffmpeg with libx264, and Python 3 with
[uv](https://docs.astral.sh/uv/) for the Python scripts.

```bash
npm install
npx playwright install chromium
npm test            # expect: ok: leaky=1 clean=0
```

## The film page contract

The renderer opens a page and captures its first `<canvas>`. The page sets:

```js
window.DURATION = 12;                 // seconds
window.seek = async t => draw(t);     // draw the frame at time t
window.READY = true;                  // after fonts and images have loaded
```

Optionally the page also sets `window.EVENTS`; the renderer saves it as
`out/<film>.events.json` for `score.py`, which needs all six fields (empty
lists are fine; the field meanings are at the top of `scripts/score.py`):

```js
window.EVENTS = { bpm: 120, duration: 12,
  cuts: [[2, 'push']], hits: [[1, 'pop', 0.5, 0.8]], runs: [], rolls: [] };
```

Every frame must depend on `t` alone: no timers, no `requestAnimationFrame`
loops, no unseeded random numbers, and reset the canvas state at the start of
each frame. `tests/fixtures/clean.src.html` is a minimal example. In a
`*.src.html` file, `__ASSET:path__` is replaced by the file's base64 and
`__TEXT:path__` by its text, giving a self-contained `*.html` next to it.

## Rendering

```bash
npm run render -- my-film/film.src.html --out out/my-film.mp4 --sub 4   # 60 fps, 4 sub-frames of motion blur
npm run render -- my-film/film.src.html --sheet --step 0.5             # contact sheet, one frame every 0.5 s
npm run render -- my-film/film.src.html --check                        # fails if a frame depends on an earlier one
uv run --with numpy scripts/score.py out/my-film.events.json out/score.wav
ffmpeg -i out/my-film.mp4 -i out/score.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k \
  -shortest -movflags +faststart out/my-film.final.mp4                 # add the score to the picture
npm run qa -- out/my-film.final.mp4
```

## Making a film with Claude Code

Open Claude Code in this folder, paste the whole of
`prompts/video-prompt-template.txt`, and answer its questions. It works
outside this repository too; here it will use `scripts/render.mjs`.
