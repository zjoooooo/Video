"""The intro's score: a G-major piano polka composed to timeline.json, rendered with real samples,
then mixed under the narration.

    uv run --with numpy films/2026-10-parkops-intro/music.py [out/parkops-intro.wav]

Story in music: the polka dances while the fleet runs; it stops dead when CK36's lanes go dark;
pizzicato strings tiptoe in E minor while a woodblock counts the 23 seconds and a celesta rings each
alert; a piano glissando brings the polka back, fuller, at "all clear"; it ends on "Know first."
Needs fluidsynth and MuseScore_General.sf3 (MIT; FluidR3 by Frank Wen, FluidR3Mono by Michael Cowgill,
MuseScore_General by S. Christian Collins) in ~/Library/Audio/Sounds/Banks.
"""
import json, pathlib, sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from narrated import BEAT, BAR, Score, mix, pitch, render

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out/parkops-intro.wav"
TL = json.loads((HERE / "timeline.json").read_text())
CUE, DUR = TL["cue"], TL["duration"]
score = Score(seed=7)
note = score.note

# ---- instruments (General MIDI programs; channel 9 is percussion) -------------------------
PIANO, PIZZ, CELESTA, TUBA, GLOCK = 0, 1, 2, 3, 4
PROGRAM = {PIANO: 0, PIZZ: 45, CELESTA: 8, TUBA: 58, GLOCK: 9}
WOOD = 76                                                # hi wood block on channel 9

CHORDS = {   # bass root, bass fifth, right-hand "pah" voicing
    "G": ("G2", "D2", ["B3", "D4", "G4"]), "C": ("C3", "G2", ["C4", "E4", "G4"]),
    "D7": ("D2", "A2", ["C4", "D4", "F#4"]), "Em": ("E2", "B1", ["B3", "E4", "G4"]),
    "B7": ("B1", "F#2", ["A3", "D#4", "F#4"]), "Am": ("A2", "E2", ["A3", "C4", "E4"]),
}
# The tune: 8 bars, each bar a list of (note or None for a rest, length in eighths); 8 eighths a bar.
TUNE = [
    ("G",  [("D5", 1), ("B4", 1), ("G4", 1), ("B4", 1), ("D5", 2), ("G5", 2)]),
    ("G",  [("F#5", 1), ("G5", 1), ("A5", 1), ("G5", 1), ("F#5", 2), ("E5", 2)]),
    ("D7", [("D5", 1), ("C5", 1), ("A4", 1), ("F#4", 1), ("A4", 2), ("D5", 2)]),
    ("D7", [("C5", 2), ("B4", 2), ("A4", 3), (None, 1)]),
    ("D7", [("A4", 1), ("B4", 1), ("C5", 1), ("D5", 1), ("E5", 2), ("F#5", 2)]),
    ("D7", [("A5", 2), ("F#5", 2), ("D5", 3), (None, 1)]),
    ("G",  [("B5", 1), ("A5", 1), ("G5", 1), ("D5", 1), ("E5", 1), ("F#5", 1), ("G5", 2)]),
    ("G",  [("G5", 2), ("D5", 2), ("G4", 3), (None, 1)]),
]

def speaking(t):                                         # quieter playing under the narrator
    return any(l["start"] - 0.3 <= t <= l["start"] + l["dur"] + 0.2 for l in TL["lines"])

def oompah(b, chord, vel=1.0, tuba=False, last_beat=4):
    """Left hand on beats 1 and 3 (root, fifth), right-hand chord on beats 2 and 4."""
    t0, (root, fifth, pah) = b * BAR, CHORDS[chord]
    for k in range(last_beat):
        t = t0 + k * BEAT
        if k % 2 == 0:
            bass = root if k == 0 else fifth
            note(t, PIANO, bass, 84 * vel, 0.32)
            if tuba: note(t, TUBA, pitch(bass), 70 * vel, 0.34)
        else:
            for p in pah: note(t, PIANO, p, 62 * vel, 0.16)

def tune_bar(b, i, vel=1.0, octave=0):
    t = b * BAR
    for n, eighths in TUNE[i][1]:
        if n: note(t, PIANO, pitch(n) + 12 * octave, (78 if eighths == 1 else 86) * vel, eighths * BEAT / 2 * 0.8)
        t += eighths * BEAT / 2

def pizz_bar(b, chord, vel=1.0):
    """Tiptoe: a plucked arpeggio on the eighths, a rest between each step."""
    t0 = b * BAR
    root, _, pah = CHORDS[chord]
    note(t0, PIZZ, root, 80 * vel, 0.3); note(t0 + 2 * BEAT, PIZZ, root, 70 * vel, 0.3)
    p1, p2 = pitch(pah[1]), pitch(pah[2])
    for k, p in enumerate((p1, p2, p1 + 12, p2)):
        note(t0 + k * BEAT, PIZZ, p, 66 * vel, 0.18)

# ---- the arrangement, bar by bar --------------------------------------------------------------------
bars = int(DUR / BAR)
S = TL["scenes"]
lost_bar, clear_bar = int(CUE["lost"] // BAR), int(CUE["clear"] // BAR)
map_bar = int(S["map"] // BAR)
pc_on_bar = int(CUE["pcOn"] // BAR)
final = CUE["final"]
for b in range(bars):
    t = b * BAR
    soft = 0.75 if speaking(t + 1.0) else 1.0
    if b == 0:                                               # the band counts in: left hand only
        oompah(b, "G", 0.8)
    elif b < map_bar:                                        # the polka dances while the fleet runs
        i = (b - 1) % 8
        oompah(b, TUNE[i][0], soft); tune_bar(b, i, soft * 0.9)
    elif b < lost_bar or (b == lost_bar and t < CUE["lost"]):  # CK36: just the oom-pah, light, like a clock
        oompah(b, "G" if (b - map_bar) % 2 == 0 else "D7", 0.7,
               last_beat=4 if b < lost_bar else int(round((CUE["lost"] - t) / BEAT)))
    elif b < clear_bar:                                      # tiptoe in E minor; hope from "came back"
        if b == lost_bar: continue
        chords = ("C", "D7") if b >= pc_on_bar else ("Em", "B7")
        pizz_bar(b, chords[(b - lost_bar) % 2], 0.85)
    elif t < final - BEAT:                                   # the polka returns, fuller, an octave up
        i = (b - clear_bar) % 8
        oompah(b, TUNE[i][0], soft, tuba=True); tune_bar(b, i, soft, octave=1 if i in (0, 1, 6) else 0)

# the stop: a low, pedalled E-minor chord where the lanes go dark
for p in ("E1", "E2", "B2", "G3"): note(CUE["lost"], PIANO, p, 92, 2.6, human=False)
# the woodblock counts 23 seconds as the clock runs
for k in range(23): note(CUE["count0"] + k * 2.0 / 23, 9, WOOD, 70 + k, 0.05)
# each alert: a celesta falling a fourth
for i, at in enumerate(CUE["alerts"]):
    note(at, CELESTA, "B5", 86, 0.22); note(at + 0.18, CELESTA, "F#5", 80, 0.4)
# which site / lane / device: one plucked note each, rising
for k, key in enumerate(("site", "lane", "device")): note(CUE[key], PIZZ, ("B4", "D5", "F#5")[k], 84, 0.3)
# PC down and back: a low pluck, then a hopeful one
note(CUE["pcOff"], PIZZ, "E2", 84, 0.4); note(CUE["pcOn"], CELESTA, "D6", 70, 0.6)
# all clear: a glissando up the white keys into the polka's return, a glockenspiel on the downbeat
white = [p for p in range(pitch("G3"), pitch("G6") + 1) if p % 12 in (0, 2, 4, 5, 7, 9, 11)]
for k, p in enumerate(white): note(CUE["clear"] - 0.5 + k * 0.5 / len(white), PIANO, p, 60 + k, 0.12, human=False)
note(CUE["clear"], GLOCK, "G6", 90, 1.0); note(CUE["clear"], GLOCK, "D6", 80, 1.0)
# the end: a pickup run, then the last chord on "first", tuba and glockenspiel with it
for k, p in enumerate(("D5", "E5", "F#5")): note(final - 0.375 + k * 0.125, PIANO, p, 84, 0.1)
for p in ("G1", "G2", "D3", "B3", "D4", "G4", "B4", "G5"): note(final, PIANO, p, 104, 2.4, human=False)
note(final, TUBA, "G1", 96, 1.2); note(final, GLOCK, "G6", 96, 1.6)

# ---- write, render, mix under the narration ---------------------------------------------------------------
mid, music_wav = OUT.with_suffix(".mid"), OUT.with_suffix(".music.wav")
score.midi(mid, PROGRAM)
render(mid, music_wav)
I, TP, clarity = mix(music_wav, TL, ROOT / f"out/{HERE.name}.voice", OUT)
print(f"voice sits {clarity:.1f} dB above the music while speaking")
print(f"wrote {OUT}  ({len(score.ev)} notes, {I} LUFS, {TP} dBTP{', music only: narration not generated yet' if TL['estimated'] else ''})")
