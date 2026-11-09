"""Render --still frames of a reel at the given times (or one per scene + each face gap)
and tile them into edit/verify/sheet.jpg for a one-look check.

usage: reel_sheet.py <reel_dir> [t1 t2 ...]
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent


def auto_times(reel_dir: Path) -> list[float]:
    spec = json.loads((reel_dir / "edit" / "reel.json").read_text(encoding="utf-8"))
    words = json.loads((reel_dir / "edit" / "timeline_words.json").read_text(encoding="utf-8"))
    total = words[-1]["end"]
    ts, prev = [], 0.0
    for s in spec["scenes"]:
        if s["at"] - prev > 0.5:                      # a face gap before this scene
            ts.append(round((prev + s["at"]) / 2, 2))
        ts.append(round(s["at"] + min(s["duration"] - 0.1, max(0.7, s["duration"] * 0.75)), 2))
        prev = s["at"] + s["duration"]
    if total - prev > 0.5:
        ts.append(round(prev + (total - prev) * 0.6, 2))
    return ts


def from_video(reel_dir: Path, ts: list[float], verify: Path) -> list[tuple[float, Path]]:
    """Frames straight from the finished edit/reel.mp4 (seconds, not 12 s per Remotion still).
    Times are on final.mp4 (reel.json), so divide by the speed-up."""
    spec = json.loads((reel_dir / "edit" / "reel.json").read_text(encoding="utf-8"))
    speed = float(spec.get("speed", 1.0))
    shots = []
    for t in ts:
        p = verify / f"video_{t:07.2f}s.jpg"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t / speed:.3f}", "-i", str(reel_dir / "edit" / "reel.mp4"),
                        "-frames:v", "1", "-q:v", "3", str(p)])
        if p.exists():
            shots.append((t, p))
    return shots


def main() -> None:
    args = [a for a in sys.argv[1:] if a != "--video"]
    reel_dir = Path(args[0])
    ts = [float(x) for x in args[1:]] or auto_times(reel_dir)
    verify = reel_dir / "edit" / "verify"
    verify.mkdir(parents=True, exist_ok=True)
    shots = from_video(reel_dir, ts, verify) if "--video" in sys.argv else []
    for t in ([] if "--video" in sys.argv else ts):
        subprocess.run([sys.executable, str(HERE / "run_pipeline.py"), "reel", str(reel_dir), "--still", str(t)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env={**os.environ, "PYTHONUTF8": "1"})
        p = verify / f"reel_{t:07.2f}s.png"
        if p.exists():
            shots.append((t, p))
        else:
            print(f"  still at {t}s missing")
    if not shots:
        sys.exit("no stills rendered")
    w, h, cols = 360, 640, 6
    rows = (len(shots) + cols - 1) // cols
    sheet = Image.new("RGB", (w * cols, (h + 34) * rows), "white")
    d = ImageDraw.Draw(sheet)
    for i, (t, p) in enumerate(shots):
        x, y = (i % cols) * w, (i // cols) * (h + 34)
        sheet.paste(Image.open(p).convert("RGB").resize((w, h)), (x, y + 34))
        d.text((x + 8, y + 8), f"{t:.2f}s", fill="black")
    out = verify / "sheet.jpg"
    sheet.save(out, quality=82)
    print(f"sheet -> {out}  ({len(shots)} stills)")


if __name__ == "__main__":
    main()
