import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Emphasis, GlassStage, glassCard, glassMuted, glassText } from "./glass";

interface Props {
  kicker?: string; // "MODULE" or "UP NEXT · MODULE"
  number: string; // "0", "1", "2"
  title: string; // supports *word*
  sub?: string;
}

// Glass chapter card: a big module number punches in, title slides beside it,
// an orange rule draws under both. Marks each new module so viewers feel progress.
export const ChapterCard: React.FC<Props> = ({ kicker = "MODULE", number, title, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const panel = spring({ frame, fps, config: { damping: 13, stiffness: 150 } });
  const num = spring({ frame: frame - Math.round(0.12 * fps), fps, config: { damping: 8, stiffness: 160, mass: 0.9 } });
  const titleIn = spring({ frame: frame - Math.round(0.3 * fps), fps, config: { damping: 14, stiffness: 150 } });
  const rule = interpolate(t, [0.45, 0.95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subIn = interpolate(t, [0.6, 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <GlassStage>
      <div
        style={{
          ...glassCard,
          opacity: interpolate(panel, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
          transform: `scale(${interpolate(panel, [0, 1], [0.9, 1])})`,
          borderRadius: 36,
          padding: "40px 64px 44px 48px",
          display: "flex",
          alignItems: "center",
          gap: 40,
        }}
      >
        <div
          style={{
            width: 170,
            height: 170,
            borderRadius: 40,
            background: brand.badgeGradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: brand.fontBold,
            fontWeight: 900,
            fontSize: 120,
            color: "#fff",
            boxShadow: "0 18px 50px rgba(249,115,22,0.45), inset 0 -4px 14px rgba(0,0,0,0.2)",
            transform: `scale(${interpolate(num, [0, 1], [0.3, 1])}) rotate(${interpolate(num, [0, 1], [-25, 0])}deg)`,
            flexShrink: 0,
          }}
        >
          {number}
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "0.22em",
              color: "#FDBA74",
              opacity: titleIn,
              marginBottom: 10,
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              fontFamily: brand.fontBold,
              fontWeight: 900,
              fontSize: 58,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              color: glassText,
              textShadow: "0 4px 24px rgba(0,0,0,0.35)",
              opacity: interpolate(titleIn, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
              transform: `translateX(${(1 - titleIn) * 40}px)`,
            }}
          >
            <Emphasis text={title} scale={1.2} />
          </div>
          <div
            style={{
              height: 5,
              borderRadius: 3,
              marginTop: 18,
              width: `${rule * 100}%`,
              background: "linear-gradient(90deg, #F97316, rgba(253,186,116,0))",
            }}
          />
          {sub ? (
            <div style={{ marginTop: 14, fontSize: 24, fontWeight: 600, color: glassMuted, opacity: subIn }}>{sub}</div>
          ) : null}
        </div>
      </div>
    </GlassStage>
  );
};
