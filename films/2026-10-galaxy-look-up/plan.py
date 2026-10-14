"""Lays out "Look Up" on its narration and writes timeline.json plus zh/en subtitles.

    python3 films/2026-10-galaxy-look-up/plan.py

The film is an edit of captured footage (capture.mjs): `reel` says which shot plays where, from which
footage frame and at what rate (negative plays backwards). Cuts sit on bar lines, cues on beats
(120 BPM), so the score can meet them. Subtitles follow the voice; the Chinese ones are burned in.
"""
import json, pathlib, sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from narrated import Planner

P = Planner(HERE)
say, beat, bar, cue = P.say, P.beat, P.bar, P.cue
SUBS = json.loads((HERE / "subs.json").read_text())
SHOTS = ROOT / "out/galaxy-look-up/shots"
FPS = 60
reel, subs = [], []


def shot(name, t0, t1, at=0, rate=1.0, zoom=1.0, zoom1=None, at_x=0.5, at_y=0.5, **extra):
    """Footage `name` from frame `at` at `rate` (a pair ramps the rate), zooming from `zoom` to `zoom1`.
    The subject at the footage centre is shown at (at_x, at_y) of the frame."""
    z = (zoom + (zoom1 or zoom)) / 2
    cx, cy = 0.5 + (0.5 - at_x) / z, 0.5 + (0.5 - at_y) / z
    reel.append({"shot": name, "t0": t0, "t1": t1, "in": at, "rate": rate,
                 "zoom": [zoom, zoom1 or zoom], "c": [round(cx, 4), round(cy, 4)], **extra})


def line(lid, at):
    s, e, ph = say(lid, at)
    subs.append({"t0": s, "t1": e + 0.35, "zh": SUBS[lid], "en": P.V[lid]["text"]})
    return s, e, ph


# hook: straight onto the Sun's limb, pulling back a touch, then black and "Look up."
shot("sun", 0, 4.0, at=120, zoom=2.15, zoom1=1.95, at_x=0.44)
cue["look"] = 4.0
subs.append({"t0": 4.3, "t1": 6.0, "zh": SUBS["look"], "en": "Look up."})

# I: the sky from Earth, one cut per figure, each cut on the moment capture.mjs selects it
sky = 6.0
for k, (t0, t1, at) in enumerate([(6.0, 9.0, 30), (9.0, 12.0, 345), (12.0, 16.0, 665)]):
    shot("sky", t0, t1, at=at, zoom=1.86, zoom1=1.74, at_y=0.47)
cue["figures"] = [6.0, 9.0, 12.0]
line("eyes", sky + 1.0)

# II: outwards through the Solar System; pull-outs, off-centre, the cuts quicken toward the wormhole
go = 16.0
plan = [("earth", 4.0, 0, 1.45, 1.25, 0.38), ("moon", 4.0, 0, 1.7, 1.45, 0.62), ("sunwide", 4.0, 0, 1.3, 1.1, 0.5),
        ("jupiter", 2.0, 60, 1.5, 1.35, 0.62), ("saturn", 2.0, 40, 1.3, 1.18, 0.42), ("halley", 2.0, 0, 1.15, 1.05, 0.5)]
t = go
cue["planets"] = []
for name, d, at, z0, z1, ax in plan:
    shot(name, t, t + d, at=at, zoom=z0, zoom1=z1, at_x=ax)
    cue["planets"].append(t); t += d
line("further", go + 0.5)
line("past", go + 6.5)                                  # "Past a living Sun" lands on the Sun

# burst: the real wormhole played backwards, accelerating into a white flash; the galaxy rises
burst = t
shot("wormhole", burst, burst + 4.0, at=430, rate=[-0.8, -2.6])
cue["burst"] = burst + 4.0
shot("rise", burst + 4.0, burst + 14.0, grade="bulge")
line("stars", burst + 5.0)

# III: beyond the Milky Way; the timpani lands on M87's jet with a zoom snap
beyond = burst + 14.0
shot("lmc", beyond, beyond + 4.0, zoom=1.35, zoom1=1.2)
shot("cena", beyond + 4.0, beyond + 10.0, zoom=2.0, zoom1=1.85, at_x=0.53)
line("jets", beyond + 0.5)

# twist: M87 shrinks into a browser window; inside it, the real page takes over and is dragged
twist = beyond + 14.0
cue["jet"] = beyond + 10.0
cue["twist"] = twist
shot("m87", beyond + 10.0, twist + 3.1, zoom=1.3, zoom1=1.15, snap=True)
cue["window"] = twist + 2.5                              # the window has settled; the page fades in
s, e, _ = line("page", twist + 1.0)
s, e, _ = line("open", e + 1.2)
cue["url"] = beat(max(e + 0.5, twist + 9.0))
end = bar(cue["url"] + 7.5)                         # the address stays readable before the iris
shot("ui", cue["window"], end, at=330)                  # the drag (frames 480-600) starts 2.5 s in


def srt(key, path):
    fmt = lambda x: f"{int(x // 3600):02}:{int(x % 3600 // 60):02}:{int(x % 60):02},{int(round(x % 1 * 1000)):03}"
    path.write_text("".join(f"{i}\n{fmt(s['t0'])} --> {fmt(s['t1'])}\n{s[key]}\n\n" for i, s in enumerate(subs, 1)), encoding="utf-8")


subs.sort(key=lambda s: s["t0"])
P.write({"hook": 0, "sky": sky, "go": go, "burst": burst, "beyond": beyond, "twist": twist}, end)
tl = json.loads((HERE / "timeline.json").read_text())
for r in reel:                                           # every frame the film asks for must exist
    meta = json.loads((SHOTS / r["shot"] / "meta.json").read_text())
    r["frames"] = meta["frames"]
    rate = sum(r["rate"]) / 2 if isinstance(r["rate"], list) else r["rate"]
    last = r["in"] + (r["t1"] - r["t0"]) * FPS * rate
    assert 0 <= min(r["in"], last) and max(r["in"], last) < meta["frames"], f"{r['shot']} needs frame {last:.0f}, has {meta['frames']}"
assert all(abs(r["t0"] * 2 - round(r["t0"] * 2)) < 1e-6 for r in reel), "a cut is off the beat grid"
assert all(abs(v / 2 - round(v / 2)) < 1e-6 for v in (sky, go, burst, beyond, twist)), "a scene starts off a bar line"
tl["reel"], tl["subs"] = reel, [{"t0": s["t0"], "t1": s["t1"], "zh": s["zh"]} for s in subs]
(HERE / "timeline.json").write_text(json.dumps(tl, indent=1, ensure_ascii=False))
srt("zh", ROOT / "out/galaxy-look-up.zh.srt")
srt("en", ROOT / "out/galaxy-look-up.en.srt")
print(f"duration {end:.1f} s, {len(reel)} shots, {len(subs)} subtitles")
