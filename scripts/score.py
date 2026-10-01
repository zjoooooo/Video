"""Synthesizes the score from the renderer's event list, so every sound sits on a visual event.

    uv run --with numpy scripts/score.py out/<film>.events.json out/score.wav

events.json: {bpm, duration,
  cuts:  [[t, transition type]],            push | wipe | strips | iris | dot
  hits:  [[t, kind, x 0..1, amp]],          type | pop | mark | done | hero | alert | soft
  runs:  [[t, count, spacing, x0, x1]],     fast sequences
  rolls: [[t0, t1, x]]}                     count-ups
Each kind of hit has its own voice, its pitch follows the chord of the bar it lands in, and each
scene uses a different melodic contour. Output is mastered to -14 LUFS / -1.5 dBTP.
"""
import json, re, subprocess, sys, wave
from collections import Counter
import numpy as np

SR = 48000
ev = json.load(open(sys.argv[1]))
out = sys.argv[2]
BEAT = 60 / ev["bpm"]
BAR, S16 = 4 * BEAT, BEAT / 4
DUR = ev["duration"]
N = int(DUR * SR)
rng = np.random.default_rng(7)                       # seeded: same events, same score

# ---- arrangement (tunables) --------------------------------------------------
CHORD = {                                            # bass root, pad voicing (MIDI)
    "C": (36, [60, 64, 67]), "G": (31, [59, 62, 67]), "Am": (33, [60, 64, 69]),
    "F": (29, [60, 65, 69]), "Dm": (38, [62, 65, 69]),
}
# One entry per bar, chord:section. Scene changes fall on these bar lines.
BARS = ("C:intro C:intro  C:A G:A Am:A  F:A C:A  Am:B F:B  C:B G:B  Am:B F:B  Dm:C Am:C G:C  "
        "F:D G:build Am:B G:B  F:B G:fill  Am:F F:F G:F  C:out C:out").split()
# 16 steps per bar. X accent, x normal, o ghost.
DRUMS = {
    "A":     dict(kick="X.......x.......", hat="..x...x...x...x."),
    "B":     dict(kick="X...x...x...x...", clap="....x.......x...", hat="o.X.o.X.o.X.o.Xo"),
    "C":     dict(rim="....x..o....x...", hat="..x...x...x...x."),
    "D":     dict(kick="X.....x.x.......", rim="....x.......x...", hat="o.X.o.X.o.X.o.X."),
    "build": dict(kick="X.....x.........", rim="....x...........", hat="o.X.o.X.........", snare="........xxxxXXXX"),
    "fill":  dict(kick="X...x...x.......", clap="....x...........", hat="o.X.o.X.o.X.....", tom="............XxXx"),
    "F":     dict(kick="X..o............"),
}
BASS = {                                             # step -> semitones above the root
    "B": {0: 0, 3: 0, 6: 12, 8: 0, 11: 0, 14: 7}, "D": {0: 0, 6: 0, 8: 12, 14: 7},
    "build": {0: 0, 4: 0, 8: 0, 10: 0, 12: 12, 14: 12}, "fill": {0: 0, 3: 0, 6: 12, 8: 0},
}
CONTOUR = [                                          # which rung of the chord ladder the n-th hit of a scene takes
    [0, 1, 2, 3, 4, 5, 6, 7], [5, 4, 3, 2, 1, 0, 2, 4], [0, 2, 1, 3, 2, 4, 3, 5],
    [4, 2, 3, 1, 2, 0, 1, 3], [0, 3, 1, 4, 2, 5, 3, 6],
]
LEVEL = dict(pad=0.18, bass=0.22, arp=0.045, kick=0.50, clap=0.20, hat=0.055, rim=0.12, snare=0.20, tom=0.30,
             type=0.30, pop=0.30, mark=0.24, done=0.22, hero=0.24, alert=0.26, soft=0.20,
             run=0.11, roll=0.09, cut=0.14)

hz = lambda m: 440 * 2 ** ((m - 69) / 12)
T = lambda d: np.arange(int(d * SR)) / SR
attack = lambda t, a: np.minimum(t / a, 1)
bus = {k: np.zeros((N, 2)) for k in ("pad", "bass", "drums", "fx", "sfx")}

def put(name, t, sig, gain=1.0, pan=0.0):
    """Adds a mono signal at time t. pan is -1..1 (equal power), a number or one value per sample."""
    a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    st = np.stack([sig * np.cos(a), sig * np.sin(a)], 1) * gain
    i = int(round(t * SR))
    if i < 0: st, i = st[-i:], 0
    st = st[: max(0, N - i)]
    bus[name][i:i + len(st)] += st

def noise(d, lo, hi):                                # band-limited noise, FFT mask with soft edges
    n = int(d * SR)
    f = np.fft.rfftfreq(n, 1 / SR)
    mask = np.clip((f - lo) / (0.2 * lo + 1), 0, 1) * np.clip((hi - f) / (0.2 * hi), 0, 1)
    y = np.fft.irfft(np.fft.rfft(rng.standard_normal(n)) * mask, n)
    return y / np.abs(y).max()

def sweep(d, f0, f1, width=500):                     # noise band whose centre glides f0 -> f1
    n = int(d * SR)
    phase = 2 * np.pi * np.cumsum(np.geomspace(f0, f1, n)) / SR
    return noise(d, 0, width) * np.sin(phase)

swell = lambda sig: sig * np.sin(np.linspace(0, np.pi, len(sig))) ** 2

# ---- voices ------------------------------------------------------------------
def pluck(f, d=0.9):                                 # words arriving: a plucked string
    t = T(d)
    return sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (3 + 2.2 * k)) / k for k in range(1, 9) if f * k < 12000) * attack(t, 0.002)

def marimba(f, d=0.5):                               # dots and markers: wood
    t = T(d)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 30)
            + 0.12 * np.sin(2 * np.pi * 9.2 * f * t) * np.exp(-t * 60)) * attack(t, 0.001)

def chime(f, d=2.0):                                 # completed: metal bar, inharmonic partials
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k)
               for r, a, k in ((1, 1, 3), (2.76, 0.5, 4.5), (5.4, 0.25, 7), (8.93, 0.12, 10)) if f * r < 15000) * attack(t, 0.001)

def felt(f, d=0.7):                                  # low priority: soft and round
    t = T(d)
    return (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 6) * attack(t, 0.015)

def celesta(f, d=1.2):                               # needs attention: clear and gentle
    t = T(d)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6)
            + 0.15 * np.sin(6 * np.pi * f * t) * np.exp(-t * 10)) * np.exp(-t * 4.5) * attack(t, 0.004)

def glass(f, d=1.8):                                 # big number: crystal with a small tine click, slow to fade
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k)
               for r, a, k in ((1, 1, 2.6), (2, 0.3, 4), (3.01, 0.15, 6), (6.27, 0.2, 40))) * attack(t, 0.004)

def thud(f0=120, f1=48, d=0.6, k=7):                 # kick, toms and the flood transition
    t = T(d)
    return np.sin(2 * np.pi * (f1 * t + (f0 - f1) / 22 * (1 - np.exp(-22 * t)))) * np.exp(-t * k)

def ladder(t):                                       # chord tones plus the 9th over two octaves, low to high
    root, tones = CHORD[BARS[min(int(t // BAR), len(BARS) - 1)].split(":")[0]]
    pcs = sorted({m % 12 for m in tones} | {(root + 2) % 12})
    return [72 + 12 * o + pc for o in (0, 1) for pc in pcs]

def play(kind, t, m, x, amp):
    pan, g = (x - 0.5) * 1.4, LEVEL[kind] * amp
    if kind == "type":
        put("fx", t, pluck(hz(m - 12)), g, pan)
    elif kind == "pop":
        put("fx", t, marimba(hz(m)), g, pan)
    elif kind == "mark":
        put("fx", t, chime(hz(m)), g, pan); put("fx", t, marimba(hz(m - 12)), g * 0.5, pan)
    elif kind == "soft":
        put("fx", t, felt(hz(m - 12)), g, pan)
    elif kind == "alert":                            # two notes falling a fourth, a sixteenth apart
        top = m if m <= 84 else m - 12
        put("fx", t, celesta(hz(top)), g, pan); put("fx", t + S16, celesta(hz(top - 5)), g * 0.85, pan)
    elif kind == "hero":                             # open fifth in glass with a breath of air on top
        top = m if m <= 84 else m - 12
        for semis, a in ((-12, 1), (-5, 0.7), (0, 0.8)):
            put("fx", t, glass(hz(top + semis)), g * a, pan * 0.5)
        put("fx", t, noise(0.3, 7000, 14000) * np.exp(-T(0.3) * 16), g * 0.12, pan)
    elif kind == "done":                             # the chord itself, rolled upward
        tones = sorted(CHORD[BARS[min(int(t // BAR), len(BARS) - 1)].split(":")[0]][1])
        for j, c in enumerate(tones + [tones[0] + 12]):
            put("fx", t + j * 0.07, chime(hz(c + 12)), g, pan + (j - 1.5) * 0.15)
            put("fx", t + j * 0.07, pluck(hz(c)), g * 0.7, pan)

# ---- harmony -----------------------------------------------------------------
kicks = []
for b, spec in enumerate(BARS):
    name, sec = spec.split(":")
    root, tones = CHORD[name]
    t0 = b * BAR
    # pad
    dark, last = sec == "F", sec == "out" and b == len(BARS) - 2
    if not (sec == "out" and not last):
        weights = (1, 0.2, 0.06) if dark else (1, 0.45, 0.25, 0.12, 0.06) if sec in ("B", "D", "build", "fill") else (1, 0.3, 0.12)
        d = (2 * BAR if last else BAR) + 0.5
        for j, m in enumerate(tones + ([tones[0] + 12] if last else [])):
            f = hz(m - (12 if dark else 0))
            t = T(d)
            s = sum(w * (np.sin(2 * np.pi * f * (k + 1) * t) + np.sin(2 * np.pi * f * 1.004 * (k + 1) * t)) for k, w in enumerate(weights))
            e = attack(t, 0.35) * np.clip((d - t) / 0.6, 0, 1)
            put("pad", t0, s * e, LEVEL["pad"] / 3, (j - 1) * 0.5)
    # bass
    def note(step, semis, steps=2, decay=4.0, gain=1.0):
        t = T(steps * S16)
        f = hz(root + semis)
        s = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t))
        put("bass", t0 + step * S16, s * np.exp(-t * decay) * attack(t, 0.005) * np.clip((t[-1] - t) / 0.02, 0, 1), LEVEL["bass"] * gain)
    if sec in BASS:
        steps = sorted(BASS[sec])
        for a, nxt in zip(steps, steps[1:] + [16]):
            note(a, BASS[sec][a], nxt - a, gain=0.8 if BASS[sec][a] else 1)
    elif sec in ("A", "C"):
        note(0, 0, 14, decay=0.9, gain=0.9 if sec == "A" else 0.7); note(14, 7, 2, gain=0.6)
    elif sec == "F":
        note(0, 0, 16, decay=0.35, gain=1.1)
    elif last:
        note(0, 0, 32, decay=0.6, gain=1.0)
    # arpeggio, only where the groove is full
    if sec == "B":
        for k in range(16):
            m = (tones + [tones[0] + 12])[[0, 1, 2, 3, 2, 1][k % 6]] + 12
            put("fx", t0 + k * S16, pluck(hz(m), 0.25), LEVEL["arp"] * (1.3 if k % 4 == 2 else 1), 0.45 if k % 2 else -0.45)
    # drums
    pat = dict(DRUMS.get(sec, {}))
    if sec == "B" and b % 2:                         # every other bar answers the first
        pat["kick"], pat["open"] = "X...x...x...x.x.", "..............x."
    for inst, steps in pat.items():
        for k, c in enumerate(steps):
            if c == ".": continue
            t = t0 + k * S16
            v = {"X": 1.0, "x": 0.75, "o": 0.4}[c] * (1 + 0.06 * rng.standard_normal())
            if inst == "kick":
                put("drums", t, thud(155, 45, 0.4, 9), LEVEL["kick"] * v); kicks.append((t, v))
            elif inst == "clap":
                e = sum(np.exp(-np.maximum(T(0.25) - d, 0) * r) * (T(0.25) >= d) for d, r in ((0, 120), (0.011, 120), (0.022, 18)))
                put("drums", t, noise(0.25, 900, 3500) * e, LEVEL["clap"] * v, 0.1)
            elif inst == "hat":
                put("drums", t, noise(0.06, 6000, 16000) * np.exp(-T(0.06) * 80), LEVEL["hat"] * v, 0.25)
            elif inst == "open":
                put("drums", t, noise(0.3, 6000, 16000) * np.exp(-T(0.3) * 12), LEVEL["hat"] * 1.2 * v, 0.25)
            elif inst == "rim":
                put("drums", t, (np.sin(2 * np.pi * 1700 * T(0.06)) + 0.5 * noise(0.06, 2000, 8000)) * np.exp(-T(0.06) * 90), LEVEL["rim"] * v, -0.2)
            elif inst == "snare":                    # roll that doubles its speed and rises into the next bar
                for h in range(2 if k >= 12 else 1):
                    grow = 0.25 + 0.75 * (k - 8 + h / 2) / 8
                    put("drums", t + h * S16 / 2, 0.5 * np.sin(2 * np.pi * 190 * T(0.18)) * np.exp(-T(0.18) * 25)
                        + noise(0.18, 1200, 9000) * np.exp(-T(0.18) * 22), LEVEL["snare"] * grow)
            elif inst == "tom":
                put("drums", t, thud(*[(260, 210), (220, 175), (180, 140), (140, 110)][k - 12], 0.35, 9), LEVEL["tom"] * v, (k - 13.5) * 0.3)
    if sec == "build":
        put("sfx", t0, sweep(BAR, 400, 6000, 900) * np.linspace(0, 1, int(BAR * SR)) ** 2, LEVEL["cut"] * 1.2)

# pad and bass breathe with the kick
duck = np.ones(N)
for t, v in kicks:
    i, n = int(t * SR), int(0.25 * SR)
    seg = duck[i:i + n]
    seg[:] = np.minimum(seg, 1 - 0.4 * v * np.exp(-np.arange(len(seg)) / SR * 14))
bus["pad"] *= duck[:, None]; bus["bass"] *= duck[:, None]

# ---- events ------------------------------------------------------------------
cuts = [c[0] for c in ev["cuts"]]
scene_of = lambda t: sum(1 for c in cuts if t >= c - 0.01)
seen, played = {}, []
for t, kind, x, amp in ev["hits"]:
    s = scene_of(t); i = seen[s] = seen.get(s, -1) + 1
    rungs = ladder(t)
    m = rungs[CONTOUR[s % len(CONTOUR)][i % 8] % len(rungs)]
    play(kind, t, m, x, amp); played.append((kind, m))

for t, n, dt, x0, x1 in ev["runs"]:                  # fast sequences become a scale run, never denser than 16 notes a second
    skip = max(1, int(np.ceil(0.06 / dt)))
    rungs = ladder(t)
    for j, i in enumerate(range(0, n, skip)):
        m = rungs[j % len(rungs)] + 12 * (j // len(rungs) % 2)
        put("fx", t + i * dt, marimba(hz(m), 0.25), LEVEL["run"] * (0.6 + 0.4 * i / n), (x0 + (x1 - x0) * i / n - 0.5) * 1.4)

for t0, t1, x in ev["rolls"]:                        # count-ups: a tone that climbs an octave, fluttering, into the landing
    d = t1 - t0; t = T(d)
    f = hz(ladder(t0)[0] - 12) * 2 ** (t / d)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 16 * t))
    put("fx", t0, tone * (t / d) ** 1.5 * np.clip((d - t) / 0.02, 0, 1), LEVEL["roll"], (x - 0.5) * 1.4)
    put("sfx", t0, sweep(d, 600, 5000) * (t / d) ** 2 * np.clip((d - t) / 0.02, 0, 1), LEVEL["roll"] * 0.8, (x - 0.5) * 1.4)

for t, kind in ev["cuts"]:                           # each transition type has its own sound
    g = LEVEL["cut"]
    if kind == "push":                               # rising rush
        put("sfx", t - 0.3, swell(sweep(0.6, 300, 3200)), g)
    elif kind == "wipe":                             # falls in pitch and crosses the room with the edge
        w = swell(sweep(0.6, 4500, 500))
        put("sfx", t - 0.3, w, g, np.linspace(-0.9, 0.9, len(w)))
    elif kind == "strips":                           # twelve slats, left to right
        for i in range(12):
            put("sfx", t - 0.2 + i * 0.035, noise(0.07, 1200 + i * 250, 5000 + i * 400) * np.exp(-T(0.07) * 45), g * 0.9, -0.9 + i * 0.16)
    elif kind == "iris":                             # breath in, then a bright opening
        d = 0.5; e = np.exp((T(d) - d) * 9)
        put("sfx", t - d + 0.05, noise(d, 3000, 14000) * e, g)
        put("fx", t + 0.05, chime(hz(ladder(t)[2] + 12), 1.5), LEVEL["mark"] * 0.6)
    elif kind == "dot":                              # the flood: low push in, release out
        put("sfx", t - 0.4, thud(90, 40, 0.5, 6), g * 2.2)
        put("sfx", t - 0.4, sweep(0.4, 200, 2400) * np.linspace(0, 1, int(0.4 * SR)) ** 2, g)
        put("sfx", t, sweep(0.45, 2400, 300) * np.linspace(1, 0, int(0.45 * SR)) ** 2, g)

# ---- reverb, glue, fade --------------------------------------------------------
n = int(1.4 * SR)
ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR * 4.2)[:, None]
ir /= np.sqrt((ir ** 2).sum(0))
send = 0.30 * bus["pad"] + 0.25 * bus["fx"] + 0.15 * bus["sfx"] + 0.06 * bus["drums"]
L = N + n - 1
rev = np.stack([np.fft.irfft(np.fft.rfft(send[:, c], L) * np.fft.rfft(ir[:, c], L), L)[:N] for c in (0, 1)], 1)
y = sum(bus.values()) + rev
y = np.tanh(y * 1.3) / 1.3
tail = int(1.8 * SR)
y[-tail:] *= (np.linspace(1, 0, tail) ** 2)[:, None]
y = y / np.abs(y).max() * 0.89

raw = out.replace(".wav", ".raw.wav")
with wave.open(raw, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((y * 32767).astype("<i2").tobytes())

# ---- two-pass loudnorm -------------------------------------------------------
TARGET = "I=-14:TP=-1.5:LRA=11"
p = subprocess.run(["ffmpeg", "-hide_banner", "-i", raw, "-af", f"loudnorm={TARGET}:print_format=json", "-f", "null", "-"],
                   capture_output=True, text=True, check=True)
m = json.loads(re.findall(r"\{[^{}]*\}", p.stderr)[-1])
af = (f"loudnorm={TARGET}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", raw, "-af", af, "-ar", str(SR), out], check=True)

kinds = Counter(k for k, _ in played)
print(f"wrote {out}")
print(f"  {len(played)} hits in {len(kinds)} voices: " + ", ".join(f"{k} {v}" for k, v in kinds.most_common()))
print(f"  {len(set(played))} distinct voice and pitch pairs, {len({m for _, m in played})} pitches")
print(f"  drum sections: {' '.join(dict.fromkeys(s.split(':')[1] for s in BARS))}")
