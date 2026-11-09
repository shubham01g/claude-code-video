---
name: youtube-edit
description: Use when planning YouTube video animations, editing a video script for motion graphics, creating Remotion components, training brand guidelines, adding zoom-ins, pop-up text/logos/B-roll or captions to a cut video, or when someone says 'edit my video', 'plan animations for', 'generate Remotion code', 'youtube edit', 'video motion graphics', 'add zooms', 'add captions', 'add b-roll', or 'polish the intro'.
argument-hint: train-brand | plan [video-title] | build | polish [slug]
---

# YouTube Edit Skill

Analyzes a YouTube video script, plans where motion graphics go (following the editor thinking framework and brand guidelines), then generates Remotion React code for those animations. `polish` applies smooth zooms, pop-up B-roll and captions directly onto a cut video from `/video-edit`.

> For a whole video end to end (cut → intro polish → thumbnail → title) use `/ship-video`, which drives Mode D from his brief for that video.

## Auto-Improvement Protocol

**This skill improves itself over time.** Whenever the user points out something wrong, something to fix, or something he doesn't like about the output:

1. Fix it in the affected component immediately
2. Add the lesson to the **Learned Lessons** section at the bottom of this file
3. Re-render the affected scene to confirm the fix
4. Never repeat the same mistake

When starting any session, read the Learned Lessons section first.

---

## Reference files to load first
- `YouTube/editor-thinking.md` — editor thinking framework (decision rules for animation types)
- `YouTube/brand-guidelines.md` — brand colors, fonts, timing (already filled in)

Read both files at the start of every run.

---

## Mode detection

Read `$ARGUMENTS`:
- Contains `train-brand` → run **Mode A**
- Contains `plan` → run **Mode B** (video title = rest of argument after "plan")
- Contains `build` → run **Mode C**
- Contains `polish`, or he asks for zooms / popups / B-roll / captions on a recorded video → run **Mode D** (slug = rest of argument after "polish")
- Empty or unclear → ask: "What would you like to do? `plan [video-title]` to analyze a script, `build` to generate Remotion code, `polish [slug]` to add zooms, popups and captions to a cut video, or `train-brand` to update your brand."

---

## Mode A — Train Brand

Goal: update brand values in `YouTube/brand-guidelines.md` + `YouTube/remotion/src/brand.ts`.

1. Tell the user what's currently set, ask what they want to change.
2. Update both files with confirmed values.
3. Re-render any recent compositions to verify the brand looks correct.

---

## Mode B — Plan (Script → Animation Brief)

Goal: analyze a script → produce `YouTube/scripts/{video-title}/edit-plan.md`.

### Steps

1. Read `YouTube/editor-thinking.md` and `YouTube/brand-guidelines.md`.

2. Get the script from the conversation or ask for it.

3. Run all 6 passes from `YouTube/editor-thinking.md`:
   - Pass 1: Hook scan — first bold claim, number, or promise
   - Pass 2: Stat/number scan — dollar amounts, percentages, metrics
   - Pass 3: Process scan — steps, sequences, before/after
   - Pass 4: Quote scan — key thesis statement
   - Pass 5: List scan — 3–5 parallel items
   - Pass 6: B-roll cue scan — "imagine", "picture this", physical references
   - Final filter: max 1 graphic per 90 seconds of script

4. For each animation, write a scene entry:

```
### Scene [N] — [Animation Type]
**Timestamp cue:** "[exact words from script]"
**Zone:** Hook | Body | Outro
**Animation type:** [component name]
**Duration:** [X] seconds ([X*30] frames)
**Props:**
  - overline: "[SMALL CAPS LABEL]"
  - [all props with exact values, including *emphasis* markers for Caveat words]
**Brand note:** [typography and color notes]
```

5. Save to `YouTube/scripts/{video-title}/edit-plan.md`. Show to user and ask for approval before building.

---

## Mode C — Build (Plan → Remotion Code → Rendered Files)

Goal: generate compositions, render WebM files, deliver download-ready outputs.

### Step 1 — Verify Remotion project

Check `YouTube/remotion/package.json` exists. If not, scaffold:
```powershell
cd "YouTube/remotion"; npx create-video@latest . --yes --blank; npm install
```

### Step 2 — Read plan

Read `YouTube/scripts/{video-title}/edit-plan.md`.

### Step 3 — Generate per-scene composition files

For each scene, create `YouTube/remotion/src/compositions/{video-title}/Scene{N}_{ComponentName}.tsx`.
Each file imports the matching component and passes exact props from the plan.

### Step 4 — Register in Root.tsx

Add each scene as a `<Composition>` in `YouTube/remotion/src/Root.tsx`.

**CRITICAL RULES for Root.tsx (learned from testing):**
- Composition `id` must use only `a-z A-Z 0-9 -` — NO underscores
- Use hyphens: `VideoTitle-Scene1-StatCallout` ✓ `VideoTitle_Scene1_StatCallout` ✗
- Set `width={1920} height={1080} fps={30}`
- Set `durationInFrames` based on component type — see durations table below

**Composition duration by type:**
| Component | Minimum frames | Notes |
|---|---|---|
| StatCallout | 120 (4s) | count-up takes 50 frames, hold the rest |
| RoadmapCard (3 steps) | 180 (6s) | 30-frame stagger × 3 cards = 90 frames + hold |
| TwoPanel | 120 (4s) | 3 elements enter sequentially |
| StackedCards (3 rows) | 150 (5s) | 30-frame stagger × 3 rows |
| ChatThread (4 bubbles) | 150 (5s) | 18 frames per bubble |
| BarChart | 120 (4s) | bars grow over 30 frames |
| QuoteOverlay | 150 (5s) | word-by-word, 3 frames per word |
| NodeDiagram | 150 (5s) | nodes + dot travel animation |

### Step 5 — Render to WebM

```powershell
cd "YouTube/remotion"
npx remotion render src/index.ts {composition-id} --output out/{filename}.webm --codec=vp8
```

Render each scene separately so they can be placed independently in the video editor.

### Step 6 — Deliver

Tell user the file paths. Explain: "Drop these WebM files onto a new track above your footage in your editor. Transparent background — no green screen needed."

---

## Mode D — Polish (cut video → zooms, popups, captions)

Goal: take the clean cut from `/video-edit` (`YouTube/edits/<slug>/edit/final.mp4`) and add smooth zooms, pop-up B-roll (text, logos, images, full-frame graphics) and captions → `edit/final_polished.mp4`. Audio is copied through untouched.

Run every command with the venv interpreter:
`YouTube/video-use/.venv/Scripts/python.exe .claude/skills/video-edit/scripts/run_pipeline.py <cmd> YouTube/edits/<slug>`

### Step 1 — Get the cut timeline
```
run_pipeline.py timeline YouTube/edits/<slug>
```
Writes `edit/timeline.md` (the cut as timestamped phrases) and `edit/timeline_words.json` (every word). **All polish times are on this timeline — the cut video — never the raw recording.**

### Step 2 — Turn the user's cues into times
The user gives cues in plain words: "zoom in when I say X", "show the Claude logo when I mention Claude Code", "captions on the intro". Find the phrase in `timeline.md`, then the exact word in `timeline_words.json`.
- A popup lands **on the word it illustrates** (`at` = that word's `start`), not before it.
- A zoom starts at the first word of the sentence and ends at its last word, so the move never straddles a cut.
- If a cue is ambiguous (the word is said twice, or he didn't say where), ask. Don't guess.

If he only says "polish the intro", propose this default for the first ~30 s and nothing after it:
- a `drift` zoom on the hook sentence and on the one or two lines he leans on hardest — **not** on every sentence
- one popup per named thing (product, tool, number), max one on screen at a time

### Step 3 — Propose the plan, then STOP
Post the plan as a short list (time · what · the words it sits on) and wait for his yes. Don't write `polish.json` before approval.

### Step 4 — Write `edit/polish.json`

```json
{
  "zooms": [
    { "start": 1.05, "end": 4.59, "to": 1.10, "style": "drift" },
    { "start": 5.84, "end": 12.06, "to": 1.12, "style": "hold", "in": 1.2, "out": 0.9 }
  ],
  "popups": [
    { "type": "lower-third", "at": 0.2, "duration": 3, "title": "Shubham Gunjal", "subtitle": "AriseTransform" },
    { "type": "text", "at": 3.4, "duration": 2.5, "text": "14 days to *MVP*", "position": "top-right" },
    { "type": "logo", "at": 6.0, "duration": 2.5, "src": "claude.png", "label": "Claude Code" },
    { "type": "scene", "at": 9.0, "duration": 4, "component": "StatCallout",
      "props": { "overline": "REAL RESULT", "value": "8,600+", "bottomLine": "real users · built in *14 days*" } }
  ],
  "captions": [ { "start": 0, "end": 30 } ],
  "captionFixes": { "cloud code": "Claude Code" },
  "captionEmphasis": ["never"]
}
```

**Zooms** — `to` is the target scale. Subtle is `1.06–1.12`; above `1.15` it stops reading as subtle.
| Field | Default | Meaning |
|---|---|---|
| `style` | `drift` | `drift` = moves slowly the whole time (the smooth push-in while talking). `hold` = ease in, sit, ease out. |
| `in` | `1.2` | seconds to reach `to` (`hold` only) |
| `out` | `0.9` | seconds to ease back to normal before `end`. `0` = snap back, only use it exactly on a cut. |
| `from` | `1.0` | start scale. `"from": 1.12, "to": 1.0` is a slow **zoom-out**. |
| `focus` | `[0.5, 0.42]` | the point the zoom moves toward (0–1, x then y). Set it on his face if he's off-centre. |

Zooms can't overlap. Leave a gap between two zooms or the second one starts while the first is still easing out.

**Popups** — `at` + `duration` (default 3 s). `position`: `top-left`, `top`, `top-right`, `left`, `center`, `right`, `bottom-left`, `bottom`, `bottom-right`. `enter`: `pop` (default), `slide`, `fade`.
| `type` | Fields | Notes |
|---|---|---|
| `text` | `text`, `size` (`sm`/`md`/`lg`/`xl`), `look` (`card`/`bare`/`pill`) | `*word*` → Caveat orange. `card` = white brand card, `bare` = white text straight on footage, `pill` = orange pill. |
| `logo` / `image` | `src`, `width` (px, default 320), `label?`, `look` (`card`/`bare`) | `card` puts it on a white card so any logo reads on any footage. |
| `lower-third` | `title`, `subtitle?` | Name bar, slides in bottom-left. |
| `scene` | `component`, `props` | Full-frame cutaway using any component from the specs below (StatCallout, RoadmapCard, …). Covers the footage, audio keeps playing. |
| `clip` | `src` | Full-frame video cutaway (screen recording, stock B-roll). Muted. |

Assets (`src`) are looked up in `YouTube/edits/<slug>/assets/` first, then the shared `YouTube/assets/`. Put logos he reuses across videos in the shared folder. **If a logo he asks for isn't in either folder, ask him for the file — don't draw a stand-in.**

Every anchored popup also takes `offset` (`[dx, dy]` px at 1920 wide, nudges it from its anchor) and `rotate` (degrees). Use them to stack several labels down one side: same `position`, increasing `dy`. A newline in `text` breaks the line.

Glass `scene` components — frosted glass over the live footage (blurred and dimmed, never a solid background). **Use these for polish, not the cream-background components above.**
| Component | Props | What it does |
|---|---|---|
| `ClaudeRank` | `logo` (asset file name), `title`, `overline`, `items[]`, `itemTimes[]?`, `finale? {at, title}` | Logo spins in with pulse rings; a numbered two-column list waits as ghosts and each item lights up at its `itemTimes` second (set these to the spoken words). `finale` swaps the title and pulses the logo on the punchline. |
| `FormatCards` | `title`, `overline`, `cards[] {label, shape: vertical/wide, at?}` | One screen-shaped glass frame per video format (9:16 or 16:9), each popping in at its `at` second. |
| `GlassTitle` | `text`, `overline?` | One big line on a glass panel, words landing one by one. |
| `OpusEffort` | `logo`, `model`, `levels[]`, `levelTimes[]?`, `title?`, `overline?` | Logo + model wordmark, then a signal-bar meter fills one bar per level (lowest first) on its spoken word; last bar pulses. |
| `PromptFanout` | `prompt`, `levels[]`, `levelTimes[]?`, `image?` (asset), `title?`, `overline?`, `typeSeconds?` | A prompt types into a chat bar, sends, and fans out along drawn lines into one blurred "?" result window per level. |
| `HookTitle` | `title`, `overline?`, `sub?`, `chipLabel?`, `countdown? {days,hours,minutes,seconds}` | Course/video title lands word by word on glass; optional live countdown ticks under it. |
| `ChapterCard` | `number`, `title`, `kicker?`, `sub?` | Big orange module number punches in, title slides beside it. Marks each new module / "up next". |
| `GlassStat` | `value` ("8,613", "$5,000+"), `overline?`, `topLine?`, `label?`, `chips[] {label, at}` | Hero number counts up (prefix/suffix kept), proof chips light on their words. |
| `GlassList` | `items[] {label, sub?, icon?}`, `itemTimes[]`, `title?`, `overline?`, `layout` row/column, `marker` number/check/icon, `arrows?`, `finale? {at,title}` | General list / process: ghost items light on spoken words; `arrows` for a flow. |
| `MysteryReveal` | `title?`, `stamp?`, `stampAt?`, `chipLabel?`, `levels[]?`, `chipAt?`, `keepClear? [x,y,w,h]` | Suspense overlay for a screen you've **already blurred in ffmpeg**: lock drops shut, stamp slams in, chip shuffles through `levels` and lands on "???". No blur of its own; `keepClear` leaves the face-cam box undimmed. |

Scene times (`itemTimes`, `at`, `finale.at`) are seconds from the start of the scene, not the video. `logo` / `image` popups also take `look: "glass"`.

**Player frame** — top-level `"player"` list. The footage shrinks into a YouTube-style player with a chaptered timeline that scrubs from 0 to the full length, then expands back to full frame.
```json
"player": [ { "start": 2.2, "end": 5.0, "length": "25:00", "chapters": 8, "in": 0.6, "out": 0.5 } ]
```
`length` is the video length shown on the timeline. Bottom captions fit under the timeline, so they can stay on. A zoom can end as the player starts — give that zoom an `out` so it eases back while the frame shrinks.

**Captions** — one entry per stretch that should have them. Optional per range: `maxWords` (default 4), `position` (`bottom`/`center`/`top`), `uppercase` (default false), `highlight` (default true — the word being spoken turns orange).
- `captionFixes` corrects mis-heard words before they're shown. Read the caption stretch in `timeline.md` and fix every product name Whisper got wrong ("cloud code" → "Claude Code").
- `captionEmphasis` words render in Caveat orange. One or two per video.
- Don't put a `bottom` popup or `lower-third` where captions are on — they collide. Move the popup up or the captions to `center`.

### Step 5 — Check frames, then render
```
run_pipeline.py polish YouTube/edits/<slug> --still 6.5     # one frame -> edit/verify/
run_pipeline.py polish YouTube/edits/<slug> --preview       # half-res, polished stretch only
run_pipeline.py polish YouTube/edits/<slug>                 # final -> edit/final_polished.mp4
```
Pull a `--still` at every popup and one mid-zoom and **look at them** before the final render: nothing overlapping, text not cut off, caption spelling right, his face not cropped by the zoom.

Only the stretch up to the last effect goes through Remotion (about 3× slower than real time); the rest of the video passes straight through. So an intro-only polish on a 20-minute video takes a couple of minutes. `--full` forces the whole video through.

The render checks itself: `[OK]` on duration, and a frame-sync check that re-renders once if Remotion handed back the wrong frames. If it prints `[WARN] frames are out of sync`, don't deliver — close heavy apps and run it again.

### Step 6 — Deliver
Hand over `edit/final_polished.mp4` with SendUserFile and open the folder in Explorer. Changes after that are edits to `polish.json` + one re-render — the cut itself isn't touched.

---

## Component Specs (production-tested)

All components live in `YouTube/remotion/src/components/`. They import from `../brand`.
All use `AbsoluteFill` + a `1280×720` design wrapper scaled to the actual canvas.

### Shared rules across ALL components
- Background: `brand.backgroundGradient` via `AbsoluteFill` — always full frame
- Entry animation: scale `0.93→1` + translateY `18→0` over `brand.enterFrames` (11 frames)
- Every component has an Overline label at top and a BottomDash at bottom
- Import `{ Background, Overline, IconBadge }` from `./shared`

### StatCallout
**Props:** `overline`, `topLine?`, `value`, `bottomLine?`, `strikethrough?`
- Value = the hero — 148px, brand.primary, Inter 900
- topLine/bottomLine support `*word*` → Caveat italic orange, `~word~` → Caveat italic orange + strikethrough
- Number counts up from 0 over 50 frames
- Strikethrough draws as animated line after count-up (frame 55→85)

### RoadmapCard
**Props:** `overline`, `steps[]`, `activeStep`
- **Entire layout wrapped in an orange border frame** — `3px solid brand.primary`, `border-radius: 28px`
- Cards stagger: 30 frames apart (Card 1 at frame 8, Card 2 at 38, Card 3 at 68)
- Per card: badge spring-bounces in first → title slides up 8 frames later → subtitle fades 12 frames later
- Active card: orange badge gradient, orange border + glow ring, **subtitle in Caveat italic orange**
- Ghost cards (future steps): **38% opacity**, gray muted badge, gray text, no border
- Arrows between cards appear 18 frames after source card enters

### StackedCards
**Props:** `overline`, `rows[]` (each: `icon`, `label`, `value`, `featured?`)
- Rows slide up from bottom with 30-frame stagger
- Featured/active row: full orange badge, larger padding, orange border ring
- Value column: green `#22C55E` for regular payments, orange for featured

### TwoPanel
**Props:** `overline`, `leftLabel`, `leftContent`, `rightLabel`, `rightContent`, `caption?`, `connector?`
- Left enters frame 0, connector frame 15, right frame 20, caption frame 30
- Right card always has orange border (the winner/after)

### BarChart
**Props:** `overline`, `bars[]` (each: `label`, `value`, `highlight?`)
- Left bars: muted gray, 6-frame stagger
- Highlight bar (last): orange gradient, spring overshoot
- Labels fade in after bar fills

### ChatThread
**Props:** `overline`, `messages[]` (each: `text`, `time`, `seen?`), `caption?`
- Each bubble appears 18 frames apart
- Bubbles: orange fill, right-aligned
- Caption: pill card at bottom, appears after last bubble

### NodeDiagram
**Props:** `nodes[]`, `scriptLine?`, `headline`
- 3 nodes in triangle, orange glow pulse
- White dot travels along one edge continuously
- scriptLine in Caveat italic, headline in Inter 900

### QuoteOverlay
**Props:** `overline`, `quote` (use `*word*` for Caveat orange), `speaker?`
- Words fade in 3 frames apart left to right
- Script words render larger (1.18×) in Caveat italic orange

### HookSubtitle
**Props:** `line`, `emphasisWords[]`
- Lower-third position — goes ON TOP of footage (transparent background)
- Regular words: Inter 36px white with text shadow
- Emphasis words: Caveat italic 42px orange with glow

### BrollOverlay / OutroCTA / FloatingText
- Standard components, see component files for props

---

## Learned Lessons (updated from testing)

These are non-negotiable rules learned from real renders. Apply before generating any code.

### Technical rules
1. **Composition IDs — no underscores ever.** Only `a-z A-Z 0-9 -`. Bad: `MyVideo_Scene1` Good: `MyVideo-Scene1`
2. **Always use `AbsoluteFill` from remotion** as the outermost container on every component. `width: "100%"` alone does not reliably fill the frame.
3. **Background gradient must end at `#FDF5EE 100%`** to prevent transparent gaps in WebM. Gradient that stops at 55% leaves transparent right half.
4. **Scale content for 1920×1080 using a design wrapper.** Design at 1280×720, then `transform: scale(1920/1280)`. Never use small px values (28px, 36px) without this wrapper — they render invisibly small at 1920×1080.
5. **RoadmapCard durationInFrames must be ≥ 180** when using 3 steps with 30-frame stagger. Setting 120 frames cuts off the animation before all cards enter.
6. **Scaffold Remotion with `--blank` flag:** `npx create-video@latest remotion --yes --blank`

### Design rules
7. **RoadmapCard always gets an orange border frame** wrapping the 3-card layout — `3px solid #F97316, border-radius: 28px`. This is a core brand element from the reference examples.
8. **Active card subtitle = Caveat italic orange.** If the subtitle on the active step is in plain Inter, the font contrast is lost.
9. **Ghost cards at 38% opacity**, not 40% or higher. Higher values make them look too present.
10. **Card stagger must be 30 frames between each card** in RoadmapCard. 5 frames makes all cards enter simultaneously — looks broken.
11. **StatCallout: always use `*emphasis*` markers** in topLine/bottomLine to activate Caveat italic orange on key words. Plain Inter for every word = looks static and flat.
12. **Background gradient: centered glow, not corner.** `radial-gradient(ellipse 70% 65% at 62% 48%, ...)` — glow sits behind the content, not in the top-right corner. Top-right glow looks misplaced when content is centered.
13. **Badge enters via spring, not linear interpolate.** `spring({ damping: 10, stiffness: 180 })` gives the bounce that makes the badge feel premium.
14. **Do not hardcode dark backgrounds.** Brand is warm cream (#FDF5EE) + white cards. Dark backgrounds are completely wrong for this brand.

### Render rules
15. **Always put a solid `brand.background` layer under the glow gradient.** The glow is semi-transparent and VP8 WebM has no alpha, so it gets flattened onto black and the centre of the frame turns muddy brown. PNG stills hide this because they composite onto transparency. `shared.tsx` Background now does `${gradient}, ${brand.background}`.
16. **QA the actual WebM, not just stills.** Extract a frame with frame-accurate decode: `npx remotion ffmpeg -i out/X.webm -ss 3 -frames:v 1 check.png`. Put `-ss` after `-i`, because fast-seek on VP8 returns garbage frames.
17. **Render with `--video-bitrate=12M`** (`--crf` has no visible effect on VP8 here). The default came out around 350 kbps at 1080p, which gave smeared card edges and blocky text. At 12M it's about 2 MB per 5s scene and crisp.
18. **Deliver MP4 (H.264, yuv420p), not WebM.** the user edits in Premiere Pro, which won't import these WebMs. Render `--codec=h264 --video-bitrate=12M`. Remotion outputs full-range `yuvj420p` and ignores `--pixel-format`, so convert afterwards: `npx remotion ffmpeg -i X.mp4 -vf "scale=in_range=full:out_range=tv,format=yuv420p" -c:v libx264 -profile:v high -b:v 12M -movflags +faststart -c:a copy X.fixed.mp4`. Don't point him at VS Code file links to "download". Open the folder in Explorer and send the files with SendUserFile.

### Polish rules
19. **Polish times are on the cut video, never the raw recording.** Always take them from `edit/timeline.md` (`run_pipeline.py timeline`). It uses the real rendered segment lengths; adding up EDL ranges by hand drifts a few ms per cut and captions end up seconds late on a long video.
20. **Remotion can return the wrong source frame under load**, which plays as a stutter (seen once: skip two frames, hold three). `polish` checks the untouched half-second after the last effect against the source and re-renders once. Never bypass a `[WARN] frames are out of sync`.
21. **Caveat needs room after it.** Italic Caveat overhangs its box and eats the following space ("editingpipeline"). Emphasis spans carry `paddingRight: 0.14em`.

22. **No pop-out text labels around him.** the user rejected text cards/pills scattered left and right of the frame (2026-10-11). When he lists things, show them in a full-screen motion graphic instead.
23. **No captions unless he asks for them.** He had the whole caption track removed. Leave `"captions": []` by default — the "polish the intro" default above no longer includes captions.
24. **Glass, not white.** Over footage, graphics sit on transparent frosted glass (`GlassStage` / `glassCard` in `components/glass.tsx`, `look: "glass"` on logo popups) — not white cards and not the cream full-frame background. The cream components are for standalone scenes delivered as separate files.
25. **"No frame found at position" from Remotion is transient.** It failed once mid-render on a source that had rendered fine minutes earlier; running the same command again succeeded. Re-run before changing anything — and note that a failed polish leaves the previous `final_polished.mp4` in place, so check the file's timestamp before delivering.

---

## Notes

- Always read Learned Lessons before writing any code.
- The `build` mode generates per-video compositions — it does NOT change the reusable components unless a bug is found.
- Brand values only come from `YouTube/brand-guidelines.md` — never hardcode hex values in compositions.
- Render each scene as a separate WebM file so the editor can place them independently at the right timestamps.
- When user points out a quality issue: fix the component, add the lesson, re-render.
