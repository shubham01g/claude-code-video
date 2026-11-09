"""Local, free, offline transcription that stands in for video-use's ElevenLabs
Scribe call. Produces the SAME JSON shape video-use's helpers consume:

    <edit_dir>/transcripts/<video_stem>.json
    {
      "language_code": "en",
      "text": "<full text>",
      "words": [
        {"type": "word",    "text": "Ninety",  "start": 2.52, "end": 2.71,
         "speaker_id": "speaker_0", "logprob": -0.12},
        {"type": "spacing", "text": " ",        "start": 2.71, "end": 2.74},
        ...
      ]
    }

`spacing` entries carry the inter-word gaps — that is how pack_transcripts.py
finds silences and how the cut logic knows where dead air is.

Backend: faster-whisper (CTranslate2). Single speaker assumed -> every word
gets speaker_id "speaker_0" so diarization-aware consumers still work.

KNOWN TRADEOFF (see SKILL.md): Whisper-family models transcribe filler words
("um", "uh", false starts) only partially. Silence removal is unaffected and
is the bigger win; filler removal from the EDL is best-effort on whatever the
model actually emits. `--initial-prompt` is tuned to keep more of them.

Usage:
    python transcribe_local.py <video> --edit-dir <dir> [--model small.en]
Cached: skips if <edit_dir>/transcripts/<stem>.json already exists.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from _paths import ensure_media_tools

# Biases the model toward keeping disfluencies instead of silently cleaning them.
DEFAULT_INITIAL_PROMPT = (
    "Umm, okay so, like... let me think. Uh, here's the thing, you know? "
    "So basically, hmm, what I'm trying to say is this."
)


def extract_audio(video: Path, dest: Path) -> None:
    """Mono 16 kHz PCM WAV — matches video-use/helpers/transcribe.py exactly."""
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(video),
         "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(dest)],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def transcribe(
    wav: Path,
    model_size: str,
    device: str,
    compute_type: str,
    language: str,
    initial_prompt: str,
) -> dict:
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    segments, info = model.transcribe(
        str(wav),
        language=language or None,
        word_timestamps=True,
        vad_filter=False,               # keep dead air — we decide what to cut
        beam_size=5,
        condition_on_previous_text=True,
        initial_prompt=initial_prompt or None,
    )

    words: list[dict] = []
    text_parts: list[str] = []
    prev_end: float | None = None

    def add_spacing(a: float, b: float) -> None:
        if b > a:
            words.append({"type": "spacing", "text": " ", "start": round(a, 3), "end": round(b, 3)})

    for seg in segments:                # generator — this is where compute happens
        for w in (seg.words or []):
            start = w.start if w.start is not None else (prev_end if prev_end is not None else seg.start)
            end = w.end if w.end is not None else (start + 0.05)
            token = (w.word or "").strip()
            if not token:
                continue
            if prev_end is not None:
                add_spacing(prev_end, start)
            words.append({
                "type": "word",
                "text": token,
                "start": round(float(start), 3),
                "end": round(float(end), 3),
                "speaker_id": "speaker_0",
                "logprob": round(float(getattr(w, "probability", 0.0) or 0.0), 4),
            })
            text_parts.append(token)
            prev_end = float(end)

    return {
        "language_code": getattr(info, "language", language) or language,
        "language_probability": round(float(getattr(info, "language_probability", 0.0) or 0.0), 4),
        "duration": round(float(getattr(info, "duration", 0.0) or 0.0), 3),
        "model": model_size,
        "text": " ".join(text_parts),
        "words": words,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Local faster-whisper transcription in Scribe JSON shape")
    ap.add_argument("video", type=Path)
    ap.add_argument("--edit-dir", type=Path, default=None,
                    help="Default: <video_parent>/edit")
    ap.add_argument("--model", default="small.en",
                    help="faster-whisper model. small.en (fast, default) | medium.en (better jargon) | large-v3")
    ap.add_argument("--device", default="cpu", help="cpu | cuda | auto")
    ap.add_argument("--compute-type", default="int8", help="int8 (cpu) | float16 (cuda) | auto")
    ap.add_argument("--language", default="en")
    ap.add_argument("--initial-prompt", default=DEFAULT_INITIAL_PROMPT)
    ap.add_argument("--force", action="store_true", help="Re-transcribe even if cached")
    args = ap.parse_args()

    ensure_media_tools()

    video = args.video.resolve()
    if not video.exists():
        sys.exit(f"video not found: {video}")

    edit_dir = (args.edit_dir or (video.parent / "edit")).resolve()
    out_dir = edit_dir / "transcripts"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{video.stem}.json"

    if out_path.exists() and not args.force:
        print(f"cached: {out_path.name}")
        return

    t0 = time.time()
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / f"{video.stem}.wav"
        print(f"  extracting audio: {video.name}", flush=True)
        extract_audio(video, wav)
        print(f"  transcribing with faster-whisper [{args.model}] ...", flush=True)
        payload = transcribe(
            wav, args.model, args.device, args.compute_type, args.language, args.initial_prompt,
        )

    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    n_words = sum(1 for w in payload["words"] if w["type"] == "word")
    print(f"  saved: {out_path.name}  ({n_words} words, {out_path.stat().st_size / 1024:.1f} KB) "
          f"in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
