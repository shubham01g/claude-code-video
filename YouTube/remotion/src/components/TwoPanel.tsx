import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { brand } from "../brand";
import { Background, Overline } from "./shared";

interface Props {
  overline?: string;
  leftLabel: string;
  leftContent: string;
  rightLabel: string;
  rightContent: string;
  caption?: string;
  connector?: "arrow" | "vs";
}

export const TwoPanel: React.FC<Props> = ({
  overline = "THE DIFFERENCE",
  leftLabel,
  leftContent,
  rightLabel,
  rightContent,
  caption,
  connector = "arrow",
}) => {
  const frame = useCurrentFrame();

  const leftOpacity = interpolate(frame, [0, brand.enterFrames], [0, 1], { extrapolateRight: "clamp" });
  const leftScale = interpolate(frame, [0, brand.enterFrames], [0.95, 1], { extrapolateRight: "clamp" });
  const leftY = interpolate(frame, [0, brand.enterFrames], [12, 0], { extrapolateRight: "clamp" });

  const connectorOpacity = interpolate(frame, [15, 15 + brand.enterFrames], [0, 1], { extrapolateRight: "clamp" });

  const rightOpacity = interpolate(frame, [20, 20 + brand.enterFrames], [0, 1], { extrapolateRight: "clamp" });
  const rightScale = interpolate(frame, [20, 20 + brand.enterFrames], [0.95, 1], { extrapolateRight: "clamp" });
  const rightY = interpolate(frame, [20, 20 + brand.enterFrames], [12, 0], { extrapolateRight: "clamp" });

  const captionOpacity = interpolate(frame, [30, 30 + brand.enterFrames], [0, 1], { extrapolateRight: "clamp" });

  const cardBase: React.CSSProperties = {
    background: brand.cardBg,
    borderRadius: brand.borderRadius,
    boxShadow: brand.cardShadow,
    padding: "32px 28px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  return (
    <Background>
      <Overline label={overline} />

      <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%" }}>
        {/* Left card */}
        <div
          style={{
            ...cardBase,
            border: brand.cardBorder,
            opacity: leftOpacity,
            transform: `scale(${leftScale}) translateY(${leftY}px)`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: brand.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {leftLabel}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: brand.textPrimary, fontFamily: brand.fontBold, lineHeight: 1.3 }}>
            {leftContent}
          </div>
        </div>

        {/* Connector */}
        <div
          style={{
            opacity: connectorOpacity,
            fontSize: connector === "vs" ? 22 : 28,
            fontWeight: 700,
            color: brand.textMuted,
            flexShrink: 0,
          }}
        >
          {connector === "vs" ? "vs" : "→"}
        </div>

        {/* Right card — highlighted */}
        <div
          style={{
            ...cardBase,
            border: brand.activeBorder,
            boxShadow: `${brand.cardShadow}, ${brand.activeGlow}`,
            opacity: rightOpacity,
            transform: `scale(${rightScale}) translateY(${rightY}px)`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: brand.primary, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {rightLabel}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: brand.textPrimary, fontFamily: brand.fontBold, lineHeight: 1.3 }}>
            {rightContent}
          </div>
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <div
          style={{
            marginTop: 24,
            opacity: captionOpacity,
            fontSize: 16,
            fontWeight: 600,
            color: brand.textPrimary,
            textAlign: "center",
          }}
        >
          {caption}
        </div>
      )}
    </Background>
  );
};
