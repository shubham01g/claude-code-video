# AriseTransform YouTube Brand Guidelines

---

## Colors

```
PRIMARY_COLOR=#F97316       # vibrant orange — main accent, CTA buttons, highlighted numbers, active card borders
SECONDARY_COLOR=#E8622A     # deeper orange — hover states, bar chart gradient bottom, icon badge gradient end
BACKGROUND_COLOR=#FDF5EE    # warm cream — main video background (NOT dark; warm off-white with orange radial glow top-right)
CARD_BG_COLOR=#FFFFFF       # pure white — all floating cards and panels
TEXT_PRIMARY=#1C1C1E        # near-black charcoal — body text, card titles, main labels
TEXT_MUTED=#9CA3AF          # warm gray — subtitles under titles, "seen X ago" timestamps, axis labels
ACCENT_GLOW=rgba(249,115,22,0.20)  # orange at 20% — soft glow behind active cards and glowing nodes
```

**Background glow:** The background is NOT flat cream. It has a soft radial orange glow in the top-right corner:
`background: radial-gradient(ellipse at 85% 10%, rgba(249,115,22,0.18) 0%, #FDF5EE 55%)`

## Typography

```
FONT_SANS=Inter             # body text, card titles, labels, payment rows, axis labels
FONT_BOLD=Inter             # heavy stat numbers ($2,000 / $5,000), card step numbers
FONT_SCRIPT=Caveat          # emphasis/key words only: "never", "talent", "roadmap" — renders in italic cursive over body text
FONT_HEADING=Poppins        # section titles inside motion graphic frames (optional — Inter Bold is fine too)
```

**Typography usage rules (from examples):**
- Section overline labels: FONT_SANS, small-caps, wide letter-spacing (~0.15em), orange, uppercase
  e.g. `REAL EDITORS · REAL MONEY` — dot separators between label segments
- Card titles: FONT_BOLD, 18–22px, TEXT_PRIMARY
- Card subtitles: FONT_SANS, 13–14px, TEXT_MUTED
- Big stat numbers: FONT_BOLD, 60–80px, PRIMARY_COLOR — these are the hero of the frame
- Script emphasis: FONT_SCRIPT, same size as surrounding body text, PRIMARY_COLOR, italic
- Body quote text: FONT_SANS, 28–36px, TEXT_PRIMARY — mixed with FONT_SCRIPT for emphasis words

## Card / Layout

```
BORDER_RADIUS=20px          # generously rounded — applies to all cards, chat bubbles, icon badges, bar tops
CARD_BORDER=1px solid rgba(0,0,0,0.05)      # almost invisible — cards float off background via shadow, not border
CARD_SHADOW=0 8px 24px rgba(0,0,0,0.08)    # soft warm shadow — keeps cards elevated without drama
LOGO_PATH=public/logo.png
```

**Active / highlighted card:** add `border: 2px solid #F97316` + `box-shadow: 0 0 0 4px rgba(249,115,22,0.15)` — this is the orange ring seen on Step 1 in the roadmap sequence.

**Icon badges:** Rounded squares (border-radius: 16px), orange gradient fill from `#FDBA74` → `#F97316`, white icon/number inside, slight inner shadow. These appear on card icons, step numbers, avatar circles.

**Section overline bar:** A short horizontal line `─` in TEXT_MUTED is used as a progress indicator / section marker at the bottom center of each graphic frame.

## Animation Timing

```
ENTER_DURATION_MS=350       # smooth slide+fade in — not snappy, not cinematic. Cards ease in from 0.95 scale + 12px below
HOLD_DURATION_MS=2500       # how long a complete graphic stays readable before exiting
EXIT_DURATION_MS=250        # quick fade out — viewer attention stays on speaker
STAGGER_MS=150              # delay between sequential card reveals (roadmap steps, stacked rows)
```

## Channel Info

```
CHANNEL_NAME=Shubham Gunjal
CHANNEL_HANDLE=@shubhamgunjal
CTA_TEXT=Subscribe — I build in public daily
```

---

## Animation Patterns (learned from reference examples)

These are the 8 motion graphic types observed in the reference videos. Each one maps to a Remotion component.

### 1. RoadmapCard (Step Flow)
**Trigger:** Speaker mentions a process, phases, or numbered steps.
**Layout:** 3 horizontal cards with arrow connectors between them. Step numbers in orange badge top-left of each card.
**Active state:** The step being described gets white card with orange border glow + elevated shadow. Future steps are ghosted (opacity 0.4, no border).
**Animation:** Cards enter left→right, 150ms stagger. Active card scale-pops slightly (1.03×) when highlighted.
**Label above:** Overline text in PRIMARY_COLOR small-caps with dots (e.g. `YOUR ROADMAP TO $2,000 / MONTH`)

### 2. StackedCards (Notification Rows)
**Trigger:** Speaker lists items, results, payments, or a series of events.
**Layout:** 3 rows stacked vertically. Each row: orange icon badge left, bold title center-left, green/orange value right.
**Active row:** Center row is larger + has the full orange icon badge (others are smaller/muted badge).
**Animation:** Rows slide in from bottom one at a time, 150ms stagger.
**Label above:** Overline small-caps (e.g. `REAL EDITORS · REAL MONEY`)

### 3. TwoPanel (Comparison / Before→After)
**Trigger:** Speaker compares two things, contrasts a before/after, or shows cause→effect.
**Layout:** Two cards side by side with "vs" or an arrow between. Right card highlighted in orange (the winner/after).
**Animation:** Left card enters frame 0, arrow/vs appears frame 15, right card enters frame 20. Right card gets orange border.
**Caption below:** Short summary text in TEXT_PRIMARY bold, centered.

### 4. StatCallout (Hero Number)
**Trigger:** Speaker says a specific dollar amount, percentage, or metric.
**Layout:** Full-frame centered. Regular text line 1 (FONT_SANS), giant number line 2 (FONT_BOLD, PRIMARY_COLOR, 80px), body text line 3.
**Strikethrough variant:** A diagonal line draws across the number — used when debunking a myth or showing what people miss.
**Script emphasis:** Words like "never" render in FONT_SCRIPT, PRIMARY_COLOR, inline within the regular text line.
**Animation:** Number counts up from 0. Strikethrough draws as a line animation if used.

### 5. BarChart (Growth Visual)
**Trigger:** Speaker shows progression, scaling, or climbing numbers over time.
**Layout:** 4 bars on a baseline. Left bars are gray/muted (lower values), rightmost bar is full orange gradient.
**Bar fill:** `linear-gradient(to top, #F97316, #FDBA74)` — orange at bottom, lighter at top.
**Labels:** Dollar values float above each bar in TEXT_MUTED (inactive) or PRIMARY_COLOR (highlight). Axis labels below in TEXT_MUTED small.
**Animation:** Bars grow upward from baseline, left→right, 200ms stagger. Highlight bar grows last with a slight overshoot spring.
**Overline:** Small-caps above (e.g. `THE SAME SYSTEM KEEPS CLIMBING`)

### 6. ChatThread (Ghosting / Rejection sequence)
**Trigger:** Speaker talks about cold outreach, being ignored, or a common failure mode.
**Layout:** White card, chat bubbles right-aligned in orange (sender's messages), timestamps in TEXT_MUTED.
**Animation:** Bubbles appear one at a time with a short pause between each (simulates real chat). Final "no reply" timestamp fades in last.
**Caption below:** Bold pill-shaped text card with summary punchline.
**Overline:** Small-caps above (e.g. `SENT · SEEN · SILENCE`)

### 7. NodeDiagram (System / Loop visual)
**Trigger:** Speaker explains a repeatable system, loop, or interconnected process.
**Layout:** 3 orange glowing nodes (numbered circles) connected by dashed lines — triangle formation.
**Animated element:** A small white dot travels along one dashed edge, showing flow/movement.
**Text below:** Two-line text block — regular italic FONT_SCRIPT line + massive FONT_BOLD headline below it.
**Animation:** Nodes fade in with glow. Dot animates along edges continuously.

### 8. QuoteText (Full-frame emphasis)
**Trigger:** Speaker delivers a key insight or thesis statement worth reinforcing.
**Layout:** Left half: quote text large (30–36px). Right half: a motion graphic (e.g. RoadmapCard). Split-screen.
**Text format:** Mix of FONT_BOLD (regular words) + FONT_SCRIPT in PRIMARY_COLOR (emphasis words inline).
**Animation:** Text words fade in left-to-right. Graphic on right enters separately.

---

## Design System Rules (non-negotiable)

1. **Background always warm cream** with top-right orange radial glow — never flat, never dark.
2. **Cards are always white** — never dark, never transparent. They float above background.
3. **Orange is reserved for:** active/highlighted state, stat numbers, section labels, emphasis words, icon badges. Not for everything.
4. **Muted/ghost state:** inactive steps, secondary items = `opacity: 0.4` of the normal style.
5. **Small-caps section labels** above every graphic with dot separators — this is the consistent framing device.
6. **Bottom center dash:** Every frame ends with `─` (short horizontal line) in TEXT_MUTED as a visual anchor.
7. **Max 1 graphic per 90 seconds** of script — motion graphics support the speech, they don't compete with it.
8. **Script font sparingly** — 1 or 2 words per graphic maximum. Any more and it loses impact.

---

## Status

- [x] Colors filled in
- [x] Fonts chosen
- [ ] Remotion brand.ts updated (`YouTube/remotion/src/brand.ts`)
- [ ] Test render confirmed
