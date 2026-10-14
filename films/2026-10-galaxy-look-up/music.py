"""The score of "Look Up": hushed piano that opens into full organ, composed to timeline.json, rendered with
real samples, mixed under the narration.

    uv run --with numpy films/2026-10-galaxy-look-up/music.py [out/galaxy-look-up.wav]

D minor until the galaxy, then F major. The hook is one organ chord cut dead. The sky is solo piano with
a celesta for each constellation figure; the Solar System brings a piano ostinato, then strings, then
organ, a different glint on every cut (celesta, harp, glockenspiel). Through the wormhole a timpani roll
and a cymbal swell rise into the burst: organ, choir, strings and timpani on F. A timpani hit lands on
M87's jet. At the twist everything falls away to the piano, which restates the opening motif and ends on
a held F major chord at the URL. Needs fluidsynth and MuseScore_General.sf3 in ~/Library/Audio/Sounds/Banks.
"""
import json, pathlib, sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from narrated import BEAT, BAR, Score, mix, pitch, render

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out/galaxy-look-up.wav"
TL = json.loads((HERE / "timeline.json").read_text())
CUE, DUR, SC = TL["cue"], TL["duration"], TL["scenes"]
score = Score(seed=31)
note = score.note

# ---- instruments (General MIDI; channel 9 is percussion) ---------------------------------------
PIANO, ORGAN, STR, CHOIR, TIMP, CEL, HARP, GLOCK, BASS, DR = 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
PROGRAM = {PIANO: 0, ORGAN: 19, STR: 48, CHOIR: 52, TIMP: 47, CEL: 8, HARP: 46, GLOCK: 9, BASS: 43}
CRASH, RIDE = 49, 51

CHORDS = {   # bass root, upper voicing
    "Dm": ("D2", ["D3", "F3", "A3"]), "Bb": ("Bb1", ["D3", "F3", "Bb3"]), "F": ("F2", ["C3", "F3", "A3"]),
    "C": ("C2", ["C3", "E3", "G3"]), "Gm": ("G1", ["D3", "G3", "Bb3"]), "Am": ("A1", ["C3", "E3", "A3"]),
}
LOOP = {"sky": ["Dm", "Bb", "F", "C"], "go": ["Dm", "Bb", "F", "C"], "burst": ["C", "C", "F", "C", "Dm", "Bb", "C"],
        "beyond": ["Dm", "Bb", "Gm", "C", "F", "Bb", "C"], "twist": ["Dm", "Bb", "F", "C", "F", "F", "F", "F"]}
ORDER = sorted(SC, key=SC.get)
scene_at = lambda t: [s for s in ORDER if SC[s] <= t + 1e-6][-1]
def chord_at(t):                                                    # sky and go loop; later scenes run through once
    s = scene_at(t); seq = LOOP.get(s, ["Dm"]); b = int((t - SC[s] + 1e-6) // BAR)
    return seq[b % len(seq)] if s in ("sky", "go") else seq[min(b, len(seq) - 1)]
tones = lambda t, octave=1: [pitch(p) + 12 * octave for p in CHORDS[chord_at(t)][1]]
speaking = lambda t: any(l["start"] - 0.2 <= t <= l["start"] + l["dur"] + 0.2 for l in TL["lines"])
BURST, JET, TWIST, URL = CUE["burst"], CUE["jet"], CUE["twist"], CUE["url"]
MOTIF = ["A4", "D5", "E5", "F5"]                                   # "look up": four notes rising (5-1-2-3 of D minor)
MOTIF_F = ["C5", "F5", "G5", "A5"]                                 # the same shape in F major
def motif(t, inst, vel, notes=MOTIF, octave=0):
    for k, p in enumerate(notes): note(t + k * 0.5, inst, pitch(p) + 12 * octave, vel, 2.0 if k == 3 else 0.5)

# ---- the hook: one organ chord on the Sun, cut dead on "Look up." ---------------------------------
for p in ("D1", "D2", "A2", "D3", "F3", "A3"): note(0.0, ORGAN, p, 104, CUE["look"] - 0.02, human=False)
note(0.0, TIMP, "D2", 88, 1.2); note(0.0, DR, CRASH, 64, 3.8)
note(CUE["look"] + 0.35, CEL, "A6", 46, 1.6)                       # the words appear

# ---- the bed, bar by bar -----------------------------------------------------------------------------
for b in range(int(DUR / BAR)):
    t0 = b * BAR; s = scene_at(t0)
    if s == "hook": continue
    root, up = CHORDS[chord_at(t0)]
    soft = 0.82 if speaking(t0 + 1.0) else 1.0
    lad = [pitch(up[0]) + 12, pitch(up[1]) + 12, pitch(up[2]) + 12, pitch(up[0]) + 24]
    if s == "sky":                                                  # solo piano: a slow rolled chord
        for k, p in enumerate([root, *up, pitch(up[1]) + 12]): note(t0 + k * 0.14, PIANO, p, 48 * soft, BAR * 0.95)
        continue
    if s == "twist":                                                # the piano alone again, then the final chord
        if t0 + BAR <= URL:
            for k, p in enumerate([root, *up]): note(t0 + k * 0.12, PIANO, p, 46, BAR * 0.95)
        continue
    # go / burst / beyond: the eighth-note ostinato over the chord, densifying into the burst
    late = s == "go" and t0 >= SC["burst"] - 4 * BAR                  # the last four bars before the wormhole
    n = 16 if late or (s == "burst" and t0 < BURST) else 8
    for k in range(n):
        t = t0 + k * BAR / n
        note(t, PIANO, lad[[0, 1, 2, 3, 2, 1, 2, 1][k % 8]], (50 if k % 4 == 0 else 40) * soft * (1.1 if s != "go" else 1), 0.3 if n == 16 else 0.42)
    note(t0, PIANO, root, 58 * soft, BAR * 0.95)
    if s == "go" and t0 >= SC["go"] + 4 * BAR or s != "go":        # strings join after two shots
        for p in up: note(t0, STR, pitch(p) + 12, (34 + (10 if s != "go" else 0) + (8 if late else 0)) * soft, BAR * 0.98, human=False)
        note(t0, BASS, pitch(root) + 12, 48 * soft, BAR * 0.98, human=False)
    if s == "go" and t0 >= SC["go"] + 8 * BAR:                      # organ pad under the last shots
        for p in up: note(t0, ORGAN, p, 34 * soft, BAR * 0.98, human=False)
    if t0 >= BURST - 1e-6:                                          # full: organ, choir, low strings, timpani
        for p in (root, pitch(root) + 12, *up, pitch(up[2]) + 12): note(t0, ORGAN, p, 70 * soft, BAR * 0.98, human=False)
        for p in up: note(t0, CHOIR, pitch(p) + 12, 56 * soft, BAR * 0.98, human=False)
        note(t0, STR, pitch(root) + 12, 52 * soft, BAR * 0.98, human=False)
        note(t0, TIMP, 36 + pitch(root) % 12, 58 * soft, 0.6)
        for k in range(4): note(t0 + k * BEAT, DR, RIDE, (34 if k % 2 else 42) * soft, 0.3)

# ---- events: a different glint on every cut ------------------------------------------------------------
note(SC["sky"], PIANO, "D2", 52, 3.0)
motif(SC["sky"] + 0.5 * BAR, PIANO, 58)
for k, t in enumerate(CUE["figures"]): note(t, CEL, ("A6", "D7")[k % 2], 60, 1.4); note(t + 0.16, CEL, ("D6", "F6")[k % 2], 50, 1.2)
for k, t in enumerate(CUE["planets"][1:], 1):
    inst = (CEL, HARP, GLOCK)[k % 3]
    ts = tones(t, 2); note(t, inst, ts[k % 3], 58, 0.9); note(t + 0.12, inst, ts[(k + 1) % 3] + 12, 52, 0.9)
# the wormhole: timpani roll and cymbal swell rising into the burst, strings climbing D minor to C
w0 = SC["burst"]
rolls = int((BURST - w0) / (BEAT / 4))
for k in range(rolls):
    t = w0 + k * BEAT / 4; f = k / rolls
    note(t, TIMP, "C2", 30 + 60 * f, 0.15, human=False)
    if k % 2 == 0: note(t, DR, RIDE, 20 + 50 * f, 0.2, human=False)
for k, p in enumerate(["D4", "E4", "F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5", "G5", "A5", "Bb5", "C6"]):
    note(w0 + k * (BURST - w0) / 14, STR, p, 44 + 3 * k, (BURST - w0) / 14 + 0.05, human=False)
# the burst: everything on F
for k, p in enumerate(("F1", "F2", "C3", "F3", "A3", "C4", "F4")): note(BURST + k * 0.02, ORGAN, p, 100, 3.8, human=False)
for p in ("F4", "A4", "C5"): note(BURST, CHOIR, p, 76, 3.8, human=False)
note(BURST, TIMP, "F2", 96, 1.4); note(BURST, DR, CRASH, 80, 4.0)
for k, p in enumerate(sorted(tones(BURST, 1) + tones(BURST, 2) + tones(BURST, 3))): note(BURST + 0.05 + k * 0.06, HARP, p, 62, 1.0)
motif(BURST + 2 * BAR, STR, 70, MOTIF_F)                           # the motif returns, now in F
# the jet: timpani hit and a low organ pedal
note(JET, TIMP, "F2", 100, 1.6); note(JET + 0.25, TIMP, "C2", 82, 1.0); note(JET, DR, CRASH, 82, 3.6)
note(JET, ORGAN, "F1", 96, BAR * 2 - 0.1, human=False)
# the twist: a soft cymbal tail, then the piano alone restates the motif; the final chord at the URL
note(TWIST, DR, CRASH, 50, 3.0)
motif(TWIST + 2 * BAR, PIANO, 56)
for k, p in enumerate(("C5", "F5", "G5")): note(URL - 1.5 + k * 0.5, PIANO, p, 60, 0.5)
for k, p in enumerate(("F1", "F2", "C3", "F3", "A3", "C4", "F4", "A4")): note(URL + k * 0.04, PIANO, p, 74 - 2 * k, DUR - URL - 0.2, human=False)
for p in ("F3", "A3", "C4"): note(URL, STR, p, 40, DUR - URL - 0.4, human=False)
note(URL + 0.1, CEL, "A6", 58, 2.0); note(URL + 0.5, CEL, "C7", 50, 2.0); note(URL + 0.9, GLOCK, "F6", 46, 2.4)

# ---- write, render, mix under the narration -----------------------------------------------------------
mid, music_wav = OUT.with_suffix(".mid"), OUT.with_suffix(".music.wav")
score.midi(mid, PROGRAM)
render(mid, music_wav)
I, TP, clarity = mix(music_wav, TL, ROOT / f"out/{HERE.name}.voice", OUT, duck=0.4)
print(f"voice sits {clarity:.1f} dB above the music while speaking")
print(f"wrote {OUT}  ({len(score.ev)} notes, {I} LUFS, {TP} dBTP)")
