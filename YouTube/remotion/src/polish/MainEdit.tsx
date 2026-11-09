import React from "react";
import { AbsoluteFill } from "remotion";
import { Captions } from "./Captions";
import { Popups } from "./Popups";
import { ZoomLayer } from "./ZoomLayer";
import type { PolishProps } from "./types";

// Polish pass over a finished cut: footage (with zooms) → popups → captions on top.
// Props come from run_pipeline.py polish, which builds them from edit/polish.json.
export const MainEdit: React.FC<PolishProps> = ({ video, zooms, players, popups, captions, words, emphasis }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    {video ? <ZoomLayer video={video} zooms={zooms} players={players ?? []} /> : null}
    <Popups popups={popups} />
    <Captions ranges={captions} words={words} emphasis={emphasis} />
  </AbsoluteFill>
);

export const mainEditDefaults: PolishProps = {
  video: "",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 150,
  zooms: [],
  players: [],
  popups: [],
  captions: [],
  words: [],
  emphasis: [],
};
