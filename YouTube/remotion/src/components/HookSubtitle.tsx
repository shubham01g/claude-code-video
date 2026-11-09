import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { brand } from "../brand";

interface Props {
  line: string;
  // Words to render in FONT_SCRIPT + orange + glow. Match exact words from line.
  emphasisWords: string[];
}

export const HookSubtitle: React.FC<Props> = ({ line, emphasisWords }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, brand.enterFrames], [0, 1], { extrapolateRight: "clamp" });
  const exitStart = brand.enterFrames + brand.holdFrames;
  const finalOpacity =
    frame > exitStart
      ? interpolate(frame, [exitStart, exitStart + brand.exitFrames], [1, 0], { extrapolateRight: "clamp" })
      : opacity;

  const words = line.split(" ");

  return (
    <div
      style={{
        position: "absolute",
        bottom: "10%",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        padding: "0 100px",
        opacity: finalOpacity,
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 900,
          lineHeight: 1.5,
        }}
      >
        {words.map((word, i) => {
          const clean = word.toLowerCase().replace(/[^a-z]/g, "");
          const isEmphasis = emphasisWords.some(
            (e) => clean === e.toLowerCase().replace(/[^a-z]/g, "")
          );
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.3em",
                fontFamily: isEmphasis ? brand.fontScript : brand.fontSans,
                fontStyle: isEmphasis ? "italic" : "normal",
                fontSize: isEmphasis ? 42 : 36,
                fontWeight: isEmphasis ? 700 : 600,
                color: isEmphasis ? brand.primary : "#FFFFFF",
                textShadow: isEmphasis
                  ? `0 0 20px ${brand.accentGlow}, 0 2px 12px rgba(0,0,0,0.7)`
                  : "0 2px 12px rgba(0,0,0,0.7)",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
