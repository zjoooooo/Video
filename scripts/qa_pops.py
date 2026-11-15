"""Scans a finished MP4 for single-frame pops and dead air.

    uv run --with numpy scripts/qa_pops.py out/film.mp4

A pop is a frame that differs from both neighbours while the neighbours match each other.
"""
import subprocess, sys
import numpy as np

W, H, FPS = 320, 180, 60
raw = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", sys.argv[1],
                      "-vf", f"scale={W}:{H}:flags=area,format=gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
step = np.abs(f[1:] - f[:-1]).mean((1, 2))            # step[i]: frame i -> i+1
skip = np.abs(f[2:] - f[:-2]).mean((1, 2))            # skip[i]: frame i -> i+2
pops = [i + 1 for i in range(len(skip)) if step[i] > 0.5 and step[i + 1] > 0.5 and skip[i] < 0.25 * min(step[i], step[i + 1])]
print(f"{len(f)} frames, largest frame-to-frame change {step.max():.1f}")
print(f"{len(pops)} single-frame pops" + "".join(f"\n  frame {p} at {p / FPS:.3f} s" for p in pops))
still = step < 0.01
runs, start = [], None
for i, s in enumerate(np.append(still, False)):
    if s and start is None: start = i
    if not s and start is not None:
        if i - start >= 1.5 * FPS: runs.append((start / FPS, (i - start) / FPS))
        start = None
print("static for over 1.5 s:", ", ".join(f"{a:.2f} s (+{d:.2f} s)" for a, d in runs) or "none")
sys.exit(1 if pops else 0)
