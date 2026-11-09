"""Frame picking for thumbnails and blur boxes.

  frames.py sheet <video> <t0> <t1> <out.jpg> [--n 30] [--cols 6] [--crop W:H:X:Y]
      evenly spaced frames t0..t1, timestamp burned top-left, tiled into one sheet
  frames.py grab  <video> <t> <out.jpg> [--crop W:H:X:Y]
      one full-resolution frame (q 2)

--crop trims the frame first, e.g. 1430:860:70:145 = the browser viewport of a screen
recording without the face cam. Uses Arial explicitly: ffmpeg's drawtext segfaults on
this machine without a fontfile (no fontconfig).
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

FONT = "C\\:/Windows/Fonts/arial.ttf"


def grab(video: str, t: float, out: Path, crop: str | None, width: int | None = None, label: bool = False) -> None:
    vf = []
    if crop:
        vf.append(f"crop={crop}")
    if width:
        vf.append(f"scale={width}:-2")
    if label:
        vf.append(f"drawtext=fontfile='{FONT}':text='{t:.1f}':x=6:y=6:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6")
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1", "-q:v", "2"]
    if vf:
        cmd += ["-vf", ",".join(vf)]
    subprocess.run(cmd + [str(out)], check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sheet")
    s.add_argument("video"); s.add_argument("t0", type=float); s.add_argument("t1", type=float); s.add_argument("out", type=Path)
    s.add_argument("--n", type=int, default=30); s.add_argument("--cols", type=int, default=6); s.add_argument("--crop")
    g = sub.add_parser("grab")
    g.add_argument("video"); g.add_argument("t", type=float); g.add_argument("out", type=Path); g.add_argument("--crop")
    a = ap.parse_args()

    if a.cmd == "grab":
        grab(a.video, a.t, a.out, a.crop)
        print(a.out)
        return

    tmp = Path(tempfile.mkdtemp())
    try:
        step = (a.t1 - a.t0) / max(a.n - 1, 1)
        for i in range(a.n):
            grab(a.video, a.t0 + i * step, tmp / f"f_{i:03d}.jpg", a.crop, width=320, label=True)
        rows = -(-a.n // a.cols)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "1", "-i", str(tmp / "f_%03d.jpg"),
                        "-vf", f"tile={a.cols}x{rows}", "-frames:v", "1", str(a.out)], check=True)
        print(a.out)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
