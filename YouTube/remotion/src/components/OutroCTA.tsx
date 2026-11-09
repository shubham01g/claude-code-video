import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { brand } from "../brand";

interface Props {
  ctaText: string;
  channelHandle: string;
  nextVideoTitle?: string;
}

export const OutroCTA: React.FC<Props> = ({ ctaText, channelHandle, nextVideoTitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bounce = spring({ frame, fps, config: { damping: 12, stiffness: 120 }, durationInFrames: 30 });
  const nextOpacity = interpolate(frame, [20, 20 + brand.enterFrames], [0, 1], { extrapolateRight: "clamp" });
  const nextY = interpolate(frame, [20, 20 + brand.enterFrames], [30, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: brand.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        fontFamily: brand.fontSans,
        padding: "60px 80px",
      }}
    >
      {/* Subscribe card */}
      <div
        style={{
          transform: `scale(${bounce})`,
          background: brand.primary,
          borderRadius: brand.borderRadius,
          padding: "24px 48px",
          textAlign: "center",
          boxShadow: `0 0 48px ${brand.accentGlow}`,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {channelHandle}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontFamily: brand.fontHeading }}>
          {ctaText}
        </div>
      </div>

      {/* Next video */}
      {nextVideoTitle && (
        <div
          style={{
            opacity: nextOpacity,
            transform: `translateY(${nextY}px)`,
            background: brand.cardBg,
            border: brand.cardBorder,
            borderRadius: brand.borderRadius,
            padding: "18px 32px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: brand.cardShadow,
          }}
        >
          <div style={{ fontSize: 22, color: brand.primary }}>▶</div>
          <div>
            <div style={{ fontSize: 12, color: brand.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Watch next</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: brand.textPrimary, fontFamily: brand.fontHeading }}>{nextVideoTitle}</div>
          </div>
        </div>
      )}
    </div>
  );
};
