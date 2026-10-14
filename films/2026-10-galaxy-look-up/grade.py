"""Offline grades on captured footage, done per pixel because canvas blending cannot do them exactly.

    uv run --with numpy films/2026-10-galaxy-look-up/grade.py rise|earth

rise  -> shots/riseg: the bulge's glow is a disc centred on the frame whose last ~12 levels stop dead at
         its rim (radius measured per frame, as a fraction of the frame height). Subtract that warm step over
         the outer part of the disc, clamped at black so nothing outside is lifted, and add seeded noise
         inside the disc to break up its 8-bit bands.
earth -> shots/earthg: as the camera turns onto the night side (frames 200-270) the ambient-lit surface
         drops toward black (the frame times itself), the warm city lights are lifted 1.5x, and the pink
         twilight band and the aurora plumes past the poles lose half their saturation.
"""
import json, pathlib, subprocess, sys, numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = ROOT / "out/galaxy-look-up/shots"
W, H = 3840, 2160
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
rr = np.hypot(xx - W / 2, yy - H / 2)
rng = np.random.default_rng(20261014)
HALO = [[0, .524], [60, .528], [120, .517], [180, .489], [240, .448], [300, .404], [360, .357], [420, .317],
        [480, .283], [540, .257], [600, .237], [659, .228]]


def smooth(a, b, x):
    x = np.clip((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x)


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.float32)


def save(img, path):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-i", "-", "-q:v", "2", str(path)],
                   input=np.clip(np.rint(img), 0, 255).astype(np.uint8).tobytes(), check=True)


def rise(img, f):
    R = np.interp(f, [p[0] for p in HALO], [p[1] for p in HALO]) * H
    ring = smooth(0.55 * R, 0.995 * R, rr) * (rr < 1.06 * R)  # 0 inside, the full step from the rim to just past it
    img -= ring[..., None] * np.array([12, 11, 8], np.float32)
    inside = rr < R
    img[inside] += rng.uniform(-3, 3, (int(inside.sum()), 1)).astype(np.float32)
    return img


def earth(img, f):
    k = float(smooth(200, 270, np.float32(f)))
    luma = img @ np.array([0.299, 0.587, 0.114], np.float32)
    disc = luma > 10                                      # the planet (and its glow) against black space
    R = np.sqrt(disc.sum() / np.pi)
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    if k > 0:
        img *= (1 - 0.6 * k + 0.6 * k * img / 255)        # night side toward black; bright lights barely move
        lights = np.clip((r - b - 40) / 40, 0, 1) * np.clip((luma - 60) / 40, 0, 1) * k
        img *= 1 + 0.5 * lights[..., None]
    luma = img @ np.array([0.299, 0.587, 0.114], np.float32)
    pink = np.clip((img[..., 0] - img[..., 1] - 15) / 30, 0, 1) * np.clip((img[..., 2] - img[..., 1] + 5) / 30, 0, 1)
    outside = smooth(1.0 * R, 1.06 * R, rr)               # the aurora plumes and glows past the limb
    desat = 0.5 * np.maximum(pink, outside)
    return img + (luma[..., None] - img) * desat[..., None]


which = sys.argv[1]
src, dst, n = {"rise": ("rise", "riseg", 500), "earth": ("earth", "earthg", 300)}[which]
(SHOTS / dst).mkdir(parents=True, exist_ok=True)
for f in range(n):
    save(globals()[which](load(SHOTS / src / f"{f:05d}.jpg"), f), SHOTS / dst / f"{f:05d}.jpg")
    if f % 100 == 0: print(f"  {f}/{n}")
(SHOTS / dst / "meta.json").write_text(json.dumps({**json.loads((SHOTS / src / "meta.json").read_text()), "frames": n}))
print(f"graded {n} frames -> {SHOTS / dst}")
