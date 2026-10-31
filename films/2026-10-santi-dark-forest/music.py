"""The 三体 film's music: "Interstellar Space Travel" by Lexin_Music (Pixabay licence), untouched, laid under
the narration by narrated.mix(): the music dips under speech and the master lands at -14 LUFS.

    uv run --with numpy films/2026-10-santi-dark-forest/music.py [out/santi-dark-forest.wav]

The film is cut to this track (plan.py snaps its scenes to the track's onsets), so nothing is composed here.
The track is not committed (the Pixabay licence forbids redistributing the file); it lives in out/santi-music/.
"""
import json, pathlib, subprocess, sys

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from narrated import SR, _loudness, mix

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "out/santi-dark-forest.wav"
TL = json.loads((HERE / "timeline.json").read_text())
SRC = ROOT / "out/santi-music/interstellar-space-travel.mp3"
if not SRC.exists(): sys.exit(f"missing {SRC}: https://pixabay.com/music/main-title-interstellar-space-travel-141121/")

music_wav = OUT.with_suffix(".music.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(SRC), "-ac", "2", "-ar", str(SR), "-c:a", "pcm_s16le", str(music_wav)], check=True)
# duck 0.25 (-12 dB): a full orchestra needs a deeper dip than the piano scores did to keep the voice ~6 dB clear
I, TP, clarity = mix(music_wav, TL, ROOT / f"out/{HERE.name}.voice", OUT, duck=0.25)
print(f"voice sits {clarity:.1f} dB above the music while speaking")
gain = -14 - I                                         # mix()'s limiter costs a dense track ~0.6 dB; spend the peak headroom left
if gain > 0.2 and TP + gain <= -1.5:
    pre = OUT.with_suffix(".pre.wav"); OUT.rename(pre)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(pre), "-af", f"volume={gain:.2f}dB", "-c:a", "pcm_s16le", str(OUT)], check=True)
    pre.unlink(); I, TP = _loudness(OUT)
    print(f"made up {gain:.2f} dB the limiter took")
print(f"wrote {OUT}  ({I} LUFS, {TP} dBTP)")
