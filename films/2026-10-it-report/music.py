"""The October report's score: a calm G-major piano piece composed to timeline.json, rendered with real
samples, mixed under the narration.

    uv run --with numpy films/2026-10-it-report/music.py [out/it-report-2026-10.wav]

Flowing piano arpeggios over a four-chord loop that changes per page, strings underneath from the
second page. Every on-screen event is a note in key:
- counts and stat cards: celesta and glockenspiel
- completed items: a rising fifth
- the portal's ring: a harp sweep
Each page turn is a rolled piano chord. The last page turns on D and "Thank you" lands on G.
"""
import json, pathlib, sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from narrated import BEAT, BAR, Score, mix, pitch, render

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out/it-report-2026-10.wav"
TL = json.loads((HERE / "timeline.json").read_text())
CUE, DUR, SC = TL["cue"], TL["duration"], TL["scenes"]
score = Score(seed=13)
note = score.note

PIANO, STRINGS, CELESTA, GLOCK, HARP, BASS = 0, 1, 2, 3, 4, 5
PROGRAM = {PIANO: 0, STRINGS: 48, CELESTA: 8, GLOCK: 9, HARP: 46, BASS: 32}

CHORDS = {   # bass root, upper voicing (piano right hand and strings)
    "G": ("G2", ["G3", "B3", "D4"]), "D/F#": ("F#2", ["A3", "D4", "F#4"]), "Em": ("E2", ["G3", "B3", "E4"]),
    "C": ("C3", ["G3", "C4", "E4"]), "D": ("D2", ["A3", "D4", "F#4"]), "Am": ("A2", ["A3", "C4", "E4"]),
    "Bm": ("B2", ["B3", "D4", "F#4"]),
}
LOOPS = {    # four bars per page, in the order the pages come
    "title": ["G", "D/F#", "Em", "C"], "status": ["G", "D/F#", "Em", "C"], "wms": ["C", "G", "Am", "D"],
    "done": ["G", "Bm", "C", "D"], "portal": ["Em", "C", "G", "D"], "dog": ["C", "G", "Am", "D"],
    "next": ["C", "D", "Bm", "Em"], "end": ["D", "G", "G", "G"],
}
ORDER = sorted(SC, key=SC.get)


def scene_at(t):
    return [s for s in ORDER if SC[s] <= t + 1e-6][-1]


def chord_at(t):
    s = scene_at(t); k = int((t - SC[s] + 1e-6) // BAR)
    return LOOPS[s][k % 4] if s != "end" else LOOPS["end"][min(k, 3)]


def tones(t, octave=1):                                  # chord tones an octave up, for bells
    return [pitch(p) + 12 * octave for p in CHORDS[chord_at(t)][1]]


def speaking(t):
    return any(l["start"] - 0.2 <= t <= l["start"] + l["dur"] + 0.2 for l in TL["lines"])


# ---- the bed: piano arpeggios and bass, strings from the second page ---------------------------------
end_final = CUE["final"]
bars = int(DUR / BAR)
for b in range(bars):
    t0 = b * BAR
    if t0 >= end_final + 2 * BEAT: break
    s, name = scene_at(t0), chord_at(t0)
    root, up = CHORDS[name]
    soft = 0.78 if speaking(t0 + 1.0) else 1.0
    if s == "end" and t0 + BAR > end_final:              # the cadence takes over
        break
    # left hand: root on beat 1, fifth-ish on beat 3
    note(t0, PIANO, root, 66 * soft, 1.9)
    note(t0 + 2 * BEAT, PIANO, pitch(root) + 7, 52 * soft, 0.9)
    # right hand: eighth-note arpeggio (sparser on the title page)
    lad = [pitch(up[0]), pitch(up[1]), pitch(up[2]), pitch(up[0]) + 12]
    step = 2 if s == "title" else 1
    for k in range(0, 8, step):
        p = lad[[0, 1, 2, 3, 2, 1, 2, 1][k]] + 12
        note(t0 + k * BEAT / 2, PIANO, p, (54 if k % 4 == 0 else 44) * soft, 0.45)
    if s != "title":
        for p in up:
            note(t0, STRINGS, p, 46 * soft, BAR * 0.98, human=False)
        if s in ("next", "dog"):
            note(t0, BASS, pitch(root) - 12, 58 * soft, 1.6)

# page turns: a rolled chord on the downbeat
for s in ORDER[1:]:
    t0 = SC[s]
    root, up = CHORDS[chord_at(t0)]
    for k, p in enumerate([root, *up, pitch(up[0]) + 12]):
        note(t0 + k * 0.035, PIANO, p, 70, 1.6)

# ---- events: notes in key, where the picture moves --------------------------------------------------
def sparkle(t, inst=CELESTA, n=1, vel=70, octave=1):
    ts = tones(t, octave)
    for k in range(n):
        note(t + k * 0.09, inst, ts[k % 3] + (12 if k >= 3 else 0), vel, 0.6)

sparkle(1.6, GLOCK, vel=62, octave=2)                     # the logo
for k in range(10):                                       # the count to ten
    note(CUE["count"] + k * 0.12, CELESTA, tones(CUE["count"])[k % 3] + 12 * (k // 3 % 2), 50 + 2 * k, 0.4)
for key, octave in (("done", 1), ("prog", 1), ("plan", 1)):
    sparkle(CUE[key], GLOCK, vel=70, octave=octave + 1)
for at in CUE["hl"]:
    sparkle(at, CELESTA, n=2, vel=64)
for key in ("wms1", "wms2", "wms3", "wms4"):
    sparkle(CUE[key] + 0.1, GLOCK, vel=62, octave=2)
for at in CUE["rows"]:                                    # completed: a rising fifth
    g = pitch("D6"); note(at + 0.3, CELESTA, g, 74, 0.4); note(at + 0.45, CELESTA, g + 5, 78, 0.8)
r = CUE["ring"]                                           # the ring fills: a harp sweep up the chord
for k, p in enumerate(sorted(tones(r, 0) + tones(r, 1) + tones(r, 2))):
    note(r + k * 0.13, HARP, p, 64, 1.2)
for key in ("a", "d"):
    g = pitch("D6"); note(CUE[key] + 0.2, CELESTA, g, 72, 0.4); note(CUE[key] + 0.35, CELESTA, g + 5, 76, 0.8)
for key in ("b", "c", "f", "e"):
    sparkle(CUE[key] + 0.1, GLOCK, vel=56, octave=2)
for k, p in enumerate(sorted(tones(CUE["ssg"], 1) + tones(CUE["ssg"], 2))):   # SSG climbs to 100%
    note(CUE["ssg"] + 0.3 + k * 0.2, GLOCK, p, 60 + 3 * k, 0.6)
sparkle(CUE["ehub"] + 0.3, GLOCK, vel=60, octave=2)
for key in ("vnc", "cb"):
    sparkle(CUE[key], CELESTA, vel=58)
for at in CUE["n"]:
    sparkle(at, CELESTA, vel=54)

# ---- the end: the page turns on D, "Thank you" lands on G, and the chord rings -----------------------------
f = end_final
for k, p in enumerate(("G1", "G2", "D3", "B3", "D4", "G4", "B4", "D5", "G5")):
    note(f + k * 0.04, PIANO, p, 84 - 2 * k, 3.6, human=False)
for p in ("G3", "B3", "D4", "G4"): note(f, STRINGS, p, 52, 3.6, human=False)
note(f + 0.2, GLOCK, "G6", 70, 2.0); note(f + 0.2, HARP, "G5", 60, 2.0)

# ---- write, render, mix under the narration -------------------------------------------------------------
mid, music_wav = OUT.with_suffix(".mid"), OUT.with_suffix(".music.wav")
score.midi(mid, PROGRAM)
render(mid, music_wav)
I, TP, clarity = mix(music_wav, TL, ROOT / f"out/{HERE.name}.voice", OUT, duck=0.38)
print(f"voice sits {clarity:.1f} dB above the music while speaking")
print(f"wrote {OUT}  ({len(score.ev)} notes, {I} LUFS, {TP} dBTP)")
