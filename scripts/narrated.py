"""Shared parts of a narrated film: laying the film out around its voice, and scoring it.

Planning (a film's plan.py):
    P = Planner(HERE)                       # reads voice.json, or estimates from narration.json
    s, e, ph = P.say("line-id", at)         # place a line on a beat; phrases in absolute seconds
    P.cue["name"] = P.beat(P.phrase(ph, 1, 0.3))
    P.write(scenes={...}, duration=P.bar(t))

Scoring (a film's music.py):
    S = Score(seed=7); S.note(t, channel, "G4", velocity, length)
    S.midi(path, {channel: program}); render(mid, wav)
    mix(wav, timeline, voice_dir, out)       # ducks the music under the voice, masters to -14 LUFS

Timing: 120 BPM, 2 s bars. Scene cuts belong on bar lines and cues on beats, so the music can meet them.
Sound bank: MuseScore_General.sf3 (MIT) in ~/Library/Audio/Sounds/Banks, rendered by fluidsynth.
"""
import json, math, pathlib, random, re, struct, subprocess, sys, wave

BPM, BEAT, BAR, SR = 120, 0.5, 2.0, 48000
WPS = 2.55                                              # estimate only: words per second
FONT = pathlib.Path.home() / "Library/Audio/Sounds/Banks/MuseScore_General.sf3"


class Planner:
    def __init__(self, here):
        self.here = pathlib.Path(here)
        self.V, self.estimated = self._voice()
        self.lines, self.cue = [], {}

    def _voice(self):
        narr = json.loads((self.here / "narration.json").read_text())["lines"]
        vf = self.here / "voice.json"
        if vf.exists():
            return {l["id"]: l for l in json.loads(vf.read_text())["lines"]}, False
        est = {}
        for l in narr:                                  # phrases split at punctuation, timed by word count
            parts = [p for p in re.split(r"(?<=[,.:?])\s+", l["text"]) if p]
            t, ph = 0.0, []
            for p in parts:
                d = len(p.split()) / WPS
                ph.append([round(t, 2), round(t + d, 2)]); t += d + 0.25
            est[l["id"]] = {"id": l["id"], "text": l["text"], "dur": round(t - 0.25, 2), "phrases": ph}
        return est, True

    beat = staticmethod(lambda t: math.ceil(t / BEAT - 1e-6) * BEAT)   # next beat at or after t
    bar = staticmethod(lambda t: math.ceil(t / BAR - 1e-6) * BAR)      # next bar line at or after t

    def say(self, lid, at):
        """Places a line on the beat at or after `at`; returns start, end and absolute phrase times."""
        v = self.V[lid]; s = self.beat(at)
        self.lines.append({"id": lid, "start": s, "dur": v["dur"], "text": v["text"]})
        ph = [[s + a, s + b] for a, b in v["phrases"]] or [[s, s + v["dur"]]]
        return s, s + v["dur"], ph

    @staticmethod
    def phrase(ph, i, frac=None):
        """Start of phrase i, or, when the voice split differently, a point frac of the way through."""
        if i < len(ph): return ph[i][0]
        return ph[0][0] + (ph[-1][1] - ph[0][0]) * (frac if frac is not None else i / (i + 1))

    def write(self, scenes, duration):
        rnd3 = lambda v: [round(x, 3) for x in v] if isinstance(v, list) else round(v, 3)
        tl = {"estimated": self.estimated, "bpm": BPM, "duration": duration, "scenes": scenes,
              "cue": {k: rnd3(v) for k, v in self.cue.items()}, "lines": self.lines}
        (self.here / "timeline.json").write_text(json.dumps(tl, indent=1) + "\n")
        print(f"{'estimated' if self.estimated else 'measured'} narration, {duration:.0f} s film")
        for k, v in scenes.items(): print(f"  scene {k:8s} {v:6.1f}")
        for l in self.lines: print(f"  {l['start']:6.1f} +{l['dur']:4.1f}  {l['id']}")
        return tl


NAMES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def pitch(n):                                           # "F#4" -> 66; a number passes through
    if not isinstance(n, str): return n
    m = re.fullmatch(r"([A-G])([#b]?)(-?\d)", n)
    return 12 * (int(m[3]) + 1) + NAMES[m[1]] + {"#": 1, "b": -1, "": 0}[m[2]]


class Score:
    def __init__(self, seed=7):
        self.ev, self.rnd = [], random.Random(seed)     # seeded: the same timeline gives the same score

    def note(self, t, ch, p, vel, length, human=True):
        if human: t += self.rnd.uniform(-0.006, 0.006); vel += self.rnd.randint(-5, 5)
        self.ev.append((max(0.0, t), ch, pitch(p), max(1, min(127, int(vel))), length))

    def midi(self, path, programs):
        """Writes a format-0 MIDI file at 120 BPM: one tempo event, a program per channel, the notes."""
        TPQ, US_PER_Q = 480, int(60e6 / BPM)
        def vlq(n):
            out = [n & 0x7F]
            while n > 0x7F: n >>= 7; out.insert(0, (n & 0x7F) | 0x80)
            return bytes(out)
        msgs = [(0, bytes([0xFF, 0x51, 3]) + US_PER_Q.to_bytes(3, "big"))]
        msgs += [(0, bytes([0xC0 | ch, prog])) for ch, prog in programs.items()]
        for t, ch, p, vel, length in self.ev:
            on, off = round(t * 2 * TPQ), round((t + length) * 2 * TPQ)
            msgs += [(on, bytes([0x90 | ch, p, vel])), (max(off, on + 1), bytes([0x80 | ch, p, 0]))]
        msgs.sort(key=lambda m: (m[0], m[1][0] & 0xF0 == 0x90))   # note-offs before note-ons at the same tick
        track, last = b"", 0
        for tick, m in msgs: track += vlq(tick - last) + m; last = tick
        track += vlq(0) + bytes([0xFF, 0x2F, 0])
        pathlib.Path(path).write_bytes(b"MThd" + struct.pack(">IHHH", 6, 0, 1, TPQ) + b"MTrk" + struct.pack(">I", len(track)) + track)


def render(mid, wav, gain=0.6):
    subprocess.run(["fluidsynth", "-ni", "-q", "-g", str(gain), "-r", str(SR), "-F", str(wav), str(FONT), str(mid)], check=True)


def _read(path):
    import numpy as np                                  # only the score needs numpy; planning runs on plain Python
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        return x.reshape(-1, w.getnchannels())


def _loudness(path):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "loudnorm=I=-14:TP=-1.5:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, check=True)
    j = json.loads(re.findall(r"\{[^{}]*\}", p.stderr)[-1]); return float(j["input_i"]), float(j["input_tp"])


def mix(music_wav, tl, voice_dir, out, duck=0.42):
    """Lays the narration clips on the timeline, dips the music under speech, masters to -14 LUFS /
    -1.5 dBTP with one gain and a peak limiter. Returns (LUFS, dBTP, dB the voice sits above the music)."""
    import numpy as np
    out = pathlib.Path(out); N = int(tl["duration"] * SR)
    music = np.zeros((N, 2), np.float32); m = _read(music_wav)[:N]; music[: len(m)] = m
    voice = np.zeros(N, np.float32)
    for l in tl["lines"]:
        clip = pathlib.Path(voice_dir) / f"{l['id']}.wav"
        if tl["estimated"] or not clip.exists(): continue
        x = _read(clip)[:, 0]; i = int(l["start"] * SR); x = x[: N - i]
        voice[i: i + len(x)] += x
    env = np.abs(voice); k = int(0.01 * SR)              # ducking: fast down, slower up
    env = np.convolve(env, np.ones(k) / k, mode="same")
    target = np.where(env > 0.01, duck, 1.0).astype(np.float32)
    gain = np.empty_like(target); g = 1.0
    down, up = 1 - np.exp(-1 / (0.06 * SR)), 1 - np.exp(-1 / (0.45 * SR))
    for i, v in enumerate(target):                       # ponytail: per-sample loop, ~3 s a minute; vectorise if films get long
        g += (v - g) * (down if v < g else up); gain[i] = g
    bed = music * gain[:, None] * 0.9
    mixed = bed + voice[:, None] * 1.0
    talk = env > 0.01
    db = lambda x: 10 * np.log10(np.mean(x ** 2) + 1e-12)
    clarity = db(voice[talk]) - db(bed[talk].mean(axis=1)) if talk.any() else float("nan")
    tail = int(1.5 * SR); mixed[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2
    raw = out.with_suffix(".raw.wav")
    with wave.open(str(raw), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(mixed / max(1e-9, np.abs(mixed).max()) * 0.89, -1, 1) * 32767).astype("<i2").tobytes())
    I0, _ = _loudness(raw)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-af",
                    f"volume={-14 - I0:.2f}dB,alimiter=limit=0.7:attack=1:release=50:level=0:latency=1", "-ar", str(SR), str(out)], check=True)
    I, TP = _loudness(out)
    if abs(I + 14) > 0.5 or TP > -1.5:
        print(f"warning: the master measures {I} LUFS and {TP} dBTP; the target is -14 LUFS and at most -1.5 dBTP", file=sys.stderr)
    return I, TP, clarity
