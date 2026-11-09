"""Shared path + toolchain resolution for the video-edit pipeline.

Everything that can differ between machines is resolved here so the other
scripts stay dumb. Windows-first (this is where it runs) with POSIX fallbacks.
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

# <repo>/.claude/skills/video-edit/scripts/_paths.py  ->  parents[4] == <repo>
REPO_ROOT = Path(__file__).resolve().parents[4]

# Vendored browser-use/video-use checkout (cuts + render helpers live here).
VIDEO_USE_DIR = Path(os.environ.get("VIDEO_USE_DIR") or (REPO_ROOT / "YouTube" / "video-use"))
HELPERS_DIR = VIDEO_USE_DIR / "helpers"

# The venv built by scripts/setup (has faster-whisper + video-use deps).
_venv_py_win = VIDEO_USE_DIR / ".venv" / "Scripts" / "python.exe"
_venv_py_nix = VIDEO_USE_DIR / ".venv" / "bin" / "python"
VENV_PY = _venv_py_win if _venv_py_win.exists() else (_venv_py_nix if _venv_py_nix.exists() else Path(sys.executable))

# Where video projects live: YouTube/edits/<slug>/{raw,edit}/
EDITS_ROOT = REPO_ROOT / "YouTube" / "edits"


def _winget_ffmpeg_bin() -> Path | None:
    """Locate the bin/ dir of a winget-installed Gyan.FFmpeg, if present."""
    base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    root = base / "Microsoft" / "WinGet" / "Packages"
    if not root.is_dir():
        return None
    for pkg in root.glob("Gyan.FFmpeg*"):
        for exe in pkg.rglob("ffmpeg.exe"):
            return exe.parent
    return None


def ensure_media_tools() -> tuple[str, str]:
    """Guarantee ffmpeg + ffprobe are callable by name for this process and its
    children. winget updates the OS PATH but a long-lived shell won't see it,
    so we patch os.environ['PATH'] in-process. Returns (ffmpeg, ffprobe) paths.
    """
    if shutil.which("ffmpeg") and shutil.which("ffprobe"):
        return shutil.which("ffmpeg"), shutil.which("ffprobe")  # type: ignore[return-value]

    bindir = _winget_ffmpeg_bin()
    if bindir and (bindir / "ffmpeg.exe").exists():
        os.environ["PATH"] = str(bindir) + os.pathsep + os.environ.get("PATH", "")

    ffmpeg, ffprobe = shutil.which("ffmpeg"), shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        sys.exit(
            "ffmpeg/ffprobe not found. Install with:\n"
            "  winget install --id Gyan.FFmpeg -e --scope user\n"
            "then restart the shell (or Claude Code) so PATH refreshes."
        )
    return ffmpeg, ffprobe


VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".m4v", ".webm"}


def find_sources(raw_dir: Path) -> list[Path]:
    return sorted(
        p for p in raw_dir.iterdir()
        if p.is_file() and p.suffix.lower() in VIDEO_EXTS
    )
