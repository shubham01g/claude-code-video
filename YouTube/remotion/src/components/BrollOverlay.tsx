import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { brand } from "../brand";

interface Props {
  text: string;
  position?: "top" | "center" | "bottom";
}

const POSITION_MAP = {
  top: "10%",
  center: "50%",
  bottom: "80%",
};

export const BrollOverlay: React.FC<Props> = ({ text, position = "bottom" }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, brand.enterFrames], [0, 1], { extrapolateRight: "clamp" });
  const exitStart = brand.enterFrames + brand.holdFrames;
  const finalOpacity = frame > exitStart
    ? interpolate(frame, [exitStart, exitStart + brand.exitFrames], [1, 0], { extrapolateRight: "clamp" })
    : opacity;

  const isCenter = position === "center";

  return (
    <div
      style={{
        position: "absolute",
        top: POSITION_MAP[position],
        left: 0,
        right: 0,
        transform: isCenter ? "translateY(-50%)" : undefined,
        display: "flex",
        justifyContent: "center",
        padding: "0 80px",
        opacity: finalOpacity,
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(8px)",
          border: `1px solid rgba(255,255,255,0.12)`,
          borderRadius: brand.borderRadius,
          padding: "14px 28px",
          fontSize: 28,
          fontWeight: 600,
          color: brand.textPrimary,
          fontFamily: brand.fontSans,
          textAlign: "center",
          maxWidth: 700,
        }}
      >
        {text}
      </div>
    </div>
  );
};
