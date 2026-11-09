import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Emphasis, GlassOverline, GlassStage, glassCard, glassText } from "./glass";

interface Props {
  overline?: string;
  text: string; // supports *word* → Caveat orange
}

// Glass scene over the footage: one big line on a glass panel, words landing one by one.
export const GlassTitle: React.FC<Props> = ({ overline, text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const panel = spring({ frame, fps, config: { damping: 13, stiffness: 150 } });
  // split on spaces but keep "*two words*" emphasis groups whole
  const parts = text.match(/\*[^*]+\*|\S+/g) ?? [];

  return (
    <GlassStage>
      <div
        style={{
          ...glassCard,
          opacity: interpolate(panel, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
          transform: `scale(${interpolate(panel, [0, 1], [0.88, 1])})`,
          borderRadius: 36,
          padding: "44px 72px 50px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {overline ? <GlassOverline label={overline} /> : null}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "baseline",
            gap: "0 0.26em",
            maxWidth: 900,
            fontFamily: brand.fontBold,
            fontWeight: 900,
            fontSize: 84,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: glassText,
            textShadow: "0 4px 24px rgba(0,0,0,0.35)",
          }}
        >
          {parts.map((part, i) => {
            const s = spring({ frame: frame - Math.round((0.15 + i * 0.14) * fps), fps, config: { damping: 11, stiffness: 180 } });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: interpolate(s, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
                  transform: `translateY(${(1 - s) * 26}px)`,
                }}
              >
                <Emphasis text={part} scale={1.3} />
              </span>
            );
          })}
        </div>
      </div>
    </GlassStage>
  );
};
