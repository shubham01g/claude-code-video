"""Silence-cut + render for /ship-video, driven by <project>/edit/cut.json.

Shubham's cut rules (defaults, set 2026-10-16):
  * cut only pauses longer than 1.0 s; shorter pauses stay untouched
  * every cut keeps 250 ms of the pause (150 ms tail + 100 ms head), never a hard cut
  * 30 ms audio fades at every edge, 30 fps output, -14 LUFS
  * pauses are measured on the Demucs vocal stem when raw/stems/<src>/vocals.wav exists
    (background / game music hides pauses in the mixed track) and the cut uses that
    stem as its audio, which removes the music

cut.json:
{
  "order":  ["intro_retake", "level1", "main"],          # raw/<name>.mp4, story order
  "remove": [["main", 0.0, 19.7, "mic test + false start"], ...],   # words fully inside go
  "blur":   {"intro_retake": [{"start": 12.0, "end": 29.5, "keep": [1500, 836, 402, 230]}]},
  "music":  "remove"            # remove (vocal stem only) | keep (mixed track)
  # optional: min_silence, tail, head, noise_db, fps
}

Usage (video-use venv):
  cut.py blur   <project>   -> edit/sources/<name>_blur.mp4 for every "blur" entry
  cut.py plan   <project>   -> edit/edl.json + edit/cut_report.md
  cut.py check  <project>   -> transcript words the cut drops (should be only Whisper ghosts)
  cut.py render <project>   -> edit/clips_graded/seg_*.mp4 + edit/final.mp4
"""
from __future__ import annotations

import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import soundfile as sf

BLIP = 0.08  # non-silence shorter than this inside a pause is a click, not speech


def cfg_of(project: Path) -> dict:
    c = json.loads((project / "edit" / "cut.json").read_text(encoding="utf-8"))
    c.setdefault("remove", [])
    c.setdefault("blur", {})
    c.setdefault("music", "remove")
    c.setdefault("min_silence", 1.0)
    c.setdefault("tail", 0.15)
    c.setdefault("head", 0.10)
    c.setdefault("noise_db", -48)
    c.setdefault("fps", 30)
    return c


def duration(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def raw_video(project: Path, name: str) -> Path:
    hits = [p for p in (project / "raw").glob(f"{name}.*") if p.suffix.lower() in (".mp4", ".mov", ".mkv")]
    if not hits:
        sys.exit(f"no raw/{name}.mp4|mov|mkv")
    return hits[0]


def video_src(project: Path, name: str, c: dict) -> Path:
    blurred = project / "edit" / "sources" / f"{name}_blur.mp4"
    if c["blur"].get(name):
        if not blurred.exists():
            sys.exit(f"{blurred.name} missing — run `cut.py blur` first")
        return blurred
    return raw_video(project, name)


def audio_src(project: Path, name: str, c: dict) -> Path:
    stem = project / "raw" / "stems" / name / "vocals.wav"
    if c["music"] == "remove" and stem.exists():
        return stem
    if c["music"] == "remove":
        print(f"  note: no vocal stem for {name} — using the mixed track (run stems.py to remove music)")
    wav = project / "edit" / "sources" / f"{name}_mix.wav"
    if not wav.exists():
        wav.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw_video(project, name)), "-vn", "-ac", "2",
                        "-ar", "48000", str(wav)], check=True)
    return wav


def silences(audio: Path, noise_db: float) -> list[tuple[float, float]]:
    out = subprocess.run(["ffmpeg", "-v", "info", "-i", str(audio), "-af",
                          f"highpass=f=80,silencedetect=noise={noise_db}dB:d=0.25", "-f", "null", "-"],
                         capture_output=True, text=True)
    start, spans = None, []
    for line in out.stderr.splitlines():
        if "silence_start:" in line:
            start = float(line.split("silence_start:")[1].split()[0])
        elif "silence_end:" in line and start is not None:
            spans.append((start, float(line.split("silence_end:")[1].split()[0])))
            start = None
    if start is not None:
        spans.append((start, duration(audio)))
    merged: list[list[float]] = []
    for s, e in spans:
        if merged and s - merged[-1][1] < BLIP:
            merged[-1][1] = e
        else:
            merged.append([s, e])
    return [(s, e) for s, e in merged]


def words(project: Path, name: str) -> list[dict]:
    path = project / "edit" / "transcripts" / f"{name}.json"
    if not path.exists():
        sys.exit(f"no transcript for {name} — run `run_pipeline.py ingest` first")
    return [w for w in json.loads(path.read_text(encoding="utf-8"))["words"] if w["type"] == "word"]


# --------------------------------------------------------------------------- #

def cmd_blur(project: Path) -> None:
    """Blur the screen during the given spans (suspense), keeping a face-cam box sharp."""
    c = cfg_of(project)
    for name, spans in c["blur"].items():
        out = project / "edit" / "sources" / f"{name}_blur.mp4"
        out.parent.mkdir(parents=True, exist_ok=True)
        parts, last = ["[0:v]split=" + str(len(spans) + 1) + "[base]" + "".join(f"[b{i}]" for i in range(len(spans)))], "base"
        for i, sp in enumerate(spans):
            a, b = float(sp["start"]), float(sp["end"])
            chain = f"[b{i}]gblur=sigma={sp.get('sigma', 38)}:steps=3"
            if sp.get("keep"):
                x, y, w, h = sp["keep"]
                parts.append(f"[b{i}]split[g{i}][k{i}]")
                chain = f"[g{i}]gblur=sigma={sp.get('sigma', 38)}:steps=3[gb{i}];[k{i}]crop={w}:{h}:{x}:{y}[kc{i}];[gb{i}][kc{i}]overlay={x}:{y}"
            parts.append(f"{chain},format=yuva420p,fade=t=in:st={a:.3f}:d=0.2:alpha=1,"
                         f"fade=t=out:st={b - 0.2:.3f}:d=0.2:alpha=1[bl{i}]")
            parts.append(f"[{last}][bl{i}]overlay=format=auto[o{i}]")
            last = f"o{i}"
        graph = ";".join(parts) + f";[{last}]format=yuv420p[v]"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw_video(project, name)), "-filter_complex", graph,
                        "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "16",
                        "-r", str(c["fps"]), str(out)], check=True)
        print(f"blur -> {out.name}  ({len(spans)} span(s))")


def cmd_plan(project: Path) -> None:
    c = cfg_of(project)
    fps, tail, head = c["fps"], c["tail"], c["head"]
    ranges, report = [], ["# Cut report", ""]
    total_raw = total_cut = 0.0
    for name in c["order"]:
        audio = audio_src(project, name, c)
        dur = min(duration(video_src(project, name, c)), duration(audio))
        total_raw += dur
        sil = silences(audio, c["noise_db"])
        ws = words(project, name)

        cuts, n_sil = [], 0
        for s, e in sil:
            if e - s <= c["min_silence"]:
                continue
            a = 0.0 if s <= 0.01 else s + tail
            b = dur if e >= dur - 0.01 else e - head
            if b > a:
                cuts.append((a, b, f"silence {e - s:.1f}s"))
                n_sil += 1

        for rname, a, b, why, *flags in c["remove"]:
            if rname != name:
                continue
            if "exact" in flags:  # edges measured by hand on the waveform — no snapping
                cuts.append((a, b, why + "  [exact]"))
                continue
            gone = [w for w in ws if w["start"] >= a and w["end"] <= b]
            before = [w for w in ws if w["end"] <= a + 0.01 and w not in gone]
            after = [w for w in ws if w["start"] >= b - 0.01 and w not in gone]
            lo = before[-1]["end"] if before else 0.0
            hi = after[0]["start"] if after else dur
            # snap to the real pauses around the removed words (Whisper edges drift)
            gap_lo = [x for x in sil if x[1] >= lo - 0.3 and x[0] <= (gone[0]["start"] if gone else a) + 0.3]
            gap_hi = [x for x in sil if x[0] <= hi + 0.3 and x[1] >= (gone[-1]["end"] if gone else b) - 0.3]
            ca = 0.0 if not before else (gap_lo[0][0] + tail if gap_lo else lo + tail)
            cb = dur if not after else (gap_hi[-1][1] - head if gap_hi else hi - head)
            cuts.append((ca, cb, why + "  [" + " ".join(w["text"] for w in gone)[:80] + "]"))

        cuts.sort()
        merged: list[list] = []
        for a, b, why in cuts:
            if merged and a <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], b)
                if not why.startswith("silence"):
                    merged[-1][2] = why
            else:
                merged.append([a, b, why])

        keep, t = [], 0.0
        for a, b, _ in merged:
            if a > t:
                keep.append((t, a))
            t = max(t, b)
        if t < dur:
            keep.append((t, dur))
        # drop slivers with no words in them (a cough or click inside a long pause)
        kept = [(a, b) for a, b in keep if b - a >= 1.0 or any(w["end"] > a and w["start"] < b for w in ws)]

        cut_len = 0.0
        for a, b in kept:
            fa = round(a * fps) / fps
            n = max(1, round((b - fa) * fps))
            ranges.append({"source": name, "start": round(fa, 4), "end": round(fa + n / fps, 4), "frames": n})
            cut_len += n / fps
        total_cut += cut_len
        report += [f"## {name}", f"raw {dur:.1f}s -> {cut_len:.1f}s, {len(kept)} ranges, "
                   f"{n_sil} pauses > {c['min_silence']}s cut", ""]
        report += [f"- {a:8.2f}-{b:8.2f}  {why}" for a, b, why in merged if not why.startswith("silence")]
        report.append("")

    edl = {"version": 1, "fps": fps,
           "sources": {n: str(video_src(project, n, c)) for n in c["order"]},
           "audio": {n: str(audio_src(project, n, c)) for n in c["order"]},
           "ranges": ranges, "total_duration_s": round(sum(r["frames"] for r in ranges) / fps, 3)}
    (project / "edit" / "edl.json").write_text(json.dumps(edl, indent=1), encoding="utf-8")
    report.insert(2, f"**Total:** raw {total_raw / 60:.1f} min -> cut {total_cut / 60:.1f} min, {len(ranges)} ranges\n")
    (project / "edit" / "cut_report.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


def cmd_check(project: Path) -> None:
    """Words the cut drops that aren't in a deliberate remove span. Verify each is silent on the stem."""
    c = cfg_of(project)
    edl = json.loads((project / "edit" / "edl.json").read_text(encoding="utf-8"))
    hits = 0
    for name in c["order"]:
        rs = [r for r in edl["ranges"] if r["source"] == name]
        rem = [(r[1], r[2]) for r in c["remove"] if r[0] == name]
        audio = sf.SoundFile(edl["audio"][name])
        for w in words(project, name):
            if any(r["start"] - 0.02 <= w["start"] and w["end"] <= r["end"] + 0.02 for r in rs):
                continue
            if any(a <= w["start"] and w["end"] <= b for a, b in rem):
                continue
            if any(r["start"] < w["end"] and w["start"] < r["end"] for r in rs):
                continue  # partly kept — Whisper stretched it across a pause
            audio.seek(int(w["start"] * audio.samplerate))
            x = audio.read(max(1, int((w["end"] - w["start"]) * audio.samplerate)), dtype="float32", always_2d=True)
            db = 20 * np.log10(np.sqrt(float((x ** 2).mean())) + 1e-9)
            flag = "ok (silent, Whisper ghost)" if db < c["noise_db"] else "CHECK: real speech?"
            print(f"{name:14s} {w['start']:8.2f}-{w['end']:8.2f}  {db:6.1f} dB  {flag}  {w['text']}")
            hits += 1
    print(f"{hits} dropped word(s)")


def cmd_render(project: Path) -> None:
    c = cfg_of(project)
    edit = project / "edit"
    edl = json.loads((edit / "edl.json").read_text(encoding="utf-8"))
    fps, ranges = edl["fps"], edl["ranges"]
    clips = edit / "clips_graded"
    clips.mkdir(exist_ok=True)
    for old in clips.glob("seg_*.mp4"):
        old.unlink()

    # audio: sample-exact concat, each piece exactly as long as its video frames
    pieces, files, sr = [], {}, None
    for r in ranges:
        f = files.setdefault(edl["audio"][r["source"]], sf.SoundFile(edl["audio"][r["source"]]))
        sr = f.samplerate
        n = int(round(r["frames"] / fps * sr))
        f.seek(int(round(r["start"] * sr)))
        buf = f.read(n, dtype="float32", always_2d=True)
        if len(buf) < n:
            buf = np.vstack([buf, np.zeros((n - len(buf), buf.shape[1]), dtype="float32")])
        fade = min(int(0.03 * sr), n // 2)
        ramp = np.linspace(0, 1, fade, dtype="float32")[:, None]
        buf[:fade] *= ramp
        buf[n - fade:] *= ramp[::-1]
        pieces.append(buf)
    voice = edit / "voice_cut.wav"
    sf.write(voice, np.vstack(pieces), sr)
    print(f"audio -> {voice.name}")

    def seg(i_r):
        i, r = i_r
        out = clips / f"seg_{i:04d}.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{r['start']:.4f}", "-i", edl["sources"][r["source"]],
                        "-frames:v", str(r["frames"]), "-an", "-r", str(fps), "-c:v", "libx264", "-preset", "fast",
                        "-crf", "18", "-pix_fmt", "yuv420p", "-g", "60", "-video_track_timescale", "15360", str(out)],
                       check=True)
        return out

    with ThreadPoolExecutor(max_workers=3) as ex:
        outs = list(ex.map(seg, enumerate(ranges)))
    print(f"video -> {len(outs)} segments")

    lst = edit / "_concat.txt"
    lst.write_text("".join(f"file '{o.as_posix()}'\n" for o in outs), encoding="utf-8")
    video_only = edit / "video_cut.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
                    str(video_only)], check=True)

    # voice chain: rumble cut, gentle compression, two-pass loudnorm to -14 LUFS
    chain = "highpass=f=75,acompressor=threshold=-24dB:ratio=3:attack=8:release=120:makeup=2"
    meas = subprocess.run(["ffmpeg", "-v", "info", "-i", str(voice), "-af",
                           f"{chain},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
          f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    final = edit / "final.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video_only), "-i", str(voice), "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-af", f"{chain},{ln},aresample=48000", "-c:a", "aac", "-b:a", "256k",
                    "-movflags", "+faststart", "-shortest", str(final)], check=True)
    video_only.unlink()
    got, want = duration(final), edl["total_duration_s"]
    print(f"[{'OK' if abs(got - want) < 0.1 else 'WARN'}] final.mp4 = {got:.2f}s  expected {want:.2f}s")


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("blur", "plan", "check", "render"):
        sys.exit(__doc__)
    {"blur": cmd_blur, "plan": cmd_plan, "check": cmd_check, "render": cmd_render}[sys.argv[1]](Path(sys.argv[2]).resolve())
