"""Vertical reel pass: a horizontal cut -> 1080x1920 reel through the Remotion `ReelEdit` composition.

Reads <project>/edit/reel.json (times in seconds on the cut video, edit/final.mp4) and writes
edit/reel.mp4.

v1 (no "version" key): face in the bottom panel the whole way, graphics on top, pill captions.
v2 ("version": 2) — the style learned from the reference reels (Instagram/reference-analysis/style-bible.md):
  * every scene picks a layout: split (graphic top / medium face) · full (graphic only) · face (punch-in);
    any gap between scenes is a full-face punch-in
  * scene themes: glass / cream / dark
  * caption presets: bold / clean / editorial, keyword + accent words from the script
  * audio: voice normalised to -14 LUFS, optional speed-up, optional music bed, soft tap on each graphic
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from polish import (REMOTION_DIR, _duration, _link_or_copy, _probe, _remotion, _stage_asset,
                    apply_fixes, build_props, output_words)

REPO_ROOT = Path(__file__).resolve().parents[4]
MUSIC_DIR = REPO_ROOT / "Instagram" / "music"
WIDTH, HEIGHT = 1080, 1920
SCENES = {"ReelBars", "ReelChecklist", "ReelComment", "ReelFlatline", "ReelImages", "ReelStat", "ReelTitle",
          "ReelHeadline", "ReelTerminal", "ReelAppCard", "ReelPills", "ReelScreenshot", "ReelChat", "ReelSteps", "ReelMedia"}
LAYOUTS = {"split", "full", "face"}
THEMES = {"glass", "cream", "dark"}
CAPTION_DEFAULTS = {  # style -> (maxWords, maxChars, uppercase)
    "pill": (2, 14, False), "bold": (3, 18, True), "clean": (3, 20, False), "editorial": (2, 14, True),
}
GAP_WARN = 0.6  # v1: the graphics panel sitting empty longer than this reads as a mistake
MEDIA_KEYS = {"src", "image"}


def _fail(msg: str) -> None:
    sys.exit(f"reel.json: {msg}")


def _norm(word: str) -> str:
    return re.sub(r"[^a-z0-9%$+]", "", word.lower())


def _stage_media(value, project_dir: Path, stage: Path):
    """Stage every asset a scene names (keys `src` / `image`, also inside lists) for Remotion."""
    if isinstance(value, dict):
        return {k: (_stage_asset(v, project_dir, stage) if k in MEDIA_KEYS and isinstance(v, str) and "." in v
                    else _stage_media(v, project_dir, stage)) for k, v in value.items()}
    if isinstance(value, list):
        return [_stage_media(v, project_dir, stage) for v in value]
    return value


def _crop(spec: dict | None, default: dict, name: str) -> dict:
    spec = spec or {}
    crop = {k: float(spec.get(k, default[k])) for k in ("x", "y", "scale")}
    if not (0 <= crop["x"] <= 1 and 0 <= crop["y"] <= 1 and 1.0 <= crop["scale"] <= 2.0):
        _fail(f"{name} needs x and y between 0 and 1, and scale between 1.0 and 2.0")
    return crop


def build_reel_props(spec: dict, info: dict, words: list[dict], project_dir: Path, stage: Path, auto_fixes: dict) -> dict:
    total = info["duration"]
    version = int(spec.get("version", 1))
    v2 = version >= 2

    split = float(spec.get("split", 0.43 if v2 else 0.5))
    if not (0.3 <= split <= 0.6):
        _fail(f"split is {split} — the graphics panel should take 0.3-0.6 of the height")
    face = _crop(spec.get("face"), {"x": 0.5, "y": 0.0, "scale": 1.0}, "face")
    face_full = _crop(spec.get("faceFull"), {"x": face["x"], "y": 0.0, "scale": 1.05}, "faceFull")

    # Zooms follow the polish rules; by default they push in on the face, not the frame centre.
    zooms_in = [{**z, "focus": z.get("focus", [face["x"], 0.3])} for z in spec.get("zooms", [])]
    zooms = build_props({"zooms": zooms_in}, info, [], project_dir, stage)["zooms"]

    scenes = []
    for s in spec.get("scenes", []):
        at, duration = float(s["at"]), float(s["duration"])
        layout = s.get("layout") or ("full" if s.get("full") else "split")
        if layout not in LAYOUTS:
            _fail(f"scene at {at}s: layout must be one of {sorted(LAYOUTS)}")
        if layout != "split" and not v2 and layout != "full":
            _fail(f"scene at {at}s: layout '{layout}' needs \"version\": 2")
        component = s.get("component")
        if layout == "face":
            component = None
        elif component not in SCENES:
            _fail(f"scene at {at}s: component must be one of {sorted(SCENES)}")
        theme = s.get("theme", "glass")
        if theme not in THEMES:
            _fail(f"scene at {at}s: theme must be one of {sorted(THEMES)}")
        if at < 0 or duration <= 0 or at >= total:
            _fail(f"scene at {at}s: needs 0 <= at < {total:.1f} and duration > 0")
        props = _stage_media(dict(s.get("props", {})), project_dir, stage)
        scenes.append({"at": at, "duration": min(duration, total - at), "component": component,
                       "props": props, "layout": layout, "theme": theme})
    scenes.sort(key=lambda s: s["at"])
    for a, b in zip(scenes, scenes[1:]):
        if b["at"] < a["at"] + a["duration"] - 0.01:
            _fail(f"scenes overlap: one runs to {a['at'] + a['duration']:.2f}s, the next starts at {b['at']}s")
    if not v2:
        edges = [0.0] + [t for s in scenes for t in (s["at"], s["at"] + s["duration"])] + [total]
        for end, start in zip(edges[0::2], edges[1::2]):
            if start - end > GAP_WARN:
                print(f"[WARN] graphics panel is empty from {end:.2f}s to {start:.2f}s")
    else:
        shares = {k: 0.0 for k in LAYOUTS}
        covered = 0.0
        for s in scenes:
            shares[s["layout"]] += s["duration"]
            covered += s["duration"]
        shares["face"] += max(0.0, total - covered)
        print("layout share: " + ", ".join(f"{k} {v / total:.0%}" for k, v in sorted(shares.items())) +
              "   (references: split ~38%, full ~45%, face ~17%)")

    captions = None
    cap = spec.get("captions", {})
    if cap is not False and cap is not None:
        style = cap.get("style", "bold" if v2 else "pill")
        if style not in CAPTION_DEFAULTS:
            _fail(f"captions.style must be one of {sorted(CAPTION_DEFAULTS)}")
        mw, mc, up = CAPTION_DEFAULTS[style]
        script = _script(project_dir)
        keywords = [_norm(w) for w in cap.get("keywords", [])]
        if script.get("keyword"):
            keywords.append(_norm(script["keyword"]))
        captions = {"style": style, "maxWords": int(cap.get("maxWords", mw)), "maxChars": int(cap.get("maxChars", mc)),
                    "uppercase": bool(cap.get("uppercase", up)), "keywords": sorted(set(keywords)),
                    "accent": sorted({_norm(w) for w in cap.get("accent", [])})}
    fixes = {**auto_fixes, **spec.get("captionFixes", {})}
    # a word clipped to a sliver at a cut edge (Whisper phantom "And" after the CTA) would flash on screen
    words = [w for w in words if w["end"] - w["start"] >= 0.06]
    shown = apply_fixes(words, fixes) if captions else []

    return {"video": "final.mp4", "width": WIDTH, "height": HEIGHT, "fps": info["fps"],
            "durationInFrames": info["frames"], "sourceAspect": info["width"] / info["height"],
            "version": 2 if v2 else 1, "split": split, "face": face, "faceFull": face_full, "zooms": zooms,
            "scenes": scenes, "captions": captions, "words": shown}


def _script(project_dir: Path) -> dict:
    p = project_dir / "script.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


# --------------------------------------------------------------------------- audio

def _tap() -> Path:
    """A soft paper-tap SFX, synthesised once (style-bible §6: soft taps, never lasers/zaps)."""
    tap = MUSIC_DIR / "sfx" / "tap.wav"
    if not tap.exists():
        tap.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anoisesrc=d=0.09:c=pink:a=0.9:r=48000",
                        "-af", "highpass=f=900,lowpass=f=5200,afade=t=in:d=0.004,afade=t=out:st=0.012:d=0.075,volume=0.9",
                        "-ac", "2", str(tap)], check=True)
    return tap


def _music(src: str, project_dir: Path) -> Path:
    for c in (Path(src), project_dir / "assets" / src, MUSIC_DIR / src):
        if c.is_file():
            return c
    _fail(f"music '{src}' not found (looked in the project assets/ and {MUSIC_DIR})")
    raise SystemExit


def mux(body: Path, final: Path, out: Path, info: dict, spec: dict, scenes: list[dict], project_dir: Path, preview: bool) -> float:
    v2 = int(spec.get("version", 1)) >= 2
    speed = float(spec.get("speed", 1.0))
    if not (1.0 <= speed <= 1.25):
        _fail("speed must be between 1.0 and 1.25")
    dur_out = info["duration"] / speed
    fix_range = "scale=in_range=full:out_range=tv," if _probe(body)["pix_fmt"].startswith("yuvj") else ""

    inputs = ["-i", str(body), "-i", str(final)]
    fc = [f"[0:v]{fix_range}setpts=PTS/{speed},format=yuv420p[v]"]
    voice = "[1:a]aresample=48000"
    if v2 or spec.get("loudness"):
        voice += f",loudnorm=I={float(spec.get('loudness', -14))}:TP=-1.5:LRA=9"
    if speed != 1.0:
        voice += f",atempo={speed}"
    fc.append(voice + "[voice]")
    mix = ["[voice]"]

    music = spec.get("music")
    if music:
        m = music if isinstance(music, dict) else {"src": music}
        inputs += ["-stream_loop", "-1", "-i", str(_music(m["src"], project_dir))]
        idx = sum(1 for a in inputs if a == "-i") - 1
        vol = float(m.get("volume", 0.12))
        fc.append(f"[{idx}:a]aresample=48000,loudnorm=I=-14:TP=-2,volume={vol},atrim=0:{dur_out:.3f},"
                  f"afade=t=out:st={max(0.0, dur_out - 2):.3f}:d=2[music]")
        mix.append("[music]")

    sfx = spec.get("sfx", v2)
    hits = [s["at"] / speed for s in scenes if s.get("component")] if sfx else []
    if hits:
        inputs += ["-i", str(_tap())]
        idx = sum(1 for a in inputs if a == "-i") - 1
        vol = float(sfx.get("volume", 0.35)) if isinstance(sfx, dict) else 0.35
        labels = [f"[t{i}]" for i in range(len(hits))]
        fc.append(f"[{idx}:a]volume={vol},asplit={len(hits)}" + "".join(labels) if len(hits) > 1 else f"[{idx}:a]volume={vol}[t0]")
        for i, h in enumerate(hits):
            ms = int(h * 1000)
            fc.append(f"[t{i}]adelay={ms}|{ms}[d{i}]")
            mix.append(f"[d{i}]")
    if len(mix) > 1:
        fc.append("".join(mix) + f"amix=inputs={len(mix)}:duration=first:normalize=0[a]")
        amap = "[a]"
    else:
        fc[-1] = fc[-1].replace("[voice]", "[a]")
        amap = "[a]"

    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", amap,
           "-c:v", "libx264", "-preset", "veryfast" if preview else "medium", "-crf", "23" if preview else "18",
           "-pix_fmt", "yuv420p", "-r", f"{info['fps']:g}", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
           "-movflags", "+faststart", "-t", f"{dur_out:.3f}", str(out)]
    print(f"  $ ffmpeg ... -> {out.name}   (speed {speed}x, music {'yes' if music else 'no'}, taps {len(hits)})")
    r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    if r.returncode:
        sys.exit("ffmpeg mux failed:\n" + r.stderr[-2500:])
    return dur_out


def run_reel(project_dir: Path, edit: Path, *, preview: bool, still: float | None) -> None:
    final = edit / "final.mp4"
    spec_path = edit / "reel.json"
    if not final.exists():
        sys.exit(f"no {final} — render the cut first (run_pipeline.py render)")
    if not spec_path.exists():
        sys.exit(f"no {spec_path} — write the reel plan first (see /insta-reel)")
    if not (REMOTION_DIR / "node_modules").is_dir():
        sys.exit(f"Remotion isn't installed — run `npm install` in {REMOTION_DIR}")

    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    edl = json.loads((edit / "edl.json").read_text(encoding="utf-8"))
    info = _probe(final)
    auto_fix_path = edit / "caption_fixes.auto.json"
    auto_fixes = json.loads(auto_fix_path.read_text(encoding="utf-8")) if auto_fix_path.exists() else {}

    stage = edit / "reel_stage"
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir(parents=True)
    _link_or_copy(final, stage / "final.mp4")

    props = build_reel_props(spec, info, output_words(edl, edit), project_dir, stage, auto_fixes)
    props_path = edit / "reel_props.json"
    props_path.write_text(json.dumps(props), encoding="utf-8")
    print(f"reel v{props['version']}: {len(props['scenes'])} scene(s), {len(props['zooms'])} zoom(s), "
          f"{len(props['words'])} caption word(s)")

    common = ["src/index.ts", "ReelEdit", f"--props={props_path}", f"--public-dir={stage}"]

    if still is not None:
        out = edit / "verify" / f"reel_{still:07.2f}s.png"
        out.parent.mkdir(exist_ok=True)
        frame = min(round(still * info["fps"]), info["frames"] - 1)
        _remotion(["still", *common, str(out), f"--frame={frame}"])
        print(f"still -> {out}")
        return

    body = edit / "reel_render.mp4"
    render = ["render", *common, str(body), "--muted", "--codec=h264", "--crf=14", "--color-space=bt709"]
    if preview:
        render.append("--scale=0.5")
    _remotion(render)

    out = edit / ("reel_preview.mp4" if preview else "reel.mp4")
    expected = mux(body, final, out, info, spec, props["scenes"], project_dir, preview)
    got = _duration(out)
    flag = "OK" if abs(got - expected) <= 0.25 else "WARN"
    print(f"[{flag}] {out.name} = {got:.2f}s   expected ~{expected:.2f}s")
    print(f"       {out}  ({out.stat().st_size / 1e6:.1f} MB)")
