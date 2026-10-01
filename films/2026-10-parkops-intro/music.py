"""The intro's score: a G-major piano polka composed to timeline.json, rendered with real samples,
then mixed under the narration.

    uv run --with numpy films/2026-10-parkops-intro/music.py [out/parkops-intro.wav]

Story in music: the polka dances while the fleet runs; it stops dead when CK36's lanes go dark;
pizzicato strings tiptoe in E minor while a woodblock counts the 23 seconds and a celesta rings each
alert; a piano glissando brings the polka back, fuller, at "all clear"; it ends on "Know first."
Needs fluidsynth and MuseScore_General.sf3 (MIT; FluidR3 by Frank Wen, FluidR3Mono by Michael Cowgill,
MuseScore_General by S. Christian Collins) in ~/Library/Audio/Sounds/Banks.
"""
import json, pathlib, random, re, struct, subprocess, sys, wave
import numpy as np

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out/parkops-intro.wav"
FONT = pathlib.Path.home() / "Library/Audio/Sounds/Banks/MuseScore_General.sf3"
TL = json.loads((HERE / "timeline.json").read_text())
CUE, DUR = TL["cue"], TL["duration"]
BEAT, BAR, SR = 0.5, 2.0, 48000
rnd = random.Random(7)                                   # seeded: the same timeline gives the same score

# ---- instruments (General MIDI programs; channel 9 is percussion) -------------------------
PIANO, PIZZ, CELESTA, TUBA, GLOCK = 0, 1, 2, 3, 4
PROGRAM = {PIANO: 0, PIZZ: 45, CELESTA: 8, TUBA: 58, GLOCK: 9}
WOOD = 76                                                # hi wood block on channel 9

NAMES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def pitch(n):                                            # "F#4" -> 66
    m = re.fullmatch(r"([A-G])([#b]?)(-?\d)", n)
    return 12 * (int(m[3]) + 1) + NAMES[m[1]] + {"#": 1, "b": -1, "": 0}[m[2]]

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

ev = []                                                  # (seconds, channel, pitch, velocity, length)
def note(t, ch, p, vel, length, human=True):
    if human: t += rnd.uniform(-0.006, 0.006); vel += rnd.randint(-5, 5)
    ev.append((max(0.0, t), ch, pitch(p) if isinstance(p, str) else p, max(1, min(127, int(vel))), length))

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

# ---- a format-0 MIDI file ------------------------------------------------------------------------
TPQ, US_PER_Q = 480, int(60e6 / 120)
def vlq(n):
    out = [n & 0x7F]
    while n > 0x7F: n >>= 7; out.insert(0, (n & 0x7F) | 0x80)
    return bytes(out)
msgs = [(0, bytes([0xFF, 0x51, 3]) + US_PER_Q.to_bytes(3, "big"))]
msgs += [(0, bytes([0xC0 | ch, prog])) for ch, prog in PROGRAM.items()]
for t, ch, p, vel, length in ev:
    on, off = round(t * 2 * TPQ), round((t + length) * 2 * TPQ)
    msgs += [(on, bytes([0x90 | ch, p, vel])), (max(off, on + 1), bytes([0x80 | ch, p, 0]))]
msgs.sort(key=lambda m: (m[0], m[1][0] & 0xF0 == 0x90))   # note-offs before note-ons at the same tick
track, last = b"", 0
for tick, m in msgs: track += vlq(tick - last) + m; last = tick
track += vlq(0) + bytes([0xFF, 0x2F, 0])
mid = OUT.with_suffix(".mid")
mid.write_bytes(b"MThd" + struct.pack(">IHHH", 6, 0, 1, TPQ) + b"MTrk" + struct.pack(">I", len(track)) + track)

# ---- render, then mix under the narration ----------------------------------------------------------------
music_wav = OUT.with_suffix(".music.wav")
subprocess.run(["fluidsynth", "-ni", "-q", "-g", "0.6", "-r", str(SR), "-F", str(music_wav), str(FONT), str(mid)], check=True)
def read(path):
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        return x.reshape(-1, w.getnchannels())
N = int(DUR * SR)
music = np.zeros((N, 2), np.float32); m = read(music_wav)[:N]; music[: len(m)] = m
voice = np.zeros(N, np.float32)
vdir = ROOT / f"out/{HERE.name}.voice"
for l in TL["lines"]:
    clip = vdir / f"{l['id']}.wav"
    if TL["estimated"] or not clip.exists(): continue
    x = read(clip)[:, 0]; i = int(l["start"] * SR); x = x[: N - i]
    voice[i: i + len(x)] += x
# ducking: the music dips under speech (fast down, slower up)
env = np.abs(voice); k = int(0.01 * SR)
env = np.convolve(env, np.ones(k) / k, mode="same")
target = np.where(env > 0.01, 0.42, 1.0).astype(np.float32)
gain = np.empty_like(target); g = 1.0
down, up = 1 - np.exp(-1 / (0.06 * SR)), 1 - np.exp(-1 / (0.45 * SR))
for i, v in enumerate(target):                           # ponytail: per-sample loop, ~3 s for a minute; vectorise if films get long
    g += (v - g) * (down if v < g else up); gain[i] = g
bed = music * gain[:, None] * 0.9
mix = bed + voice[:, None] * 1.0
talk = env > 0.01                                        # how far the voice sits above the music while it speaks
db = lambda x: 10 * np.log10(np.mean(x ** 2) + 1e-12)
clarity = db(voice[talk]) - db(bed[talk].mean(axis=1)) if talk.any() else float("nan")
tail = int(1.5 * SR); mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2
raw = OUT.with_suffix(".raw.wav")
with wave.open(str(raw), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix / max(1e-9, np.abs(mix).max()) * 0.89, -1, 1) * 32767).astype("<i2").tobytes())

def loudness(path):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "loudnorm=I=-14:TP=-1.5:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, check=True)
    j = json.loads(re.findall(r"\{[^{}]*\}", p.stderr)[-1]); return float(j["input_i"]), float(j["input_tp"])
I0, _ = loudness(raw)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-af",
                f"volume={-14 - I0:.2f}dB,alimiter=limit=0.7:attack=1:release=50:level=0:latency=1", "-ar", str(SR), str(OUT)], check=True)
I, TP = loudness(OUT)
if abs(I + 14) > 0.5 or TP > -1.5:
    print(f"warning: the master measures {I} LUFS and {TP} dBTP; the target is -14 LUFS and at most -1.5 dBTP", file=sys.stderr)
print(f"voice sits {clarity:.1f} dB above the music while speaking")
print(f"wrote {OUT}  ({len(ev)} notes, {I} LUFS, {TP} dBTP{', music only: narration not generated yet' if TL['estimated'] else ''})")
