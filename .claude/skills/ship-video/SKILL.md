---
name: ship-video
description: Use when the user gives raw recordings for a YouTube video together with information about it (what the video is, what he wants in the edit, intro, thumbnail, title) and wants it implemented — cut, audio cleanup, intro motion graphics, thumbnail, title. Every video is a different kind of AI content; the edit follows his brief for that video, and gaps get asked, not guessed. Trigger on 'here's the raw video', 'edit this video', 'make the final video', a recordings folder plus instructions.
argument-hint: <path-to-recordings> + what this video is and what you want
---

# Ship Video — the user's brief + raw recordings → finished video

The user makes AI-related content and **every video is a different type**: tutorials, tool
reviews, experiments, builds, comparisons, opinions. This skill is not a template. It is a way
of working: read his brief, ask what's missing, then implement exactly what he asked with the
tools below. Nothing from a previous video (its graphics, thumbnail layout, title angle,
blur, music removal) carries over unless this video's brief or footage calls for it.

## Step 1 — Read the brief and the footage

Collect what he gave you: the files, what the video is about, and any instructions (cut rules,
retakes, intro ideas, graphics, blur, music, thumbnail references, title ideas).

Then learn the footage before deciding anything:
- `ffprobe` every file; set up `YouTube/edits/<slug>/raw/` (hard links, renamed by role — Step 3).
- Start transcription in the background (`run_pipeline.py ingest … --model small.en`).
- `frames.py sheet` per file → what's on screen: face cam, screen recording, gameplay, slides,
  and whether there's background audio (music, game sound, video playing).

## Step 2 — Ask before you build

List every decision for this video and sort it:
- **He told you** → do exactly that.
- **The footage settles it** (e.g. obvious mic test, "cut again, redo") → do it, mention it.
- **Neither** → ask. Don't guess on anything that changes the video he gets.

Ask in **one batch** (AskUserQuestion, up to 4 per call, recommended option first), only the
questions whose answers change the output. Typical ones when the brief is silent:

| Topic | Ask when |
|---|---|
| Files & order | more than one recording and names / transcripts don't make the order obvious; an intro or outro retake exists |
| Cut style | always confirm the pause rule on a new type of video — last used: cut pauses > 1 s, keep 250 ms (see Defaults) |
| Background audio | music / game / app sound is under his voice — remove it, lower it, or keep it? |
| Intro | what the hook is, what should be shown or hidden (blur a result for suspense?), how much motion graphics |
| Rest of video | graphics / zooms beyond the intro, or clean cut only? |
| Thumbnail | his reference thumbnails or concept; what goes in it (face, screenshots, text, logos) |
| Title | an angle he wants, or should you propose options? |

Then post a short plan (5–10 lines: order, what gets cut, audio, intro beats, graphics,
thumbnail idea) and build. If he corrects the plan, follow the correction.

During the run, if something comes up that the brief didn't cover and that changes the result
(a second take of equal quality, a tangent that might belong, a screen that may be private),
ask. Don't silently decide it.

## Step 3 — Cut

Project: `YouTube/edits/<slug>/`. Python: `PY=YouTube/video-use/.venv/Scripts/python.exe`,
scripts `S=.claude/skills/ship-video/scripts`, `VE=.claude/skills/video-edit/scripts`.

1. **Raw files**, hard-linked and renamed by role (`intro_retake`, `main`, `part1`, …):
   `New-Item -ItemType HardLink -Path "<raw>\main.mp4" -Target "<file>"` (PowerShell).
2. **Background audio** — only if the answer was "remove" or "lower":
   `$PY $S/stems.py YouTube/edits/<slug>` (Demucs, ~1.7× realtime, run in background) →
   `raw/stems/<name>/vocals.wav` + `no_vocals.wav`. "Lower" = mix `no_vocals` back in at the
   level he wants (default ~−25 dB) — tell him the stems exist so the level is easy to change.
3. **`edit/cut.json`** — order, removals (with reasons), blur spans, cut rule:
   ```json
   { "order": ["intro_retake", "main"], "music": "remove",
     "min_silence": 1.0, "tail": 0.15, "head": 0.10,
     "blur": { "intro_retake": [ { "start": 12.0, "end": 29.5, "keep": [1500, 836, 402, 230] } ] },
     "remove": [ ["main", 0.0, 19.7, "mic test + first attempt"] ] }
   ```
   `"music": "keep"` uses the mixed track (no stems needed). A `remove` span drops every word
   fully inside it; edges snap to real pauses. Get exact word times from `edit/transcripts/*.json`.
4. **Blur** (only if asked or agreed): find the span with a frame-by-frame brightness probe —
   start before the crossfade in, end after the crossfade out; `keep` = face-cam box to leave
   sharp. `$PY $S/cut.py blur …`, then check frames at both edges and the middle.
   **Private data** (emails, API keys, client names, chat history, file names) is a different job: blur only that
   box, on the CUT video. `edit/redact.json` (`{"boxes": [{start, end, box: [x,y,w,h], why}]}`, cut-timeline
   times) → `$PY $S/redact.py still <project> <t> out.jpg` to check a box → `$PY $S/redact.py apply <project>`
   (keeps `final_unredacted.mp4`, writes the blurred `final.mp4`). Run it after render, before polish.
   Find the spans by scanning the cut, not by guessing: a 10 fps low-res gray dump
   (`ffmpeg -vf fps=10,scale=192:108,format=gray -f rawvideo`) + region means finds screen states, and
   template-matching a cropped strip finds a recurring line (the Claude Code panel's Account email) exactly.
   Re-cutting shifts times — remap redact.json through the old/new EDL instead of re-scanning.
5. A `remove` entry with a 5th element `"exact"` uses its edges as given (no snapping) — for a false start
   separated by a pause shorter than 0.25 s, which the snapping would otherwise keep.
   `$PY $S/cut.py plan …` → `edit/edl.json` + `cut_report.md`
   `$PY $S/cut.py check …` → every dropped word must be "ok (silent…)"; CHECK = real speech lost
   `$PY $S/cut.py render …` → `edit/final.mp4` (30 fps, −14 LUFS, 30 ms fades)
6. Verify: frame count = `total_duration_s × fps`, audio length matches, loudness ≈ −14 LUFS,
   no pause longer than the rule allows.

## Step 4 — Motion graphics (what the brief asks for)

1. `$PY $VE/run_pipeline.py timeline …` → `edit/timeline.md` / `timeline_words.json` (cut timeline).
2. Whisper word times drift 0.1–0.5 s; for any word a graphic lands on, check its onset on the
   voice track (50 ms RMS envelope) and use that.
3. **Design for this video's content.** Read `/youtube-edit` first (Learned Lessons + glass
   components). Graphics illustrate what he says at that moment: a number → a counter, a list →
   items lighting up on their words, a process → steps, a comparison → side by side, a tool →
   its logo. Reuse a component when it truly fits; otherwise write a new one in
   `YouTube/remotion/src/components/` and register it in `polish/Popups.tsx` SCENES and
   `SCENES` in `$VE/polish.py`. Never repeat a previous video's graphic because it worked there.
4. Standing style rules (from his feedback, still apply): frosted glass over the footage, not
   white/cream cards · no pop-out text labels scattered around him · no captions unless asked ·
   zooms subtle (1.06–1.16).
5. `edit/polish.json` → `--still` at every graphic and mid-zoom, **look at each** (wraps,
   overlaps, cut-off text, face cropped), fix, then `run_pipeline.py polish …` →
   `edit/final_polished.mp4`. Must end `[OK]`, no frame-sync warning.

## Step 5 — Thumbnail (from his concept)

Build what he describes or what his reference thumbnails show — ask for references if there
are none. Tools:
- `frames.py sheet` / `grab` to find and extract real frames (`--crop` to drop the face cam).
- ffmpeg for grading and cleanup (`delogo` for HUD text, `eq` for colour).
- Remotion stills for layout, 1280×720. `PanelThumbnail` (`components/PanelThumbnail.tsx`,
  props JSON) fits **comparison** videos: logo + title over N glowing panels with label pills,
  subject cropped identically in every panel. For other concepts, write a new still composition.
- Render with `TEMP`/`TMP` set to `YouTube/.remotion-tmp` (C: fills up). Export JPG < 2 MB.
- If he wants an AI-generated version, write `thumbnail/prompt.md` with the rendered layout as
  reference; describe characters instead of naming them (generators refuse named IP).

## Step 6 — Title

From what actually happens in the video: one pick + 3–4 backups, each labelled with its angle.
Don't repeat the thumbnail text; add what the image can't. Any curiosity hook must be paid off
by the video. ≤ 70 characters, include the tool people search for. Follow his angle if he gave one.

## Step 7 — Verify and deliver

- Frames from `final_polished.mp4` at each graphic and a few mid-video points.
- Re-transcribe the first ~4 min of the output and read it: flow intact, no clipped words.
- If background audio was removed: spectrogram of a stretch that had it.
- Append to `edit/project.md`: brief, answers to your questions, sources/order, runtime, removals,
  audio, graphics, checks, thumbnail, title.
- Open the folder in Explorer. Reply with outputs, what you did, every assumption, and the
  choices he may want to revisit.

## Defaults — only when the brief and his answers don't say otherwise

| | Last used (2026-10-16) | Note |
|---|---|---|
| Pause cut | > 1.0 s cut, 250 ms of the pause kept (150 tail + 100 head) | confirm on a new video type |
| Removed content | mic tests, countdowns, "cut again / redo" + the take before it, false starts, lone fillers, repeated lines | mention all in the reply |
| Audio | 75 Hz highpass, 3:1 compressor, −14 LUFS | |
| Video | 30 fps, H.264 CRF 18 | |
| Captions | none | his standing preference |
| Graphic look | glass over footage | his standing preference |

## Reference runs

- `YouTube/edits/claude-game-effort-levels/` (2026-10-16) — comparison/experiment video
  (same game built at 5 Claude effort levels). Intro retake replaced the old intro; setup and
  results recordings joined; game music removed; intro with `OpusEffort`, `MysteryReveal`
  over a blurred result screen, `PromptFanout`; `PanelThumbnail` with 4 level panels.
  Use it to see how the tools fit together, not as the plan for the next video.

## Learned lessons

1. **Every video is different** (2026-10-16). Don't apply one video's edit to the next; work from
   his brief and ask about gaps.
2. Measure pauses on the voice track (Demucs stem when there's background audio), never Whisper
   timings — Whisper is up to 0.6 s off and invents words in silence.
3. Demucs removes game / app sound effects along with music. Say so; offer to mix them back low.
4. The 1 s pause rule also cuts silent screen action (gameplay, waiting on a build). Say so in
   the reply so he can ask for stretches back.
5. Remotion copies the whole source video into %TEMP% on each run; `polish.py` points TEMP at
   `YouTube/.remotion-tmp` and clears it — do the same for direct `npx remotion` calls.
6. ffmpeg `drawtext` segfaults here without `fontfile=` — `frames.py` passes Arial.
7. Thumbnail panels that compare things must frame the subject identically (centre, size, feet
   line) — scattered crops were rejected.
8. A folder can hold one video in parts (setup one day, results another). When the transcripts
   chain, the parts belong together — confirm with him if he only mentioned one file.

## Auto-improvement

When he corrects anything: fix it, add a dated lesson here, and only move something into
Defaults when he says it applies to every video.
