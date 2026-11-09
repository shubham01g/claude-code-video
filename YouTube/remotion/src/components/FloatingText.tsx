import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { brand } from "../brand";

interface Props {
  text: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = { sm: 64, md: 96, lg: 140 };

export const FloatingText: React.FC<Props> = ({ text, size = "lg" }) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, brand.enterFrames], [0.8, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, brand.enterFrames], [0, 1], { extrapolateRight: "clamp" });

  // Subtle glow pulse after entry
  const glowIntensity = interpolate(
    (frame - brand.enterFrames) % 60,
    [0, 30, 60],
    [0.35, 0.6, 0.35],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: brand.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: brand.fontBold,
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          fontSize: SIZE_MAP[size],
          fontWeight: 900,
          color: brand.primary,
          textAlign: "center",
          textShadow: `0 0 80px rgba(255, 107, 0, ${glowIntensity})`,
          letterSpacing: "-1px",
          padding: "0 80px",
          lineHeight: 1.1,
        }}
      >
        {text}
      </div>
    </div>
  );
};
