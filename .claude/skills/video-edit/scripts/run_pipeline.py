"""Orchestrator for the drop-raw-footage -> final.mp4 long-form pipeline.

Thin glue around the vendored browser-use/video-use helpers. Keeps video-use
itself unmodified; everything Windows / brand / whisper-specific lives here.

Subcommands
-----------
  ingest  <project_dir>       transcribe every raw/ source (local whisper) + pack
  render  <project_dir>       run video-use render.py on edit/edl.json -> edit/final.mp4
                              (+ sidecar edit/captions.srt + duration check)
  make-srt <project_dir>      (re)build edit/captions.srt from edl.json + transcripts
  check   <project_dir>       ffprobe final.mp4 vs edl total_duration_s
  timeline <project_dir>      write edit/timeline.md — the cut as timestamped phrases
  polish  <project_dir>       apply edit/polish.json (zooms, popups, captions)
                              -> edit/final_polished.mp4
  reel    <project_dir>       apply edit/reel.json (vertical 9:16: face bottom, graphics
                              top, captions on the seam) -> edit/reel.mp4
  batch   <batch_dir>         one session recording of many scripts -> one reel project per
                              script (Instagram/batches/<date>, slates "Script N")
  autocut <project_dir>       script-aware reel cut: last clean take per line -> edit/edl.json
  status <project_dir>       what exists so far

project_dir layout:
  <project_dir>/raw/*.mp4          <- Shubham drops footage here
  <project_dir>/edit/             <- everything the pipeline produces
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from _paths import (
    HELPERS_DIR,
    VIDEO_USE_DIR,
    ensure_media_tools,
    find_sources,
)

SCRIPTS_DIR = Path(__file__).resolve().parent
PY = sys.executable  # the venv interpreter this script is run with


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #

def _run(cmd: list[str], cwd: Path | None = None) -> None:
    print(f"  $ {Path(cmd[0]).name} {' '.join(str(c) for c in cmd[1:])}"[:160])
    subprocess.run([str(c) for c in cmd], cwd=str(cwd) if cwd else None, check=True)


def ffprobe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    try:
        return float(out.stdout.strip())
    except ValueError:
        return 0.0


def ffprobe_summary(path: Path) -> str:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,r_frame_rate:format=duration",
         "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    data = json.loads(out.stdout or "{}")
    st = (data.get("streams") or [{}])[0]
    dur = float((data.get("format") or {}).get("duration", 0) or 0)
    rate = st.get("r_frame_rate", "0/1")
    try:
        num, den = rate.split("/")
        fps = float(num) / float(den) if float(den) else 0.0
    except Exception:
        fps = 0.0
    return f"{st.get('width','?')}x{st.get('height','?')} @ {fps:.2f}fps  {dur/60:.1f} min"


def resolve_project(project_dir: Path) -> tuple[Path, Path, Path]:
    project_dir = project_dir.resolve()
    raw = project_dir / "raw"
    edit = project_dir / "edit"
    if not raw.is_dir():
        sys.exit(f"no raw/ folder in {project_dir} — put source footage in {raw}")
    edit.mkdir(parents=True, exist_ok=True)
    return project_dir, raw, edit


def load_edl(edit: Path) -> dict:
    edl_path = edit / "edl.json"
    if not edl_path.exists():
        sys.exit(f"no edl.json at {edl_path} — the skill writes this from takes_packed.md")
    return json.loads(edl_path.read_text(encoding="utf-8"))


# --------------------------------------------------------------------------- #
# subcommands
# --------------------------------------------------------------------------- #

def cmd_ingest(args) -> None:
    ensure_media_tools()
    _, raw, edit = resolve_project(args.project_dir)
    sources = find_sources(raw)
    if not sources:
        sys.exit(f"no video files in {raw}")

    print(f"ingest: {len(sources)} source(s) -> {edit}")
    for src in sources:
        print(f"\n[{src.name}]  {ffprobe_summary(src)}")
        cmd = [PY, SCRIPTS_DIR / "transcribe_local.py", src,
               "--edit-dir", edit, "--model", args.model]
        if args.force:
            cmd.append("--force")
        _run(cmd, cwd=SCRIPTS_DIR)

    print("\npacking transcripts -> takes_packed.md")
    _run([PY, HELPERS_DIR / "pack_transcripts.py", "--edit-dir", edit], cwd=HELPERS_DIR)
    print(f"\ndone. Read {edit / 'takes_packed.md'} and build {edit / 'edl.json'}.")


def cmd_make_srt(args) -> None:
    _, _, edit = resolve_project(args.project_dir)
    edl = load_edl(edit)
    sys.path.insert(0, str(HELPERS_DIR))
    from render import build_master_srt  # type: ignore

    out = edit / "captions.srt"
    build_master_srt(edl, edit, out)
    print(f"captions -> {out}")


def cmd_render(args) -> None:
    ensure_media_tools()
    _, _, edit = resolve_project(args.project_dir)
    load_edl(edit)  # validate presence
    final = edit / "final.mp4"

    cmd = [PY, HELPERS_DIR / "render.py", edit / "edl.json", "-o", final, "--no-subtitles"]
    if args.preview:
        cmd.append("--preview")
    if args.no_loudnorm:
        cmd.append("--no-loudnorm")
    # Reels keep the camera's own frame rate: 30 -> 24 fps drops 1 frame in 5 and the motion judders
    # (2026-11-06 batch). Long-form YouTube edits stay on video-use's 24 fps.
    import os
    env = dict(os.environ)
    if "Instagram" in Path(args.project_dir).resolve().parts:
        src = find_sources(Path(args.project_dir).resolve() / "raw")[0]
        num, den = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
                                   "-of", "csv=p=0", str(src)], capture_output=True, text=True).stdout.strip().split("/")
        env["VIDEO_USE_FPS"] = f"{round(float(num) / float(den or 1))}"
        print(f"  reel: keeping the source frame rate ({env['VIDEO_USE_FPS']} fps)")
    print(f"  $ render.py {edit / 'edl.json'}")
    subprocess.run([str(c) for c in cmd], cwd=str(HELPERS_DIR), check=True, env=env)

    cmd_make_srt(args)
    _check(edit, final)


def _check(edit: Path, final: Path) -> None:
    if not final.exists():
        print(f"WARN: {final} not found")
        return
    edl = json.loads((edit / "edl.json").read_text(encoding="utf-8"))
    expected = float(edl.get("total_duration_s") or sum(
        float(r["end"]) - float(r["start"]) for r in edl.get("ranges", [])
    ))
    actual = ffprobe_duration(final)
    delta = actual - expected
    flag = "OK" if abs(delta) <= 1.0 else "WARN"
    print(f"[{flag}] final.mp4 = {actual:.2f}s   expected ~{expected:.2f}s   ({delta:+.2f}s)")
    print(f"       {final}  ({final.stat().st_size / 1e6:.1f} MB)")


def cmd_check(args) -> None:
    _, _, edit = resolve_project(args.project_dir)
    _check(edit, edit / "final.mp4")


def cmd_timeline(args) -> None:
    ensure_media_tools()
    _, _, edit = resolve_project(args.project_dir)
    from polish import write_timeline

    print(f"timeline -> {write_timeline(load_edl(edit), edit)}")


def cmd_polish(args) -> None:
    ensure_media_tools()
    project_dir, _, edit = resolve_project(args.project_dir)
    load_edl(edit)  # validate presence
    from polish import run_polish

    run_polish(project_dir, edit, preview=args.preview, full=args.full, still=args.still)


def cmd_reel(args) -> None:
    ensure_media_tools()
    project_dir, _, edit = resolve_project(args.project_dir)
    load_edl(edit)  # validate presence
    from reel import run_reel

    run_reel(project_dir, edit, preview=args.preview, still=args.still)


def cmd_batch(args) -> None:
    from batch import split_batch

    split_batch(args.project_dir, model=args.model)


def cmd_autocut(args) -> None:
    from batch import autocut

    autocut(args.project_dir)


def cmd_status(args) -> None:
    project_dir, raw, edit = resolve_project(args.project_dir)
    sources = find_sources(raw)
    tdir = edit / "transcripts"
    transcribed = {p.stem for p in tdir.glob("*.json")} if tdir.is_dir() else set()

    print(f"project: {project_dir}")
    print(f"video-use: {VIDEO_USE_DIR}")
    print(f"\nraw sources ({len(sources)}):")
    for s in sources:
        mark = "transcribed" if s.stem in transcribed else "NOT transcribed"
        print(f"  - {s.name:<40} {mark}")
    for label, path in [
        ("takes_packed.md", edit / "takes_packed.md"),
        ("edl.json", edit / "edl.json"),
        ("captions.srt", edit / "captions.srt"),
        ("final.mp4", edit / "final.mp4"),
        ("polish.json", edit / "polish.json"),
        ("final_polished.mp4", edit / "final_polished.mp4"),
    ]:
        state = "yes" if path.exists() else "no"
        extra = ""
        if path.exists() and path.suffix == ".mp4":
            extra = f"  ({ffprobe_duration(path)/60:.1f} min)"
        print(f"  {label:<18} {state}{extra}")


# --------------------------------------------------------------------------- #

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("ingest"); p.add_argument("project_dir", type=Path)
    p.add_argument("--model", default="small.en"); p.add_argument("--force", action="store_true")
    p.set_defaults(func=cmd_ingest)

    p = sub.add_parser("render"); p.add_argument("project_dir", type=Path)
    p.add_argument("--preview", action="store_true"); p.add_argument("--no-loudnorm", action="store_true")
    p.set_defaults(func=cmd_render)

    p = sub.add_parser("make-srt"); p.add_argument("project_dir", type=Path)
    p.set_defaults(func=cmd_make_srt)

    p = sub.add_parser("check"); p.add_argument("project_dir", type=Path)
    p.set_defaults(func=cmd_check)

    p = sub.add_parser("timeline"); p.add_argument("project_dir", type=Path)
    p.set_defaults(func=cmd_timeline)

    p = sub.add_parser("polish"); p.add_argument("project_dir", type=Path)
    p.add_argument("--preview", action="store_true", help="half-res render of the polished stretch only")
    p.add_argument("--full", action="store_true", help="send the whole video through Remotion")
    p.add_argument("--still", type=float, metavar="SECONDS", help="render one frame to edit/verify/ instead")
    p.set_defaults(func=cmd_polish)

    p = sub.add_parser("reel"); p.add_argument("project_dir", type=Path)
    p.add_argument("--preview", action="store_true", help="half-res render")
    p.add_argument("--still", type=float, metavar="SECONDS", help="render one frame to edit/verify/ instead")
    p.set_defaults(func=cmd_reel)

    p = sub.add_parser("batch", help="split a multi-script session into one reel project per script")
    p.add_argument("project_dir", type=Path, help="Instagram/batches/<date>")
    p.add_argument("--model", default="small.en")
    p.set_defaults(func=cmd_batch)

    p = sub.add_parser("autocut", help="script-aware cut: last clean take of every line -> edit/edl.json")
    p.add_argument("project_dir", type=Path, help="Instagram/reels/<slug>")
    p.set_defaults(func=cmd_autocut)

    p = sub.add_parser("status"); p.add_argument("project_dir", type=Path)
    p.set_defaults(func=cmd_status)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
