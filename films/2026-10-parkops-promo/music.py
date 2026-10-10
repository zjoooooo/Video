"""The promo's score: a G-major product-launch piece that builds chapter by chapter, composed to
timeline.json, rendered with real samples, mixed under the narration.

    uv run --with numpy films/2026-10-parkops-promo/music.py [out/parkops-promo.wav]

The bed grows by level: a piano chord alone (0); a piano eighth-note ostinato with strings (1);
shaker and bass (2); soft kick and side stick (3); horns, ride, timpani and harp at the galaxy (5).
CK36 drops to E-minor pizzicato while a woodblock counts the 23 seconds. Every on-screen event is a
note in key: celesta and glockenspiel for things appearing, marimba for clicks and commands, harp for
sweeps; a refusal is a plucked minor second; a roll back is a harp run down, then up. A four-note
call (the name) opens on the brand, returns on the horns at the galaxy and lands on "Know first."
Needs fluidsynth and MuseScore_General.sf3 in ~/Library/Audio/Sounds/Banks.
"""
import json, pathlib, sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from narrated import BEAT, BAR, Score, mix, pitch, render

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out/parkops-promo.wav"
TL = json.loads((HERE / "timeline.json").read_text())
CUE, DUR, SC = TL["cue"], TL["duration"], TL["scenes"]
score = Score(seed=21)
note = score.note

# ---- instruments (General MIDI; channel 9 is percussion) ---------------------------------------
PIANO, STR, CEL, GLOCK, HARP, BASS, HORN, TIMP, MARIM, DR, PIZZ = 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
PROGRAM = {PIANO: 0, STR: 48, CEL: 8, GLOCK: 9, HARP: 46, BASS: 32, HORN: 60, TIMP: 47, MARIM: 12, PIZZ: 45}
KICK, SIDE, CHH, CRASH, RIDE, SHAKER, WOOD = 36, 37, 42, 49, 51, 82, 76

CHORDS = {   # bass root, upper voicing
    "G": ("G2", ["G3", "B3", "D4"]), "D/F#": ("F#2", ["A3", "D4", "F#4"]), "Em": ("E2", ["G3", "B3", "E4"]),
    "C": ("C3", ["G3", "C4", "E4"]), "D": ("D2", ["A3", "D4", "F#4"]), "Am": ("A2", ["A3", "C4", "E4"]),
    "Bm": ("B2", ["B3", "D4", "F#4"]), "B7": ("B1", ["A3", "D#4", "F#4"]),
}
PLAN = {     # per scene: four-bar chord loop, energy level
    "open": (["G", "D/F#", "Em", "C"], 0), "agent": (["G", "Em", "C", "D"], 1), "alert": (["Em", "C", "G", "D"], 1),
    "ck36": (["Em", "B7", "Em", "B7"], -1), "map": (["G", "D/F#", "Em", "C"], 2), "look": (["C", "G", "Am", "D"], 2),
    "fix": (["G", "Bm", "C", "D"], 3), "release": (["Em", "C", "G", "D"], 3), "galaxy": (["C", "D", "G", "Em"], 5),
    "people": (["G", "D/F#", "Em", "C"], 2), "built": (["C", "D", "Em", "D"], 3), "end": (["D", "D", "G", "G"], 0),
}
ORDER = sorted(SC, key=SC.get)
scene_at = lambda t: [s for s in ORDER if SC[s] <= t + 1e-6][-1]
def chord_at(t):
    s = scene_at(t); return PLAN[s][0][int((t - SC[s] + 1e-6) // BAR) % 4]
tones = lambda t, octave=1: [pitch(p) + 12 * octave for p in CHORDS[chord_at(t)][1]]
speaking = lambda t: any(l["start"] - 0.2 <= t <= l["start"] + l["dur"] + 0.2 for l in TL["lines"])
FINAL = CUE["final"]
REST = (CUE["fault"], CUE["fault"] + 2 * BEAT)                # the bed drops out for a beat where the install fails

# ---- the bed, bar by bar -----------------------------------------------------------------------------
for b in range(int(DUR / BAR)):
    t0 = b * BAR
    if t0 >= SC["end"]: break
    s = scene_at(t0); lvl = PLAN[s][1]
    if s == "galaxy" and t0 < CUE["become"]: lvl = 2                # the galaxy builds from the pull-back
    if s == "people" and t0 >= CUE["audit"]: lvl = 3
    root, up = CHORDS[chord_at(t0)]
    soft = 0.8 if speaking(t0 + 1.0) else 1.0
    if s == "open" and t0 >= CUE["brand"] - BAR: continue          # the name gets its own chord
    on = lambda t: not (REST[0] <= t < REST[1])
    if lvl == -1:                                                   # CK36: tiptoe pizzicato in E minor
        note(t0, PIZZ, root, 78, 0.3); note(t0 + 2 * BEAT, PIZZ, root, 66, 0.3)
        p1, p2 = pitch(up[1]), pitch(up[2])
        for k, p in enumerate((p1, p2, p1 + 12, p2)): note(t0 + k * BEAT, PIZZ, p, 62, 0.18)
        continue
    if lvl == 0:                                                    # a piano chord and a long string note
        if t0 >= CUE["fleet"] - 0.5:
            for k, p in enumerate([root, *up]): note(t0 + k * 0.03, PIANO, p, 50, 1.9)
            note(t0, STR, pitch(up[2]), 34, BAR * 0.98, human=False)
        continue
    # level 1+: the eighth-note ostinato, root-fifth-octave-fifth over the chord
    lad = [pitch(up[0]) + 12, pitch(up[1]) + 12, pitch(up[2]) + 12, pitch(up[0]) + 24]
    for k in range(8):
        t = t0 + k * BEAT / 2
        if on(t): note(t, PIANO, lad[[0, 1, 2, 3, 2, 1, 2, 1][k]], (52 if k % 4 == 0 else 42) * soft * (1.12 if lvl >= 3 else 1), 0.42)
    if on(t0): note(t0, PIANO, root, 60 * soft, 1.9)
    for p in up: note(t0, STR, p, (36 + 6 * min(lvl, 4)) * soft, BAR * 0.98, human=False)
    if lvl >= 2:
        for k in range(8):
            t = t0 + k * BEAT / 2
            if on(t): note(t, DR, SHAKER, (40 if k % 2 else 52) * soft, 0.1)
        for k in (0, 2):
            if on(t0 + k * BEAT): note(t0 + k * BEAT, BASS, pitch(root) - 12 + (7 if k == 2 else 0), 70 * soft, 0.9)
    if lvl >= 3:
        for k in range(4):
            t = t0 + k * BEAT
            if on(t): note(t, DR, KICK if k % 2 == 0 else SIDE, (58 if k % 2 == 0 else 50) * soft, 0.1)
    if lvl >= 5:
        for p in up: note(t0, HORN, p, 56 * soft, BAR * 0.95, human=False)
        for p in up: note(t0, STR, pitch(p) + 12, 44 * soft, BAR * 0.98, human=False)
        for k in range(8): note(t0 + k * BEAT / 2, DR, RIDE, (46 if k % 2 else 56) * soft, 0.2)
        note(t0, TIMP, 36 + pitch(root) % 12, 70, 0.6)
        if (b - int(SC["galaxy"] // BAR)) % 4 == 0:
            for k, p in enumerate(sorted(tones(t0, 0) + tones(t0, 1) + tones(t0, 2))): note(t0 + k * 0.07, HARP, p, 56, 0.9)
# chapter turns: a rolled chord on the downbeat of each new scene
for s in ORDER[1:-1]:
    t0 = SC[s]; root, up = CHORDS[chord_at(t0)]
    for k, p in enumerate([root, *up, pitch(up[0]) + 12]): note(t0 + k * 0.035, PIANO, p, 66, 1.6)

# ---- events: notes in key where the picture moves ----------------------------------------------------
def sparkle(t, inst=CEL, n=1, vel=64, octave=1, step=0.09):
    ts = tones(t, octave)
    for k in range(n): note(t + k * step, inst, ts[k % 3] + 12 * (k // 3), vel, 0.6)
def fifth(t, vel=70, inst=CEL):
    g = pitch("D6"); note(t, inst, g, vel, 0.4); note(t + 0.15, inst, g + 5, vel + 4, 0.8)
def fall(t, vel=80):
    note(t, CEL, "B5", vel, 0.22); note(t + 0.18, CEL, "F#5", vel - 6, 0.4)
def gliss(t, up=True, dur=0.6, lo="G3", hi="G6", vel=58):
    ps = [p for p in range(pitch(lo), pitch(hi) + 1) if p % 12 in (0, 2, 4, 7, 9, 11)]
    ps = ps if up else ps[::-1]
    for k, p in enumerate(ps): note(t + k * dur / len(ps), HARP, p, vel, 0.5, human=False)
MOTIF = [("D5", 0, 0.5), ("G5", 0.5, 0.5), ("A5", 1.0, 0.5), ("B5", 1.5, 1.5)]   # the name: four notes up
def motif(t, inst, vel, octave=0):
    for p, at, ln in MOTIF: note(t + at, inst, pitch(p) + 12 * octave, vel, ln)

# 0. the fleet appears, one booth, the name
pent = [p for p in range(pitch("G5"), pitch("G7")) if p % 12 in (7, 9, 11, 2, 4)]
for k in range(14): note(CUE["fleet"] + 0.1 + k * 0.12, CEL, pent[k % len(pent)], 42 + k, 0.4)
gliss(CUE["zoom"] - 0.2, True, 0.8, vel=50)
for key, p in (("pc", "D6"), ("cams", "G6"), ("progs", "B6")): note(CUE[key], GLOCK, p, 62, 0.8)
gliss(CUE["watch"] + 0.9, True, 1.4, "G2", "D5", vel=46)
br = CUE["brand"]
note(br, DR, CRASH, 54, 2.0)
for k, p in enumerate(("G1", "G2", "D3", "B3", "D4", "G4")): note(br + k * 0.03, PIANO, p, 78, 3.6, human=False)
for p in ("G3", "B3", "D4", "G4"): note(br, STR, p, 56, 3.8, human=False)
motif(br + 0.6, GLOCK, 78); motif(br + 0.6, PIANO, 62, 0)

# 1. the agent: a note per sense, climbing; the heartbeat on the marimba; two channels
for k, at in enumerate(CUE["sense"]): note(at, CEL, ("G5", "A5", "B5", "C6", "D6", "E6", "F#6", "G6")[k], 64, 0.5)
note(CUE["lines"], PIZZ, "B4", 70, 0.2); note(CUE["lines"] + 0.12, PIZZ, "C5", 66, 0.2)
for k in range(int((CUE["two"] - CUE["beat"]) / BAR) + 1):
    t = CUE["beat"] + k * BAR; note(t, MARIM, "G4", 70, 0.2); note(t + 0.22, MARIM, "D5", 62, 0.2)
gliss(CUE["report"], True, 0.5, "G4", "G6", vel=50)
sparkle(CUE["two"], GLOCK, 2, 60, 2); note(CUE["data"], GLOCK, "B6", 60, 0.6); note(CUE["ctrl"], GLOCK, "D7", 60, 0.6)
sparkle(CUE["panel"], CEL, 3, 58)

# 2. the sweep pings each time it passes the top; a failure falls; the bell rings; a flicker passes
t = CUE["sweep"]
while t < SC["ck36"] - 0.5: note(t, CEL, "E6", 38, 0.3); t += BAR
fall(CUE["fail"])
for k in range(6): note(CUE["flagged"] + k * 0.2, DR, WOOD, 52 + 3 * k, 0.05)
note(CUE["bell"], GLOCK, "E6", 76, 0.6); note(CUE["bell"] + 0.2, GLOCK, "B6", 80, 1.0)
gliss(CUE["out"], True, 0.3, "E5", "E6", vel=48)
note(CUE["flicker"] + 0.3, PIZZ, "D5", 60, 0.2); note(CUE["calm"], GLOCK, "G6", 58, 0.8)

# 2b. CK36: the woodblock counts the 23 seconds, a celesta for each alert
for k in range(23): note(CUE["ckDark"] + k * (CUE["ckFlag"] - CUE["ckDark"]) / 23, DR, WOOD, 60 + k, 0.05)
for k in range(4): fall(CUE["ckFlag"] + k * 0.12, 78 - 2 * k)

# 3. the map draws itself; names find their lanes; one lane breaks
gliss(CUE["draw"] + 0.2, True, 1.6, "G3", "G6", vel=50)
for key in ("entry", "exit", "shared"): sparkle(CUE[key] + 0.7, CEL, 2, 60)
fifth(CUE["name"])
for k in range(3): note(CUE["green"] + 0.2 + k * 0.25, MARIM, ("G5", "B5", "D6")[k], 60, 0.2)
note(CUE["red"], PIZZ, "E4", 72, 0.3); note(CUE["red"], PIZZ, "G4", 66, 0.3); fall(CUE["which"])

# 4. the camera, the remote screen, the key that stays put, the record
sparkle(CUE["live"], GLOCK, 2, 64, 2); gliss(CUE["screen"], True, 0.5, "D4", "D6", vel=50)
note(CUE["mouse"] + 1.0, MARIM, "D6", 66, 0.2)
note(CUE["pw"] + 1.2, CEL, "D6", 66, 0.4); note(CUE["never"], PIZZ, "F#4", 64, 0.2); note(CUE["never"] + 0.15, PIZZ, "G4", 60, 0.2)
note(CUE["rec"], GLOCK, "A6", 62, 0.8)

# 5. four commands up the marimba; the refusal; the record
for k, at in enumerate(CUE["cmd"]): note(at, MARIM, ("G4", "B4", "D5", "G5")[k], 70, 0.25)
gliss(CUE["allow"] + 0.6, True, 2.4, "G4", "G6", vel=40); fifth(CUE["allow"] + 3.2)
hit = CUE["shell"] + 0.9
note(hit, PIZZ, "B3", 84, 0.25); note(hit, PIZZ, "C4", 84, 0.25)
note(CUE["job"], CEL, "G6", 56, 0.4); fifth(CUE["how"], 66)

# 6. stamped, carried, checked, installed; the fall and the roll back; the self-update's two endings
note(CUE["sign"] + 0.9, GLOCK, "G6", 74, 0.8); note(CUE["sign"] + 0.9, DR, SIDE, 62, 0.1)
gliss(CUE["ship"], True, 1.4, "D4", "D6", vel=44)
fifth(CUE["sig"]); fifth(CUE["sum"], 66)
note(CUE["backup"], MARIM, "B5", 62, 0.2); note(CUE["install"], GLOCK, "D7", 64, 0.6)
gliss(CUE["fault"], False, 0.45, "G4", "G6", vel=60)                 # the rewind: down
gliss(CUE["back"], True, 0.6, "G4", "G6", vel=56); note(CUE["back"] + 0.6, GLOCK, "G6", 72, 1.0)
note(CUE["swap"], MARIM, "D5", 64, 0.2); note(CUE["swap"] + 0.5, MARIM, "G5", 64, 0.2)
for k in range(4): note(CUE["wait"] + k * 0.4, DR, WOOD, 54, 0.05)
fifth(CUE["wait"] + 1.4, 66); fall(CUE["restore"], 72)

# 7. a timpani roll into the galaxy; beacons; the dive; the car park
g0 = SC["galaxy"]
for k in range(16): note(g0 + k * 0.125, TIMP, "D2", 40 + 3 * k, 0.2)
note(CUE["become"], DR, CRASH, 66, 2.0); motif(CUE["become"], HORN, 76, -1); motif(CUE["become"], GLOCK, 70, 1)
note(CUE["beacon"], GLOCK, "E6", 70, 0.6); note(CUE["beacon"] + 0.2, GLOCK, "B6", 72, 0.8)
gliss(CUE["fly"] - 0.2, True, 1.0, "G3", "G6", vel=60)
note(CUE["park"], DR, CRASH, 50, 1.6); sparkle(CUE["parts"], CEL, 2, 60)
for k in range(8): note(CUE["free"] + 0.1 + k * 0.14, GLOCK, pent[k], 50 + 2 * k, 0.3)

# 8. one account each; four roles up the glockenspiel; the scope lens; the audit; the CSV
sparkle(CUE["signin"], CEL, 2, 58)
for k in range(4): note(CUE["roles"] + 0.3 + k * 0.9, GLOCK, ("G5", "B5", "D6", "G6")[k], 64, 0.6)
gliss(CUE["scope"], True, 1.2, "G4", "D6", vel=44)
note(CUE["audit"], MARIM, "G5", 62, 0.2); fifth(CUE["export"] + 0.4)

# 9. the numbers count up; a fifth where each lands
note(SC["built"] + 0.5, STR, "G4", 50, 3.6, human=False)
for key in ("changes", "releases", "tests"):
    for k in range(8): note(CUE[key] + k * 0.16, CEL, pent[(k + 2) % len(pent)], 40 + 2 * k, 0.2)
    fifth(CUE[key] + 1.4, 70)

# 10. the end: dominant, held, then everything on G at "Know first."
e0 = SC["end"]
for p in ("D3", "A3", "D4", "F#4"): note(e0, STR, p, 48, FINAL - e0 - 0.05, human=False)
note(e0, BASS, "D2", 60, FINAL - e0 - 0.05)
for k, p in enumerate(("D5", "E5", "F#5")): note(FINAL - 0.375 + k * 0.125, PIANO, p, 76, 0.1)
for k, p in enumerate(("G1", "G2", "D3", "B3", "D4", "G4", "B4", "D5", "G5")): note(FINAL + k * 0.03, PIANO, p, 92 - 2 * k, 4.0, human=False)
for p in ("G3", "B3", "D4", "G4"): note(FINAL, STR, p, 60, 4.0, human=False); note(FINAL, HORN, p, 56, 3.0, human=False)
note(FINAL, TIMP, "G2", 76, 1.0); note(FINAL, DR, CRASH, 58, 3.0); note(FINAL + 0.1, GLOCK, "G6", 78, 2.0)
gliss(FINAL, True, 0.8, "G3", "G6", vel=50)

# ---- write, render, mix under the narration -----------------------------------------------------------
mid, music_wav = OUT.with_suffix(".mid"), OUT.with_suffix(".music.wav")
score.midi(mid, PROGRAM)
render(mid, music_wav)
I, TP, clarity = mix(music_wav, TL, ROOT / f"out/{HERE.name}.voice", OUT, duck=0.38)
print(f"voice sits {clarity:.1f} dB above the music while speaking")
print(f"wrote {OUT}  ({len(score.ev)} notes, {I} LUFS, {TP} dBTP)")
