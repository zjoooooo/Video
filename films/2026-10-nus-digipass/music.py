"""The DigiPass film's score: a calm G-major piano piece composed to timeline.json, rendered with real
samples, mixed under the narration.

    uv run --with numpy films/2026-10-nus-digipass/music.py [out/nus-digipass.wav]

Flowing piano arpeggios over a four-chord loop that changes per scene; strings join at step 1 and a
plucked double bass at step 4, so the music walks forward with the workflow. The open questions turn
to E minor; the end card resolves on G. No pings on cuts: a scene turns on a rolled piano chord, and
only three moments get their own figure, all on the piano or harp (the pool fills, a ticket is used,
the last chord).
"""
import json, pathlib, sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from narrated import BEAT, BAR, Score, mix, pitch, render

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out/nus-digipass.wav"
TL = json.loads((HERE / "timeline.json").read_text())
CUE, DUR, SC = TL["cue"], TL["duration"], TL["scenes"]
score = Score(seed=21)
note = score.note

PIANO, STRINGS, HARP, BASS = 0, 1, 2, 3
PROGRAM = {PIANO: 0, STRINGS: 48, HARP: 46, BASS: 45}     # bass: pizzicato strings

CHORDS = {   # bass root, upper voicing
    "G": ("G2", ["G3", "B3", "D4"]), "D/F#": ("F#2", ["A3", "D4", "F#4"]), "Em": ("E2", ["G3", "B3", "E4"]),
    "C": ("C3", ["G3", "C4", "E4"]), "D": ("D2", ["A3", "D4", "F#4"]), "Am": ("A2", ["A3", "C4", "E4"]),
    "Bm": ("B2", ["B3", "D4", "F#4"]),
}
LOOPS = {    # four bars per scene
    "open": ["G", "D/F#", "Em", "C"], "admin": ["G", "D/F#", "Em", "C"], "apply": ["C", "G", "Am", "D"],
    "buy": ["G", "Bm", "C", "D"], "link": ["G", "D/F#", "Em", "C"], "register": ["C", "G", "Am", "D"],
    "sync": ["Em", "C", "G", "D"], "exit": ["G", "D/F#", "Em", "C"], "choice": ["C", "G", "Am", "D"],
    "after": ["G", "Bm", "C", "D"], "confirm": ["Em", "C", "Am", "D"], "end": ["D", "G", "G", "G"],
}
ORDER = sorted(SC, key=SC.get)
STRINGS_FROM, BASS_FROM = SC["admin"], SC["link"]


def scene_at(t):
    return [s for s in ORDER if SC[s] <= t + 1e-6][-1]


def chord_at(t):
    s = scene_at(t); k = int((t - SC[s] + 1e-6) // BAR)
    return LOOPS[s][k % 4] if s != "end" else LOOPS["end"][min(k, 3)]


def speaking(t):
    return any(l["start"] - 0.2 <= t <= l["start"] + l["dur"] + 0.2 for l in TL["lines"])


# ---- the bed ------------------------------------------------------------------------------------
final = CUE["final"]
for b in range(int(DUR / BAR)):
    t0 = b * BAR
    s, name = scene_at(t0), chord_at(t0)
    if s == "end" and t0 + BAR > final: break              # the cadence takes over
    root, up = CHORDS[name]
    soft = 0.78 if speaking(t0 + 1.0) else 1.0
    note(t0, PIANO, root, 64 * soft, 1.9)
    note(t0 + 2 * BEAT, PIANO, pitch(root) + 7, 50 * soft, 0.9)
    lad = [pitch(up[0]), pitch(up[1]), pitch(up[2]), pitch(up[0]) + 12]
    step = 2 if s in ("open", "confirm") else 1            # sparser at the start and over the open questions
    for k in range(0, 8, step):
        p = lad[[0, 1, 2, 3, 2, 1, 2, 1][k]] + 12
        note(t0 + k * BEAT / 2, PIANO, p, (52 if k % 4 == 0 else 42) * soft, 0.45)
    if t0 >= STRINGS_FROM:
        for p in up: note(t0, STRINGS, p, 44 * soft, BAR * 0.98, human=False)
    if BASS_FROM <= t0 and s not in ("confirm", "end"):
        note(t0, BASS, pitch(root) - 12, 60 * soft, 0.5); note(t0 + 2 * BEAT, BASS, pitch(root) - 5, 50 * soft, 0.5)

# scene turns: a rolled chord on the downbeat
for s in ORDER[1:]:
    t0 = SC[s]
    root, up = CHORDS[chord_at(t0)]
    for k, p in enumerate([root, *up, pitch(up[0]) + 12]):
        note(t0 + k * 0.035, PIANO, p, 66, 1.6)

# ---- three figures ---------------------------------------------------------------------------------
pf = CUE["poolFill"]                                      # the pool fills: a harp sweep up the chord
ups = sorted(pitch(p) + 12 * o for p in CHORDS[chord_at(pf)][1] for o in (1, 2))
for k, p in enumerate(ups): note(pf + k * 0.14, HARP, p, 60, 1.2)
u = CUE["used"]                                           # a ticket is used: a rising fifth on the piano
note(u, PIANO, "D5", 70, 0.6); note(u + 0.25, PIANO, "A5", 74, 1.2)
for k, p in enumerate(("G1", "G2", "D3", "B3", "D4", "G4", "B4", "D5", "G5")):   # the end lands on G
    note(final + k * 0.04, PIANO, p, 82 - 2 * k, 3.6, human=False)
for p in ("G3", "B3", "D4", "G4"): note(final, STRINGS, p, 50, 3.6, human=False)
note(final + 0.2, HARP, "G5", 58, 2.0)

# ---- write, render, mix under the narration -------------------------------------------------------
mid, music_wav = OUT.with_suffix(".mid"), OUT.with_suffix(".music.wav")
score.midi(mid, PROGRAM)
render(mid, music_wav)
I, TP, clarity = mix(music_wav, TL, ROOT / f"out/{HERE.name}.voice", OUT, duck=0.38)
print(f"voice sits {clarity:.1f} dB above the music while speaking")
print(f"wrote {OUT}  ({len(score.ev)} notes, {I} LUFS, {TP} dBTP)")
