// Shape of edit/polish.json after run_pipeline.py has resolved it into render props.
// All times are seconds on the OUTPUT timeline (the cut video), not the raw recording.

export type Zoom = {
  start: number;
  end: number;
  to: number; // target scale, e.g. 1.1
  from: number; // scale at `start` (1 = normal framing)
  style: "hold" | "drift"; // hold = ease in, sit, ease out · drift = move the whole time
  in: number; // seconds to reach `to` (hold only)
  out: number; // seconds to ease back to 1 before `end` (0 = snap back on a cut)
  focus: [number, number]; // 0–1 point the zoom moves toward
};

// Footage shrinks into a YouTube-style player with a scrubbing timeline, then expands back.
export type PlayerFrame = {
  start: number;
  end: number;
  in: number; // seconds to shrink into the player
  out: number; // seconds to expand back to full frame before `end`
  length: number; // video length shown on the timeline, in seconds
  chapters: number; // segments on the timeline bar
};

export type Anchor =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

type PopupBase = {
  at: number;
  duration: number;
  position: Anchor;
  enter: "pop" | "slide" | "fade";
  offset: [number, number]; // px nudge from the anchor at 1920 design width
  rotate: number; // degrees
};

export type Popup =
  | (PopupBase & {
      type: "text";
      text: string; // *word* → Caveat orange emphasis
      size: "sm" | "md" | "lg" | "xl";
      look: "card" | "bare" | "pill";
    })
  | (PopupBase & {
      type: "image";
      src: string; // path inside the staged public dir
      width: number; // px at 1920 design width
      look: "card" | "bare" | "glass";
      label?: string;
    })
  | (PopupBase & { type: "lower-third"; title: string; subtitle?: string })
  | (PopupBase & { type: "scene"; component: string; props: Record<string, unknown> })
  | (PopupBase & { type: "clip"; src: string });

export type CaptionRange = {
  start: number;
  end: number;
  maxWords: number;
  position: "bottom" | "center" | "top";
  uppercase: boolean;
  highlight: boolean; // colour the word being spoken
};

export type Word = { text: string; start: number; end: number };

export type PolishProps = {
  video: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  zooms: Zoom[];
  players: PlayerFrame[];
  popups: Popup[];
  captions: CaptionRange[];
  words: Word[];
  emphasis: string[]; // caption words rendered in Caveat orange
};
