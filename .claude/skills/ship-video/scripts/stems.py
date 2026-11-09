"""Split every raw/ recording into voice + background with Demucs (htdemucs, two stems).

  raw/<name>.mp4  ->  raw/stems/<name>/vocals.wav  +  raw/stems/<name>/no_vocals.wav

cut.py then measures pauses on vocals.wav and uses it as the cut's audio, which removes
game / background music and keyboard clicks. CPU only: ~1.7x realtime (24 min ≈ 15 min),
so run it in the background while transcription runs. Cached: a source with stems is skipped.

First run creates its own venv (torch CPU + demucs, ~650 MB) at YouTube/tools/.venv-sep
with uv — the video-use venv stays untouched.

Usage (any python):  python stems.py <project_dir>
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
VENV = REPO / "YouTube" / "tools" / ".venv-sep"
PY = VENV / "Scripts" / "python.exe"


def ensure_venv() -> None:
    if PY.exists():
        return
    uv = shutil.which("uv") or sys.exit("uv not found — `winget install astral-sh.uv`")
    VENV.parent.mkdir(parents=True, exist_ok=True)
    print(f"creating {VENV} (one time, ~650 MB)")
    subprocess.run([uv, "venv", str(VENV), "--python", "3.12", "-q"], check=True)
    subprocess.run([uv, "pip", "install", "-q", "--python", str(PY), "torch", "torchaudio",
                    "--index-url", "https://download.pytorch.org/whl/cpu"], check=True)
    subprocess.run([uv, "pip", "install", "-q", "--python", str(PY), "demucs", "soundfile"], check=True)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    project = Path(sys.argv[1]).resolve()
    raw = project / "raw"
    sources = sorted(p for p in raw.iterdir() if p.suffix.lower() in (".mp4", ".mov", ".mkv"))
    todo = [p for p in sources if not (raw / "stems" / p.stem / "vocals.wav").exists()]
    if not todo:
        print("stems: all cached")
        return
    ensure_venv()
    work = raw / "stems" / "_work"
    work.mkdir(parents=True, exist_ok=True)
    for src in todo:
        wav = work / f"{src.stem}.wav"
        print(f"[{src.name}] separating…")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vn", "-ac", "2", "-ar", "44100", str(wav)], check=True)
        subprocess.run([str(PY), "-m", "demucs", "--two-stems", "vocals", "-n", "htdemucs", "--segment", "7",
                        "-o", str(work / "out"), str(wav)], check=True, stdout=subprocess.DEVNULL)
        dest = raw / "stems" / src.stem
        dest.mkdir(parents=True, exist_ok=True)
        for stem in ("vocals.wav", "no_vocals.wav"):
            shutil.move(str(work / "out" / "htdemucs" / src.stem / stem), str(dest / stem))
        wav.unlink()
        print(f"  -> {dest / 'vocals.wav'}")
    shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
