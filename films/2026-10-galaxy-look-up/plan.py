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


def shot(name, t0, t1, at=0, rate=1.0, zoom=1.0, zoom1=None, cx=0.5, cy=0.5):
    """Footage `name` from frame `at` at `rate`, pushed in from `zoom` to `zoom1` around (cx, cy)."""
    reel.append({"shot": name, "t0": t0, "t1": t1, "in": at, "rate": rate,
                 "zoom": [zoom, zoom1 or zoom], "c": [cx, cy]})


def line(lid, at):
    s, e, ph = say(lid, at)
    subs.append({"t0": s, "t1": e + 0.35, "zh": SUBS[lid], "en": P.V[lid]["text"]})
    return s, e, ph


def footage_time(name, frame):                           # film time at which `frame` of a reel entry shows
    r = next(r for r in reel if r["shot"] == name)
    return r["t0"] + (frame - r["in"]) / (FPS * r["rate"])


# hook: straight onto the Sun's limb, then black and "Look up."
shot("sun", 0, 4.0, at=120, zoom=1.9, zoom1=2.05, cx=0.56, cy=0.5)
cue["look"] = 4.0
subs.append({"t0": 4.3, "t1": 6.0, "zh": SUBS["look"], "en": "Look up."})

# I: the sky from Earth; Leo is up, Scorpius and Sagittarius arrive (capture.mjs selects them at 350, 670)
sky = 6.0
shot("sky", sky, 20.0, at=60, zoom=1.35, zoom1=1.5)
cue["figures"] = [beat(footage_time("sky", 350)), beat(footage_time("sky", 670))]
line("eyes", sky + 1.0)

# II: outwards through the Solar System, two bars a shot
go = 20.0
plan = [("earth", 0, 1.25, 1.4), ("moon", 0, 1.5, 1.65), ("sun", 360, 1.25, 1.4),
        ("jupiter", 0, 1.3, 1.45), ("saturn", 0, 1.2, 1.32), ("halley", 0, 1.0, 1.12)]
for k, (name, at, z0, z1) in enumerate(plan):
    shot(name, go + 4.0 * k, go + 4.0 * (k + 1), at=at, zoom=z0, zoom1=z1)
cue["planets"] = [go + 4.0 * k for k in range(len(plan))]
line("further", go + 0.5)
line("past", go + 6.5)                                 # "Past a living Sun" lands on the Sun

# burst: the real wormhole played backwards, a white flash, and the galaxy rises
burst = go + 4.0 * len(plan)
shot("wormhole", burst, burst + 4.0, at=430, rate=-1.6)
cue["burst"] = burst + 4.0
shot("rise", burst + 4.0, burst + 14.0)
line("stars", burst + 5.0)

# III: beyond the Milky Way; the timpani lands on M87's jet
beyond = burst + 14.0
shot("lmc", beyond, beyond + 4.0, zoom=1.2, zoom1=1.32)
shot("cena", beyond + 4.0, beyond + 10.0, zoom=1.45, zoom1=1.7, cx=0.47)
shot("m87", beyond + 10.0, beyond + 14.0, zoom=1.15, zoom1=1.3)
cue["jet"] = beyond + 10.0
line("jets", beyond + 0.5)

# twist: the universe was a web page all along
twist = beyond + 14.0
cue["twist"] = twist
s, e, _ = line("page", twist + 2.0)
s, e, _ = line("open", e + 1.2)
cue["url"] = beat(e + 0.5)
end = bar(e + 4.0)
shot("ui", twist, end)


def srt(key, path):
    fmt = lambda x: f"{int(x // 3600):02}:{int(x % 3600 // 60):02}:{int(x % 60):02},{int(round(x % 1 * 1000)):03}"
    path.write_text("".join(f"{i}\n{fmt(s['t0'])} --> {fmt(s['t1'])}\n{s[key]}\n\n" for i, s in enumerate(subs, 1)), encoding="utf-8")


subs.sort(key=lambda s: s["t0"])
P.write({"hook": 0, "sky": sky, "go": go, "burst": burst, "beyond": beyond, "twist": twist}, end)
tl = json.loads((HERE / "timeline.json").read_text())
for r in reel:                                           # every frame the film asks for must exist
    meta = json.loads((SHOTS / r["shot"] / "meta.json").read_text())
    r["frames"] = meta["frames"]
    last = r["in"] + (r["t1"] - r["t0"]) * FPS * r["rate"]
    assert 0 <= min(r["in"], last) and max(r["in"], last) < meta["frames"], f"{r['shot']} needs frame {last:.0f}, has {meta['frames']}"
assert all(abs(r["t0"] / 2 - round(r["t0"] / 2)) < 1e-6 for r in reel), "a cut is off the bar grid"
tl["reel"], tl["subs"] = reel, [{"t0": s["t0"], "t1": s["t1"], "zh": s["zh"]} for s in subs]
(HERE / "timeline.json").write_text(json.dumps(tl, indent=1, ensure_ascii=False))
srt("zh", ROOT / "out/galaxy-look-up.zh.srt")
srt("en", ROOT / "out/galaxy-look-up.en.srt")
print(f"duration {end:.1f} s, {len(reel)} shots, {len(subs)} subtitles")
