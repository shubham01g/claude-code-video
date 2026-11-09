---
name: video-edit
description: >
  Turn a raw long-form screen/talking-head recording into a finished cut. Drop
  footage in a project's raw/ folder and this transcribes it locally, removes
  silences / filler / retakes, and renders edit/final.mp4 with social-ready
  audio + a sidecar .srt. Use only for a cut-only job — "just cut my recording",
  "clean up this footage, no graphics". When the user drops raw footage for a
  YouTube video ("here's the raw video", "edit this video"), use /ship-video,
  which runs this pipeline plus intro polish, thumbnail and title end to end.
argument-hint: <project-slug>  |  status <project-slug>
---

# video-edit — long-form main-edit pipeline

> **Full video in one go?** Use `/ship-video` — it runs this pipeline plus graphics, thumbnail and title from his brief for that video, asking about anything the brief leaves open. Use `/video-edit` directly only for a cut-only job.

Wraps the vendored `YouTube/video-use/` helpers (browser-use/video-use) with a
local Whisper transcription layer and Windows toolchain glue. video-use itself
is unmodified — all glue is in `scripts/`.

## What v1 does

`raw/*.mp4` → transcribe (local, free) → `takes_packed.md` → **you propose a cut
plan, the user approves** → `edl.json` → `render.py` → `edit/final.mp4` +
`edit/captions.srt` + duration check.

Removes: dead air between phrases, filler-only bits, false starts, retakes.
Bakes in: 30 ms audio fades at every cut, loudness normalization (-14 LUFS).

## What v1 does NOT do (yet)

- Zooms, pop-up B-roll (text / logos / full-frame graphics) and burned captions —
  those are the polish pass: `/youtube-edit polish <slug>`, which runs on this
  skill's `final.mp4` and writes `edit/final_polished.mp4`. Once the cut is
  approved, offer it.
- Music, intro/outro stings.
- Multi-cam / multi-speaker. Single continuous recording assumed.

## Project layout

```
YouTube/edits/<slug>/
  raw/          <- the user drops the recording here (mp4/mov/mkv)
  edit/         <- everything below is generated
    transcripts/<stem>.json   cached word-level transcript (Scribe-shaped)
    takes_packed.md           phrase-level view you read to plan cuts
    edl.json                  the cut decision list you author
    captions.srt              sidecar subtitles (output timeline)
    final.mp4                 the deliverable
    project.md                session log (append every run)
```

## Cold-start checks (once per machine)

1. `YouTube/video-use/.venv/Scripts/python.exe` exists. If not, run
   `.claude/skills/video-edit/scripts/setup.ps1`.
2. `ffmpeg` + `ffprobe` resolve. If a fresh winget install isn't on PATH yet,
   `scripts/_paths.py` self-heals by finding the winget location; a Claude Code
   restart makes it permanent.
3. First `ingest` downloads the Whisper model (~500 MB for `small.en`) to the HF
   cache. One time.

Always run the pipeline with the venv interpreter:
`YouTube/video-use/.venv/Scripts/python.exe .claude/skills/video-edit/scripts/run_pipeline.py ...`

## Workflow

### 1. Set up the project
Pick a slug from the video topic (kebab-case). Make `YouTube/edits/<slug>/raw/`
and move the recording into it. Confirm the file with `run_pipeline.py status <slug-dir>`.

### 2. Ingest
```
<venv-py> scripts/run_pipeline.py ingest YouTube/edits/<slug>
```
Transcribes each `raw/` file (cached) and writes `takes_packed.md`. For a jargon-
heavy video pass `--model medium.en` (slower, better on "Claude Code",
"Remotion", product names).

### 3. Pre-scan
Read `takes_packed.md` end to end. Note: filler-only lines, false starts
(dashes, repeated sentence openers, "let me redo that"), obvious retakes (the
same sentence delivered twice), and any tangent that doesn't serve the video.
Keep a plain list.

### 4. Propose the cut plan — then STOP
Post a short plan and wait for the user's yes. Cover:
- raw runtime → estimated cut runtime
- how many silence gaps, filler bits, false starts, retakes you're removing
- what stays (the substance / structure)
- anything you're unsure about (retake A vs B, keep a tangent or not)
- confirm: pad 50 ms head / 80 ms tail, no grade, no burned captions

Do not write `edl.json` before approval. (video-use Hard Rule 11.)

### 5. Author edl.json
Write `YouTube/edits/<slug>/edit/edl.json`:

```json
{
  "version": 1,
  "sources": { "<stem>": "C:/abs/path/to/raw/<stem>.mp4" },
  "ranges": [
    { "source": "<stem>", "start": 2.42, "end": 18.90, "beat": "HOOK",
      "quote": "first few words...", "reason": "clean take" }
  ],
  "total_duration_s": 512.7
}
```

Rules:
- **One range per run of speech you keep.** The gaps you leave *between* ranges
  are the silences being cut. `takes_packed.md` already breaks phrases on
  silence ≥ 0.5 s, so most ranges = one phrase line, or a few consecutive phrase
  lines with < 0.5 s between them merged into one range.
- **Pad:** `start = firstWord.start - 0.05`, `end = lastWord.end + 0.08`
  (working window 30–200 ms, Hard Rule 7).
- **Snap to word boundaries** (Hard Rule 6). Phrase `[start-end]` values are
  already word-aligned; for mid-phrase trims (cutting a leading "um", a false
  start) pull the exact word `start`/`end` from `edit/transcripts/<stem>.json`.
- **Filler-only phrase** → omit its range entirely.
- **False start** → start the range at the restart word.
- **Retake** → keep the cleanest delivery, omit the rest.
- Ranges stay in chronological order (single take → source order = story order).
- `total_duration_s` = Σ(end − start).
- No `grade`, `overlays`, or `subtitles` keys in v1.

### 6. Render
```
<venv-py> scripts/run_pipeline.py render YouTube/edits/<slug>
```
Runs `video-use/helpers/render.py` (`--no-subtitles`), then builds
`captions.srt`, then checks `final.mp4` duration vs `total_duration_s`.
Add `--preview` for a fast 1080p pass while iterating; drop it for the final.

### 7. Verify before showing the user
- Watch the first 10 s, 2–3 mid cuts, last 10 s of `final.mp4`.
- Any hard audio pop, clipped word, or jump cut mid-sentence → fix the offending
  range in `edl.json`, re-render. Cap at 3 passes, then flag what's left.
- `timeline_view.py <raw> <t0> <t1> --transcript edit/transcripts/<stem>.json`
  renders a filmstrip+waveform PNG around a suspicious cut if you need to see it.

### 8. Persist
Append a section to `edit/project.md`: slug, raw→final runtime, what was cut,
model used, anything deferred. Then hand the user `final.mp4` + `captions.srt`.

## Hard rules inherited from video-use

Never cut inside a word · pad every edge 30–200 ms · 30 ms audio fades at every
boundary (render.py does this) · cache transcripts, never re-transcribe an
unchanged source · confirm the plan before cutting · all output under
`edit/`, never inside `YouTube/video-use/`.

## Known limitations

- **Filler removal is best-effort.** Whisper transcribes "um/uh/like" only
  partially; `transcribe_local.py` uses a disfluency-biased `initial_prompt` to
  keep more. Silence removal is exact and is the bigger win. If a video is very
  filler-heavy and the cut still feels loose, re-ingest with `--model medium.en`
  or hand-trim the ranges.
- **render.py outputs 24 fps** (video-use default). Fine for talking-head; if
  screen-capture judder shows, that's the knob to change (see README).
- PATH: a just-installed ffmpeg needs a Claude Code restart to be on the Bash
  tool's PATH; the pipeline self-heals in-process meanwhile.

## Roadmap

- **Shipped — polish pass** (`run_pipeline.py timeline` / `polish`, driven by
  `edit/polish.json`): zooms, popups, full-frame scenes, captions. Documented in
  `/youtube-edit` Mode D.
- Next — auto-suggest zooms on long static stretches; music bed.
