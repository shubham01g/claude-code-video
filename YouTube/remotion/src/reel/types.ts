import type { Word, Zoom } from "../polish/types";

// Shape of edit/reel.json after run_pipeline.py has resolved it into render props.
// All times are seconds on the cut video (edit/final.mp4), never the raw recording.

// v2 layouts (learned from the reference reels, Instagram/reference-analysis/style-bible.md):
//   split — graphic on top, medium face crop below, caption on the seam
//   full  — graphic fills the frame, face hidden
//   face  — no graphic, hard punch-in on the face (also what v2 shows in any gap between scenes)
export type ReelLayout = "split" | "full" | "face";
export type ReelTheme = "glass" | "cream" | "dark";

export type ReelScene = {
  at: number;
  duration: number;
  component: string | null; // a key of REEL_SCENES; null only for layout "face"
  props: Record<string, unknown>; // times inside props are seconds from the start of the scene
  layout: ReelLayout;
  theme: ReelTheme; // background + text colours behind the graphic
};

export type CaptionStyle = "pill" | "bold" | "clean" | "editorial";

export type ReelCaptions = {
  style: CaptionStyle; // pill = v1 look
  maxWords: number; // words per caption page
  maxChars: number; // a page never gets longer than this
  uppercase: boolean;
  keywords: string[]; // lower-case words shown in the accent colour
  accent: string[]; // lower-case words shown in the script face (Caveat / serif), on their own line
};

export type ReelFaceCrop = {
  x: number; // 0–1 point of the source width centred in the frame/panel — set it on the nose
  y: number; // 0 = source top-aligned, 1 = bottom-aligned (only matters when scale > 1)
  scale: number; // 1 = source height fills the panel height
};

export type ReelProps = {
  video: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  sourceAspect: number; // source width / height
  version: 1 | 2;
  split: number; // share of the height the graphics panel takes in the split layout
  face: ReelFaceCrop; // the split layout's medium crop
  faceFull: ReelFaceCrop; // the face layout's punch-in
  zooms: Zoom[]; // applied to the face in every layout
  scenes: ReelScene[];
  captions: ReelCaptions | null; // null = no captions
  words: Word[];
};
