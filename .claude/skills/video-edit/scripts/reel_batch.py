"""One reel batch, end to end, one reel at a time (parallel Remotion renders fail on this machine).

  reel_batch.py cut  Instagram/batches/<date>   ingest (medium.en) -> autocut -> cut_fixes -> render cut -> timeline
  reel_batch.py edit Instagram/batches/<date>   plans.py -> reel_plan -> reel (3 tries) -> final/NN-slug.mp4
                                                -> frame sheet + loudness -> tracker -> review.html
  add --only slug1,slug2 to run a subset.

Per reel, edit/cut_fixes.json (optional) holds hand fixes that must survive an autocut re-run:
  [{"remove": [39.88, 40.20], "why": "tail of abandoned 'my sender'"}]   (times on the raw clip)
Run with the video-use venv python and PYTHONUTF8=1.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PY = sys.executable
RP = HERE / "run_pipeline.py"
ENV = {**os.environ, "PYTHONUTF8": "1"}


def run(args: list, log: Path | None = None) -> bool:
    out = subprocess.run([str(a) for a in args], capture_output=True, text=True, encoding="utf-8", errors="replace", env=ENV)
    if log:
        log.write_text(out.stdout + out.stderr, encoding="utf-8")
    return out.returncode == 0


def reels(batch: Path, only: set[str]) -> list[tuple[int, str]]:
    tracker = json.loads((batch / "tracker.json").read_text(encoding="utf-8"))
    rows = [(r["n"], slug) for slug, r in tracker["reels"].items() if r.get("status") not in ("not recorded", "missing")]
    return [(n, s) for n, s in sorted(rows) if not only or s in only]


def set_status(batch: Path, slug: str, **kw) -> None:
    p = batch / "tracker.json"
    t = json.loads(p.read_text(encoding="utf-8"))
    t["reels"][slug].update(kw)
    p.write_text(json.dumps(t, indent=2), encoding="utf-8")


def apply_cut_fixes(reel: Path) -> list[str]:
    fx = reel / "edit" / "cut_fixes.json"
    if not fx.exists():
        return []
    edl_p = reel / "edit" / "edl.json"
    edl = json.loads(edl_p.read_text(encoding="utf-8"))
    done = []
    for f in json.loads(fx.read_text(encoding="utf-8")):
        a, b = f["remove"]
        out = []
        for r in edl["ranges"]:
            if r["end"] <= a or r["start"] >= b:
                out.append(r)
                continue
            if r["start"] < a - 0.05:
                out.append({**r, "end": a})
            if r["end"] > b + 0.05:
                out.append({**r, "start": b})
        edl["ranges"] = out
        done.append(f"removed {a}-{b} ({f.get('why', '')})")
    edl["total_duration_s"] = round(sum(r["end"] - r["start"] for r in edl["ranges"]), 3)
    edl["manual"] = "; ".join(done)
    edl_p.write_text(json.dumps(edl, indent=2), encoding="utf-8")
    return done


def cmd_cut(batch: Path, only: set[str]) -> None:
    for n, slug in reels(batch, only):
        reel = ROOT / "Instagram" / "reels" / slug
        print(f"== {n:02d} {slug}")
        run([PY, RP, "ingest", reel, "--model", "medium.en"])
        out = subprocess.run([PY, RP, "autocut", reel], capture_output=True, text=True, encoding="utf-8", errors="replace", env=ENV).stdout
        for line in out.splitlines():
            if re.search(r"autocut:|MISSING|WEAK|restart|CHECK", line):
                print("   " + line.strip().replace(str(reel), "")[:150])
        for d in apply_cut_fixes(reel):
            print("   cut fix: " + d)
        ok = run([PY, RP, "render", reel]) and run([PY, RP, "timeline", reel])
        print("   cut rendered" if ok else "   CUT RENDER FAILED")
        set_status(batch, slug, status="cut" if ok else "cut-failed")


def probe(p: Path) -> tuple[float, float]:
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                             capture_output=True, text=True).stdout.strip() or 0)
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(p), "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)
    return d, float(m[-1]) if m else 0.0


def cmd_edit(batch: Path, only: set[str]) -> None:
    if (batch / "plans.py").exists():
        run([PY, batch / "plans.py"])
    final = batch / "final"
    final.mkdir(exist_ok=True)
    for n, slug in reels(batch, only):
        reel = ROOT / "Instagram" / "reels" / slug
        print(f"== {n:02d} {slug}")
        plan = subprocess.run([PY, HERE / "reel_plan.py", reel], capture_output=True, text=True, encoding="utf-8", errors="replace", env=ENV)
        if plan.returncode:
            print("   PLAN FAILED: " + (plan.stdout + plan.stderr).strip().splitlines()[-1][:200])
            continue
        print("   " + plan.stdout.splitlines()[0])
        ok = any(run([PY, RP, "reel", reel], reel / "edit" / "reel_log.txt") for _ in range(3))
        if not ok:
            print("   REEL RENDER FAILED (3 tries) — see edit/reel_log.txt; is C: full?")
            set_status(batch, slug, status="render-failed")
            continue
        mp4 = reel / "edit" / "reel.mp4"
        dst = final / f"{n:02d}-{slug}.mp4"
        dst.unlink(missing_ok=True)
        try:
            os.link(mp4, dst)
        except OSError:
            import shutil
            shutil.copy2(mp4, dst)
        run([PY, HERE / "reel_sheet.py", reel, "--video"])
        dur, lufs = probe(mp4)
        print(f"   reel.mp4 {dur:.1f}s  {lufs:.1f} LUFS  -> {dst.relative_to(ROOT)}")
        set_status(batch, slug, status="rendered", reel=str(mp4.relative_to(ROOT)).replace("\\", "/"))
    review = HERE.parents[1] / "insta-reel" / "build_review.py"
    if review.exists():
        r = subprocess.run([PY, review, batch], capture_output=True, text=True, encoding="utf-8", errors="replace", env=ENV)
        print(r.stdout.strip() or r.stderr.strip()[-300:])


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("cut", "edit"):
        sys.exit(__doc__)
    batch = Path(sys.argv[2]).resolve()
    only = set()
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    {"cut": cmd_cut, "edit": cmd_edit}[sys.argv[1]](batch, only)
