"""Blur only the private parts of the screen (emails, API keys, client names, chat history)
on the CUT video, leaving everything else sharp.

Driven by <project>/edit/redact.json, times on the cut timeline (edit/final.mp4):
{
  "boxes": [
    {"start": 12.40, "end": 19.80, "box": [70, 440, 290, 520], "why": "claude.ai recents + email"},
    ...
  ]
}
box = [x, y, w, h] in 1920x1080 pixels. Spans may overlap.

Usage (video-use venv):
  redact.py apply <project>   edit/final.mp4 -> edit/final_redacted.mp4 (audio copied),
                              then swaps it in as edit/final.mp4 (original kept as edit/final_unredacted.mp4)
  redact.py still <project> <t> <out.jpg>   one frame of the redacted result, to check a box
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

SIGMA = 28  # gaussian blur strength inside a box — unreadable at 1080p, still looks like UI


def load(project: Path) -> list[dict]:
    spec = json.loads((project / "edit" / "redact.json").read_text(encoding="utf-8"))
    boxes = spec.get("boxes", [])
    for b in boxes:
        x, y, w, h = b["box"]
        b["box"] = [int(x) // 2 * 2, int(y) // 2 * 2, max(2, int(w) // 2 * 2), max(2, int(h) // 2 * 2)]
    return boxes


def graph(boxes: list[dict], always: bool = False) -> str:
    # One blur chain per distinct box: a box that recurs in many spans costs one gblur, not one per span.
    groups: dict[tuple, list[dict]] = {}
    for b in boxes:
        groups.setdefault(tuple(b["box"]), []).append(b)
    n = len(groups)
    parts = ["[0:v]split=" + str(n + 1) + "[base]" + "".join(f"[c{i}]" for i in range(n))]
    last = "base"
    for i, ((x, y, w, h), spans) in enumerate(groups.items()):
        parts.append(f"[c{i}]crop={w}:{h}:{x}:{y},gblur=sigma={SIGMA}:steps=3[b{i}]")
        expr = "+".join(f"between(t,{float(sp['start']):.3f},{float(sp['end']):.3f})" for sp in spans)
        en = "" if always else f":enable='{expr}'"
        parts.append(f"[{last}][b{i}]overlay={x}:{y}{en}[o{i}]")
        last = f"o{i}"
    return ";".join(parts) + f";[{last}]format=yuv420p[v]"


def cmd_apply(project: Path) -> None:
    edit = project / "edit"
    boxes = load(project)
    src = edit / "final_unredacted.mp4"
    if not src.exists():
        shutil.copy2(edit / "final.mp4", src)
    out = edit / "final_redacted.mp4"
    if not boxes:
        shutil.copy2(src, edit / "final.mp4")
        print("no boxes — final.mp4 = unredacted cut")
        return
    # inline graph: this ffmpeg build has no -filter_complex_script
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-filter_complex", graph(boxes),
                    "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                    "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", str(out)], check=True)
    shutil.move(str(out), str(edit / "final.mp4"))
    print(f"redacted {len(boxes)} box span(s) -> edit/final.mp4  (original: {src.name})")


def cmd_still(project: Path, t: float, out: Path) -> None:
    edit = project / "edit"
    src = edit / "final_unredacted.mp4"
    if not src.exists():
        src = edit / "final.mp4"
    boxes = [b for b in load(project) if b["start"] <= t <= b["end"]]
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(src)]
    if boxes:
        cmd += ["-filter_complex", graph(boxes, always=True), "-map", "[v]"]
    subprocess.run(cmd + ["-frames:v", "1", "-q:v", "2", str(out)], check=True)
    print(out)


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("apply", "still"):
        sys.exit(__doc__)
    p = Path(sys.argv[2]).resolve()
    if sys.argv[1] == "apply":
        cmd_apply(p)
    else:
        cmd_still(p, float(sys.argv[3]), Path(sys.argv[4]))
