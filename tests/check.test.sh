#!/usr/bin/env bash
# render.mjs --check must fail on a film that leaks canvas state between frames,
# and pass on the same film once each frame starts from a reset canvas.
set -u
cd "$(dirname "$0")/.."
node scripts/render.mjs tests/fixtures/leaky.src.html --check --out out/fixture.mp4 >/dev/null 2>&1; leaky=$?
node scripts/render.mjs tests/fixtures/clean.src.html --check --out out/fixture.mp4 >/dev/null 2>&1; clean=$?
if [ "$leaky" -eq 1 ] && [ "$clean" -eq 0 ]; then echo "ok: leaky=$leaky clean=$clean"; else echo "FAIL: leaky=$leaky (want 1) clean=$clean (want 0)"; exit 1; fi
