"""Polish pass: zooms, popups and captions over a finished cut.

Reads <project>/edit/polish.json (times in seconds on the OUTPUT timeline — the
cut video, not the raw recording), renders the affected stretch through the
Remotion `MainEdit` composition, and writes edit/final_polished.mp4 with the
original audio untouched.

Only the stretch that actually has effects goes through Remotion; the rest of
the video is passed straight through, so a 30 s intro polish on a 20 min video
costs about 30 s of Remotion rendering, not 20 min.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from _paths import REPO_ROOT

REMOTION_DIR = REPO_ROOT / "YouTube" / "remotion"
SHARED_ASSETS = REPO_ROOT / "YouTube" / "assets"

ANCHORS = {"top-left", "top", "top-right", "left", "center", "right",
           "bottom-left", "bottom", "bottom-right"}
SCENES = {"BarChart", "ChapterCard", "ChatThread", "GlassList", "GlassStat", "HookTitle", "ClaudeRank", "FloatingText", "FormatCards", "GlassTitle", "MysteryReveal",
          "NodeDiagram", "OpusEffort", "OutroCTA", "PromptFanout",
          "QuoteOverlay", "RoadmapCard", "StackedCards", "StatCallout", "TwoPanel"}
PHRASE_GAP = 0.5  # same silence threshold takes_packed.md breaks phrases on


# --------------------------------------------------------------------------- #
# probing
# --------------------------------------------------------------------------- #

def _probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,r_frame_rate,nb_frames,pix_fmt,color_range:format=duration",
         "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    data = json.loads(out.stdout)
    st = data["streams"][0]
    num, den = st["r_frame_rate"].split("/")
    fps = float(num) / float(den)
    duration = float(data["format"]["duration"])
    frames = int(st["nb_frames"]) if str(st.get("nb_frames", "")).isdigit() else round(duration * fps)
    return {"width": int(st["width"]), "height": int(st["height"]), "fps": fps, "frames": frames,
            "duration": duration, "pix_fmt": st.get("pix_fmt", ""), "color_range": st.get("color_range", "")}


def _duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


# --------------------------------------------------------------------------- #
# output-timeline words
# --------------------------------------------------------------------------- #

def _segment_durations(edl: dict, edit: Path) -> list[float]:
    """Real length of each cut segment in final.mp4.

    render.py rounds every segment up to a whole frame, so summing the EDL's
    (end - start) drifts a few ms per cut — seconds over a long video. The
    rendered segments are the truth when they are still on disk.
    """
    ranges = edl["ranges"]
    clips = sorted((edit / "clips_graded").glob("seg_*.mp4")) if (edit / "clips_graded").is_dir() else []
    if len(clips) == len(ranges):
        return [_duration(c) for c in clips]
    return [float(r["end"]) - float(r["start"]) for r in ranges]


def output_words(edl: dict, edit: Path) -> list[dict]:
    """Every kept word, re-timed onto the cut video's timeline."""
    seg_durs = _segment_durations(edl, edit)
    transcripts: dict[str, dict] = {}
    for r in edl["ranges"]:
        name = r["source"]
        if name not in transcripts:
            path = edit / "transcripts" / f"{name}.json"
            transcripts[name] = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
            # Whisper sometimes gives a word zero length at its END ("Comment" 51.20-51.20, spoken from
            # 50.92): pull its start back (never over the previous word) so it survives the cut + captions
            prev_end = 0.0
            for w in transcripts[name].get("words", []):
                if w.get("start") is None or w.get("end") is None:
                    continue
                if w.get("type", "word") == "word" and w["end"] - w["start"] < 0.08:
                    w["start"] = max(prev_end, w["end"] - 0.3)
                if w.get("type", "word") == "word":
                    prev_end = w["end"]
    # a word Whisper stretched across a cut point overlaps two ranges: it belongs to the one
    # holding most of it, or the caption shows it twice ("36 36")
    best: dict[tuple[str, int], tuple[float, int]] = {}
    for ri, r in enumerate(edl["ranges"]):
        start, end = float(r["start"]), float(r["end"])
        for wi, w in enumerate(transcripts[r["source"]].get("words", [])):
            if w.get("start") is None or w.get("end") is None:
                continue
            ov = min(w["end"], end) - max(w["start"], start)
            if ov > 0 and ov > best.get((r["source"], wi), (0.0, -1))[0]:
                best[(r["source"], wi)] = (ov, ri)
    words: list[dict] = []
    offset = 0.0
    for ri, (r, seg_dur) in enumerate(zip(edl["ranges"], seg_durs)):
        name = r["source"]
        start, end = float(r["start"]), float(r["end"])
        for wi, w in enumerate(transcripts[name].get("words", [])):
            if w.get("type") != "word" or w.get("start") is None or w.get("end") is None:
                continue
            if w["end"] <= start or w["start"] >= end or best.get((name, wi), (0, -1))[1] != ri:
                continue
            text = (w.get("text") or "").strip()
            if not text:
                continue
            words.append({
                "text": text,
                "start": round(max(w["start"], start) - start + offset, 3),
                "end": round(min(w["end"], end) - start + offset, 3),
            })
        offset += seg_dur
    return words


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def apply_fixes(words: list[dict], fixes: dict[str, str]) -> list[dict]:
    """Correct mis-heard words ("cloud code" -> "Claude Code") before they hit captions.

    Keys match on whole words, ignoring case and punctuation. Trailing
    punctuation on the last matched word is kept.
    """
    if not fixes:
        return words
    rules = sorted(
        ((([_norm(k) for k in key.split()]), value.split()) for key, value in fixes.items()),
        key=lambda rule: -len(rule[0]),
    )
    out: list[dict] = []
    i = 0
    while i < len(words):
        for keys, repl in rules:
            n = len(keys)
            if n and [_norm(w["text"]) for w in words[i:i + n]] == keys:
                span = words[i:i + n]
                tail = re.search(r"[.,!?;:]+$", span[-1]["text"])
                t0, t1 = span[0]["start"], span[-1]["end"]
                step = (t1 - t0) / max(len(repl), 1)
                for j, text in enumerate(repl):
                    if j == len(repl) - 1 and tail:
                        text += tail.group(0)
                    out.append({"text": text, "start": round(t0 + j * step, 3), "end": round(t0 + (j + 1) * step, 3)})
                i += n
                break
        else:
            out.append(words[i])
            i += 1
    return out


def _clock(t: float) -> str:
    return f"{int(t // 60):02d}:{t % 60:05.2f}"


def write_timeline(edl: dict, edit: Path) -> Path:
    """edit/timeline.md — the cut video as timestamped phrases, for placing cues."""
    words = output_words(edl, edit)
    lines = [
        "# Cut timeline",
        "",
        "Times are on the cut video (final.mp4). Use these for polish.json.",
        "Word-level times: edit/timeline_words.json.",
        "",
    ]
    phrase: list[dict] = []
    for w in words + [None]:  # type: ignore[list-item]
        if phrase and (w is None or w["start"] - phrase[-1]["end"] >= PHRASE_GAP or re.search(r"[.!?]$", phrase[-1]["text"])):
            text = " ".join(p["text"] for p in phrase)
            lines.append(f"[{_clock(phrase[0]['start'])} - {_clock(phrase[-1]['end'])}]  ({phrase[0]['start']:.2f}-{phrase[-1]['end']:.2f}s)  {text}")
            phrase = []
        if w is not None:
            phrase.append(w)
    out = edit / "timeline.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    (edit / "timeline_words.json").write_text(json.dumps(words, indent=1), encoding="utf-8")
    return out


# --------------------------------------------------------------------------- #
# polish.json -> render props
# --------------------------------------------------------------------------- #

def _fail(msg: str) -> None:
    sys.exit(f"polish.json: {msg}")


def _stage_asset(src: str, project_dir: Path, stage: Path) -> str:
    """Find an asset (project assets/ first, then the shared YouTube/assets/) and
    copy it into the staged public dir. Returns the path Remotion should load."""
    candidates = [Path(src)] if Path(src).is_absolute() else [
        project_dir / "assets" / src, SHARED_ASSETS / src, project_dir / src,
    ]
    found = next((c for c in candidates if c.is_file()), None)
    if not found:
        _fail(f"asset '{src}' not found. Looked in:\n  " + "\n  ".join(str(c) for c in candidates))
    dest = stage / "assets" / found.name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(found, dest)
    return f"assets/{found.name}"


def build_props(spec: dict, info: dict, words: list[dict], project_dir: Path, stage: Path) -> dict:
    total = info["duration"]

    def span(item: dict, kind: str) -> tuple[float, float]:
        start, end = float(item["start"]), float(item["end"])
        if not (0 <= start < end):
            _fail(f"{kind} has start {start} / end {end} — need 0 <= start < end")
        return start, min(end, total)

    zooms = []
    for z in spec.get("zooms", []):
        start, end = span(z, "zoom")
        to = float(z.get("to", z.get("scale", 1.1)))
        frm = float(z.get("from", 1.0))
        if not (1.0 <= to <= 2.0 and 1.0 <= frm <= 2.0):
            _fail(f"zoom at {start}s: 'to'/'from' must be between 1.0 and 2.0 (subtle is 1.06-1.15)")
        style = z.get("style", "drift")
        if style not in ("hold", "drift"):
            _fail(f"zoom at {start}s: style must be 'hold' or 'drift'")
        focus = z.get("focus", [0.5, 0.42])
        zooms.append({"start": start, "end": end, "to": to, "from": frm, "style": style,
                      "in": float(z.get("in", 1.2)), "out": float(z.get("out", 0.9)),
                      "focus": [float(focus[0]), float(focus[1])]})
    zooms.sort(key=lambda z: z["start"])
    for a, b in zip(zooms, zooms[1:]):
        if b["start"] < a["end"]:
            _fail(f"zooms overlap: one ends at {a['end']}s, the next starts at {b['start']}s")

    players = []
    for pl in spec.get("player", []):
        start, end = span(pl, "player frame")
        length = pl.get("length", "25:00")
        if isinstance(length, str):
            length = sum(int(part) * 60 ** i for i, part in enumerate(reversed(length.split(":"))))
        players.append({"start": start, "end": end, "in": float(pl.get("in", 0.6)), "out": float(pl.get("out", 0.5)),
                        "length": float(length), "chapters": int(pl.get("chapters", 8))})

    popups = []
    for p in spec.get("popups", []):
        kind = p.get("type", "text")
        at = float(p["at"])
        if at >= total:
            _fail(f"popup at {at}s is past the end of the video ({total:.1f}s)")
        base = {"type": kind, "at": at, "duration": float(p.get("duration", 3.0)),
                "enter": p.get("enter", "slide" if kind == "lower-third" else "pop")}
        offset = p.get("offset", [0, 0])
        base.update(offset=[float(offset[0]), float(offset[1])], rotate=float(p.get("rotate", 0)))
        if base["enter"] not in ("pop", "slide", "fade"):
            _fail(f"popup at {at}s: enter must be pop, slide or fade")
        default_pos = {"lower-third": "bottom-left", "image": "top-right"}.get(kind, "center")
        base["position"] = p.get("position", default_pos)
        if base["position"] not in ANCHORS:
            _fail(f"popup at {at}s: position '{base['position']}' is not one of {sorted(ANCHORS)}")
        if kind == "text":
            base.update(text=str(p["text"]), size=p.get("size", "lg"), look=p.get("look", "card"))
        elif kind in ("image", "logo"):
            base.update(type="image", src=_stage_asset(p["src"], project_dir, stage),
                        width=int(p.get("width", 320)), look=p.get("look", "card"))
            if p.get("label"):
                base["label"] = str(p["label"])
        elif kind == "lower-third":
            base.update(title=str(p["title"]))
            if p.get("subtitle"):
                base["subtitle"] = str(p["subtitle"])
        elif kind == "scene":
            if p.get("component") not in SCENES:
                _fail(f"popup at {at}s: component must be one of {sorted(SCENES)}")
            scene_props = dict(p.get("props", {}))
            for key in ("logo", "image"):  # scenes that show an asset take it as `logo` / `image`
                if scene_props.get(key):
                    scene_props[key] = _stage_asset(scene_props[key], project_dir, stage)
            base.update(component=p["component"], props=scene_props)
        elif kind == "clip":
            base.update(src=_stage_asset(p["src"], project_dir, stage))
        else:
            _fail(f"popup at {at}s: unknown type '{kind}'")
        popups.append(base)

    captions = []
    for c in spec.get("captions", []):
        start, end = span(c, "caption range")
        position = c.get("position", "bottom")
        if position not in ("bottom", "center", "top"):
            _fail(f"caption range at {start}s: position must be bottom, center or top")
        captions.append({"start": start, "end": end, "maxWords": int(c.get("maxWords", 4)),
                         "position": position, "uppercase": bool(c.get("uppercase", False)),
                         "highlight": bool(c.get("highlight", True))})

    words = apply_fixes(words, spec.get("captionFixes", {}))
    # Only ship the words captions will actually show — keeps the props file small.
    shown = [w for w in words if any(c["start"] - 0.05 <= w["start"] and w["end"] <= c["end"] + 0.05 for c in captions)]

    return {"video": "final.mp4", "width": info["width"], "height": info["height"],
            "fps": info["fps"], "durationInFrames": info["frames"],
            "zooms": zooms, "players": players, "popups": popups, "captions": captions, "words": shown,
            "emphasis": [str(e) for e in spec.get("captionEmphasis", [])]}


def effects_end(props: dict) -> float:
    ends = [z["end"] for z in props["zooms"]]
    ends += [pl["end"] for pl in props.get("players", [])]
    ends += [p["at"] + p["duration"] for p in props["popups"]]
    ends += [c["end"] for c in props["captions"]]
    return max(ends, default=0.0)


# --------------------------------------------------------------------------- #
# render
# --------------------------------------------------------------------------- #

def _npx() -> str:
    exe = shutil.which("npx")
    if not exe:
        sys.exit("npx not found — install Node.js, then run `npm install` in YouTube/remotion")
    return exe


def _link_or_copy(src: Path, dest: Path) -> None:
    if dest.exists():
        dest.unlink()
    try:
        os.link(src, dest)  # instant, no extra disk — same drive only
    except OSError:
        shutil.copy2(src, dest)


REMOTION_TMP = REPO_ROOT / "YouTube" / ".remotion-tmp"


def _remotion(args: list[str]) -> None:
    # Remotion copies the whole source video into %TEMP% on every run and never cleans
    # up; on C: that filled the drive mid-render (2026-10-16). Keep it on the repo's drive.
    # One temp dir per project (named after <project> from --public-dir=<project>/edit/<stage>),
    # so several projects can render at once without wiping each other's files (2026-11-02).
    public = next((a.split("=", 1)[1] for a in args if a.startswith("--public-dir=")), "")
    tmp = REMOTION_TMP / (Path(public).parent.parent.name if public else "default")
    tmp.mkdir(parents=True, exist_ok=True)
    for old in tmp.glob("remotion-*"):
        shutil.rmtree(old, ignore_errors=True)
    env = {**os.environ, "TEMP": str(tmp), "TMP": str(tmp)}
    cmd = [_npx(), "remotion", *args]
    # REMOTION_CONCURRENCY caps Chrome tabs per render when several renders share the machine
    if os.environ.get("REMOTION_CONCURRENCY") and args and args[0] == "render":
        cmd.append(f"--concurrency={os.environ['REMOTION_CONCURRENCY']}")
    print("  $ npx remotion " + " ".join(args)[:200])
    subprocess.run(cmd, cwd=str(REMOTION_DIR), check=True, env=env)


def _frame_psnr(head: Path, final: Path, first: int, last: int, offset: int) -> list[float]:
    """Per-frame PSNR of head[first..last] against final shifted by `offset` frames."""
    graph = (f"[0:v]trim=start_frame={first}:end_frame={last + 1},setpts=PTS-STARTPTS[h];"
             f"[1:v]trim=start_frame={first + offset}:end_frame={last + 1 + offset},setpts=PTS-STARTPTS[o];"
             f"[h][o]psnr=stats_file=-")
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(head), "-i", str(final),
                          "-lavfi", graph, "-f", "null", "-"], capture_output=True, text=True)
    return [float("inf") if v == "inf" else float(v) for v in re.findall(r"psnr_avg:(inf|[\d.]+)", out.stdout)]


def frames_in_sync(head: Path, final: Path, first: int, last: int) -> bool:
    """True when Remotion showed the right source frame on every effect-free frame.

    Remotion's frame extraction has been seen to hand back a neighbouring frame
    under load, which plays as a stutter. On frames with no effects the render
    should match the source better than it matches the frames either side.
    """
    exact = _frame_psnr(head, final, first, last, 0)
    if not exact:
        return True  # nothing comparable — don't block the render on the check itself
    for offset in (-1, 1, 2):
        if first + offset < 0:
            continue
        shifted = _frame_psnr(head, final, first, last, offset)
        if any(s > e + 1.0 for e, s in zip(exact, shifted)):
            return False
    return True


def run_polish(project_dir: Path, edit: Path, *, preview: bool, full: bool, still: float | None) -> None:
    final = edit / "final.mp4"
    spec_path = edit / "polish.json"
    if not final.exists():
        sys.exit(f"no {final} — render the cut first (run_pipeline.py render)")
    if not spec_path.exists():
        sys.exit(f"no {spec_path} — write the polish plan first (see /youtube-edit polish)")
    if not (REMOTION_DIR / "node_modules").is_dir():
        sys.exit(f"Remotion isn't installed — run `npm install` in {REMOTION_DIR}")

    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    edl = json.loads((edit / "edl.json").read_text(encoding="utf-8"))
    info = _probe(final)

    stage = edit / "polish_stage"
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir(parents=True)
    _link_or_copy(final, stage / "final.mp4")

    props = build_props(spec, info, output_words(edl, edit), project_dir, stage)
    props_path = edit / "polish_props.json"
    props_path.write_text(json.dumps(props), encoding="utf-8")
    print(f"polish: {len(props['zooms'])} zoom(s), {len(props['popups'])} popup(s), "
          f"{len(props['captions'])} caption range(s), {len(props['words'])} caption word(s)")

    common = ["src/index.ts", "MainEdit", f"--props={props_path}", f"--public-dir={stage}"]

    if still is not None:
        out = edit / "verify" / f"polish_{still:07.2f}s.png"
        out.parent.mkdir(exist_ok=True)
        frame = min(round(still * info["fps"]), info["frames"] - 1)
        _remotion(["still", *common, str(out), f"--frame={frame}"])
        print(f"still -> {out}")
        return

    # Only the head of the video (up to the last effect) needs Remotion.
    fps = info["fps"]
    head_frames = min(info["frames"], int(effects_end(props) * fps) + round(fps * 0.5) + 1)
    if full or info["frames"] - head_frames < fps * 2:
        head_frames = info["frames"]
    if head_frames <= 0:
        sys.exit("polish.json has no zooms, popups or captions — nothing to render")
    head_s = head_frames / fps
    print(f"rendering {head_s:.1f}s of {info['duration']:.1f}s through Remotion"
          + ("" if head_frames == info["frames"] else " (the rest passes through untouched)"))

    head = edit / "polish_head.mp4"  # kept out of stage/ — that folder is Remotion's public dir
    render = ["render", *common, str(head), f"--frames=0-{head_frames - 1}", "--muted",
              "--codec=h264", "--crf=14", "--color-space=bt709"]
    if preview:
        render.append("--scale=0.5")
    _remotion(render)

    # The half-second after the last effect is untouched footage — use it to
    # confirm the render is frame-exact, and re-render once if it isn't.
    clean_first = int(effects_end(props) * fps) + 2
    synced = True
    if not preview and head_frames - clean_first >= 4:
        synced = frames_in_sync(head, final, clean_first, head_frames - 1)
        if not synced:
            print("frame sync check failed — rendering again")
            _remotion(render)
            synced = frames_in_sync(head, final, clean_first, head_frames - 1)

    out = edit / ("polish_preview.mp4" if preview else "final_polished.mp4")
    # Remotion writes full-range yuvj420p; Premiere and YouTube expect TV range.
    fix_range = "scale=in_range=full:out_range=tv," if _probe(head)["pix_fmt"].startswith("yuvj") else ""
    encode = ["-c:v", "libx264", "-preset", "veryfast" if preview else "medium",
              "-crf", "23" if preview else "18", "-pix_fmt", "yuv420p", "-r", f"{fps:g}",
              "-movflags", "+faststart"]
    if preview or head_frames == info["frames"]:
        cmd = ["ffmpeg", "-y", "-i", head, "-i", final,
               "-vf", f"{fix_range}format=yuv420p", "-map", "0:v", "-map", "1:a?",
               *encode, "-c:a", "copy", "-t", f"{head_s:.3f}", out]
    else:
        graph = (f"[0:v]{fix_range}format=yuv420p,setsar=1[h];"
                 f"[1:v]trim=start_frame={head_frames},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[t];"
                 f"[h][t]concat=n=2:v=1:a=0[v]")
        cmd = ["ffmpeg", "-y", "-i", head, "-i", final, "-filter_complex", graph,
               "-map", "[v]", "-map", "1:a?", *encode, "-c:a", "copy", out]
    print(f"  $ ffmpeg ... -> {out.name}")
    subprocess.run([str(c) for c in cmd], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

    got = _duration(out)
    want = head_s if preview else info["duration"]
    flag = "OK" if abs(got - want) <= 0.25 else "WARN"
    print(f"[{flag}] {out.name} = {got:.2f}s   expected ~{want:.2f}s")
    print(f"       {out}  ({out.stat().st_size / 1e6:.1f} MB)")
    if not synced:
        print("[WARN] frames are out of sync with the source after two renders — the polished "
              "stretch may stutter. Close other heavy apps and run polish again.")
