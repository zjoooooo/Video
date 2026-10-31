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


def show(p):                                        # a subtitle shows no trailing ，。；：
    return p.rstrip("，。；：")


def split_sub(text, ph):
    """Cuts a line at Chinese punctuation ("……" stays whole) into subtitle pieces, punctuation kept, timed by the
    voice's phrases when the counts agree, else by character count across the spoken span."""
    parts = [p for p in re.split(r"(?<=[，。；：？！])|(?<=…)(?!…)", text) if p and p.strip()]
    if len(parts) == len(ph): return [(a, b, p) for (a, b), p in zip(ph, parts)]
    t0, t1, n = ph[0][0], ph[-1][1], sum(len(show(p)) for p in parts)
    out, t = [], t0
    for p in parts:
        d = (t1 - t0) * len(show(p)) / n; out.append((round(t, 3), round(t + d, 3), p)); t += d
    return out


def merge_short(pieces, least=1.0):
    """Joins a subtitle piece shorter than `least` seconds to a neighbour without breaking a sentence: a piece that
    ends in a comma joins the next one; one that ends a sentence joins the one before, if that ended in a comma."""
    out, i = list(pieces), 0
    while i < len(out):
        a, b, z = out[i]
        if b - a < least and z.endswith(("，", "、")) and i + 1 < len(out):
            out[i:i + 2] = [(a, out[i + 1][1], z + out[i + 1][2])]; continue
        if b - a < least and i and out[i - 1][2].endswith(("，", "、")):
            out[i - 1:i + 1] = [(out[i - 1][0], b, out[i - 1][2] + z)]; i -= 1; continue
        i += 1
    return out


# self-checks: one click at 1.2 s snaps there; subtitles split by phrase, by length, keep "……" whole, merge short pieces
_x = np.zeros(SR * 2, np.float32); _x[int(1.2 * SR):int(1.2 * SR) + 64] = 1.0
assert abs(snap(1.0, *onsets(_x)) - 1.2) < 0.01, snap(1.0, *onsets(_x))
assert split_sub("甲，乙。", [[0, 1], [1.2, 2]]) == [(0, 1, "甲，"), (1.2, 2, "乙。")]
assert split_sub("甲甲，乙。", [[0, 3]]) == [(0, 2.0, "甲甲，"), (2.0, 3.0, "乙。")]
assert [show(p) for *_, p in split_sub("木星……一个。", [[0, 1]])] == ["木星……", "一个"]
assert merge_short([(0, 0.6, "跌落。"), (0.7, 0.9, "三维，"), (1, 3, "正在坍缩。")]) == [(0, 0.6, "跌落。"), (0.7, 3, "三维，正在坍缩。")]
assert merge_short([(0, 2, "回头望去，"), (2.1, 2.5, "画。")]) == [(0, 2.5, "回头望去，画。")]

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
BACK0 = scenes["escape"] + 11.2                                 # the look-back: five seconds after the jump (film.src.html: LS + 5)

# line id, earliest start, must end by (the next scene or the next line's window)
PLACE = [("forest", 2.0, scenes["fleet"]), ("fleet", scenes["fleet"] + 2.0, scenes["drop"]),
         ("drop", scenes["drop"] + 0.5, cue["kills"][0] + 1.0), ("ember", scenes["ember"] + 1.0, scenes["ember"] + 7.0),
         ("singer", scenes["ember"] + 8.0, scenes["foil"]), ("quote", scenes["foil"] + 1.5, scenes["fall"]),
         ("fall", scenes["fall"] + 3.0, cue["planets"][3] + 4.0), ("earth", cue["earth"] + 2.0, scenes["escape"]),
         ("escape", scenes["escape"] + 2.0, BACK0), ("back", BACK0 + 0.8, BACK0 + 4.4),
         ("pluto", BACK0 + 4.6, scenes["end"]), ("end", scenes["end"] + 1.0, DURATION - 2.0)]
subs = []
for lid, t0, by in PLACE:
    s, e, ph = P.say(lid, t0)
    if lid == "pluto": cue["pluto"] = s + 0.5                     # Pluto starts to fall as its line begins
    assert e <= by, f"{lid} runs to {e:.1f} s, past {by:.1f} s; shorten the line or raise its rate"
    subs += [{"t0": a, "t1": b + 0.3, "zh": show(z)} for a, b, z in merge_short(split_sub(P.V[lid]["text"], ph))]

cards = [{"t0": cue["title"], "t1": cue["title"] + 9.0, "kind": "title", "text": "黑暗森林"},
         {"t0": scenes["foil"] + 1.0, "t1": scenes["fall"] - 0.5, "kind": "quote", "text": "毁灭你，与你有何相干。"},
         {"t0": scenes["end"] + 0.5, "t1": DURATION - 0.6, "kind": "end", "text": "给岁月以文明，而不是给文明以岁月。"},
         {"t0": scenes["end"] + 3.5, "t1": DURATION - 0.6, "kind": "credit", "text": "刘慈欣《三体》"}]
subs = [s for s in subs                                          # quote and end are on their cards; no subtitle twice
        if not any(c["t0"] - 1 < s["t0"] < c["t1"] and c["kind"] in ("quote", "end") for c in cards)]
for a, b in zip(subs, subs[1:]): a["t1"] = min(a["t1"], b["t0"])   # one subtitle on screen at a time

tl = P.write(scenes, DURATION)
tl["subs"], tl["cards"] = subs, cards
(HERE / "timeline.json").write_text(json.dumps(tl, indent=1, ensure_ascii=False) + "\n")
print(f"{len(subs)} subtitles, kills at {cue['kills']}, planets at {cue['planets']}")
