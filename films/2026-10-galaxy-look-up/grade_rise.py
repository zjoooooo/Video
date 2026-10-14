"""Grades the Milky Way rise: feathers away the hard rim of the bulge's glow and dithers inside it.

    uv run --with numpy films/2026-10-galaxy-look-up/grade_rise.py

The glow is a disc centred on the frame whose last ~12 levels stop dead at its rim (radius measured per
frame, as a fraction of the frame height). Each frame of out/galaxy-look-up/shots/rise gets that warm
step subtracted over the outer part of the disc, clamped at black, so nothing outside is lifted, plus
seeded noise inside the disc to break up its 8-bit bands. Writes shots/riseg (the film plays that).
"""
import json, pathlib, subprocess, numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC, DST = ROOT / "out/galaxy-look-up/shots/rise", ROOT / "out/galaxy-look-up/shots/riseg"
HALO = [[0, .524], [60, .528], [120, .517], [180, .489], [240, .448], [300, .404], [360, .357], [420, .317],
        [480, .283], [540, .257], [600, .237], [659, .228]]
STEP = np.array([12, 11, 8], np.float32)                  # the glow's colour just inside its rim
W, H = 3840, 2160
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
rr = np.hypot(xx - W / 2, yy - H / 2)
rng = np.random.default_rng(20261014)


def smooth(a, b, x):
    x = np.clip((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x)


def grade(f):
    R = np.interp(f, [p[0] for p in HALO], [p[1] for p in HALO]) * H
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(SRC / f"{f:05d}.jpg"), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    img = np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.float32)
    ring = smooth(0.55 * R, 0.995 * R, rr) * (rr < 1.06 * R)  # 0 inside, the full step from the rim to just past it
    img -= ring[..., None] * STEP
    inside = rr < R
    img[inside] += rng.uniform(-3, 3, (int(inside.sum()), 1)).astype(np.float32)
    out = np.clip(np.rint(img), 0, 255).astype(np.uint8)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-i", "-",
                    "-q:v", "2", str(DST / f"{f:05d}.jpg")], input=out.tobytes(), check=True)


DST.mkdir(parents=True, exist_ok=True)
N = 500                                                   # the film plays frames 0-480
for f in range(N):
    grade(f)
    if f % 100 == 0: print(f"  {f}/{N}")
(DST / "meta.json").write_text(json.dumps({**json.loads((SRC / "meta.json").read_text()), "frames": N}))
print(f"graded {N} frames -> {DST}")
