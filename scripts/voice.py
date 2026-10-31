"""Narration with OpenAI or DashScope CosyVoice text-to-speech, one clip per line, cached so a line is only paid for once.

    python3 scripts/voice.py films/<film>/narration.json            # all lines -> films/<film>/voice.json
    python3 scripts/voice.py films/<film>/narration.json --sample "Text" --voices onyx,ash,sage
    uv run --with dashscope python3 scripts/voice.py films/<film>/narration.json   # when narration.json has "engine": "cosyvoice"

narration.json: {"model", "voice", "instructions", "lines": [{"id", "text"}]}; CosyVoice (natural Mandarin) adds
"engine": "cosyvoice" and an optional "rate" (speech_rate, 0.5-2) in place of "instructions".
The key comes from $OPENAI_API_KEY or ~/.config/openai/key ($DASHSCOPE_API_KEY for CosyVoice) and is never printed.
Clips land in out/<film>.voice/<id>.wav, trimmed of leading and trailing silence, and voice.json
beside narration.json records each line's spoken length and its phrases (speech between pauses of
150 ms or more, in seconds from the clip's start), which the film uses for its timing.
"""
import hashlib, json, os, pathlib, subprocess, sys, urllib.error, urllib.request, wave
from array import array

SR = 48000
args = sys.argv[1:]
spec_path = pathlib.Path(args[0])
spec = json.loads(spec_path.read_text())
film = spec_path.parent.name
cache = pathlib.Path("out") / f"{film}.voice"
cache.mkdir(parents=True, exist_ok=True)


def api_key():
    key = os.environ.get("OPENAI_API_KEY") or ""
    path = pathlib.Path.home() / ".config/openai/key"
    if not key and path.exists():
        key = path.read_text().strip()
    if not key:
        sys.exit("no OpenAI key: set OPENAI_API_KEY or write it to ~/.config/openai/key")
    return key


def speak(text, voice, dest):
    """Fetches one clip as 48 kHz mono WAV unless the same request is already cached."""
    cosy = spec.get("engine") == "cosyvoice"
    req = {"model": spec["model"], "voice": voice, "input": text, "instructions": spec.get("instructions", ""), "response_format": "wav"}
    if cosy: req = {"engine": "cosyvoice", "model": spec["model"], "voice": voice, "input": text, "rate": spec.get("rate", 1.0)}
    tag = hashlib.sha1(json.dumps(req, sort_keys=True).encode()).hexdigest()[:12]
    raw = cache / f"{dest}.{tag}.raw.wav"
    if not raw.exists():
        raw.write_bytes(cosyvoice(req) if cosy else openai(req, dest))
    out = cache / f"{dest}.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", str(out)], check=True)
    return trim(out), phrases(out)


def openai(req, dest):
    r = urllib.request.Request("https://api.openai.com/v1/audio/speech", data=json.dumps(req).encode(),
                               headers={"Authorization": f"Bearer {api_key()}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"OpenAI TTS failed for {dest}: HTTP {e.code} {e.read()[:300].decode(errors='replace')}")


def cosyvoice(req):
    """DashScope CosyVoice over the international websocket; run under `uv run --with dashscope`."""
    import dashscope
    from dashscope.audio.tts_v2 import SpeechSynthesizer, AudioFormat
    dashscope.api_key = os.environ.get("DASHSCOPE_API_KEY") or sys.exit("no DashScope key: set DASHSCOPE_API_KEY")
    dashscope.base_websocket_api_url = "wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference"
    try:
        audio = SpeechSynthesizer(model=req["model"], voice=req["voice"], format=AudioFormat.WAV_48000HZ_MONO_16BIT,
                                  speech_rate=req["rate"]).call(req["input"])
    except Exception as e:
        sys.exit(f"CosyVoice failed for {req['input'][:20]}…: {e!r}")
    return audio or sys.exit(f"CosyVoice returned no audio for {req['input'][:20]}…")


def trim(path, floor=0.004, pad=0.03):
    """Cuts silence off both ends (keeping pad seconds) and returns the clip's length in seconds."""
    with wave.open(str(path)) as w:
        n, data = w.getnframes(), array("h", w.readframes(w.getnframes()))
    lim = int(floor * 32767)
    loud = [i for i in range(0, n, 48) if abs(data[i]) > lim]
    a = max(0, (loud[0] if loud else 0) - int(pad * SR))
    b = min(n, (loud[-1] if loud else n) + int(pad * SR))
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(data[a:b].tobytes())
    return round((b - a) / SR, 3)


def phrases(path, gap=0.15, floor=0.02):
    """[start, end] of each stretch of speech, split at pauses of at least gap seconds."""
    with wave.open(str(path)) as w:
        data = array("h", w.readframes(w.getnframes()))
    hop = SR // 100                                        # 10 ms windows
    loud = [max(abs(v) for v in data[i:i + hop]) > floor * 32767 for i in range(0, len(data) - hop, hop)]
    out, start, quiet = [], None, 0
    for k, on in enumerate(loud + [False] * int(gap * 100 + 1)):
        if on:
            if start is None: start = k
            quiet = 0
        elif start is not None:
            quiet += 1
            if quiet >= gap * 100:
                out.append([round(start / 100, 2), round((k - quiet + 1) / 100, 2)]); start = None
    return out


if "--sample" in args:
    text = args[args.index("--sample") + 1]
    voices = args[args.index("--voices") + 1].split(",") if "--voices" in args else [spec["voice"]]
    for v in voices:
        d, _ = speak(text, v, f"sample-{v}")
        print(f"{v:8s} {d:5.2f} s  {cache / f'sample-{v}.wav'}")
    sys.exit()

lines = []
for line in spec["lines"]:
    d, ph = speak(line["text"], spec["voice"], line["id"])
    lines.append({"id": line["id"], "text": line["text"], "dur": d, "phrases": ph})
    print(f"{line['id']:10s} {d:5.2f} s  {len(ph)} phrases  {line['text']}")
out = spec_path.with_name("voice.json")
out.write_text(json.dumps({"voice": spec["voice"], "lines": lines}, indent=1) + "\n")
print(f"{sum(l['dur'] for l in lines):.1f} s of speech -> {out}")
