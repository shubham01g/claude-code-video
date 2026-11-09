import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Emphasis, GlassOverline, GlassStage, glassCard, glassText } from "./glass";

export interface FormatCard {
  label: string;
  shape: "vertical" | "wide"; // 9:16 phone frame or 16:9 frame
  at?: number;                // seconds into the scene it appears
}

interface Props {
  overline?: string;
  title?: string; // supports *word* → Caveat orange
  cards: FormatCard[];
}

const SHAPE = { vertical: { width: 168, height: 298 }, wide: { width: 380, height: 214 } };

// Glass scene over the footage: one screen-shaped frame per video format,
// each popping in on its word.
export const FormatCards: React.FC<Props> = ({ overline = "ANY FORMAT", title = "Every *format*", cards }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const titleIn = interpolate(t, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <GlassStage>
      <GlassOverline label={overline} />
      <div
        style={{
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 12}px)`,
          fontFamily: brand.fontBold,
          fontWeight: 900,
          fontSize: 46,
          color: glassText,
          textShadow: "0 4px 24px rgba(0,0,0,0.35)",
          marginBottom: 34,
        }}
      >
        <Emphasis text={title} />
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 44 }}>
        {cards.map((card, i) => {
          const start = Math.round((card.at ?? 0.2 + i * 0.5) * fps);
          const s = spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 170, mass: 0.8 } });
          const play = spring({ frame: frame - start - Math.round(fps * 0.15), fps, config: { damping: 9, stiffness: 200 } });
          const size = SHAPE[card.shape];
          return (
            <div
              key={card.label}
              style={{
                opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
                transform: `translateY(${(1 - s) * 60}px) scale(${interpolate(s, [0, 1], [0.7, 1])})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                style={{
                  ...glassCard,
                  ...size,
                  borderRadius: card.shape === "vertical" ? 28 : 22,
                  border: "2px solid rgba(253,186,116,0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    background: brand.badgeGradient,
                    boxShadow: "0 8px 26px rgba(249,115,22,0.5)",
                    transform: `scale(${play})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      marginLeft: 5,
                      width: 0,
                      height: 0,
                      borderTop: "12px solid transparent",
                      borderBottom: "12px solid transparent",
                      borderLeft: "20px solid #FFFFFF",
                    }}
                  />
                </div>
                {/* a thin progress line so the frame reads as a video */}
                <div
                  style={{
                    position: "absolute",
                    left: 16,
                    right: 16,
                    bottom: 16,
                    height: 5,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.3)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${interpolate(frame - start, [0, fps * 3], [8, 90], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
                      height: "100%",
                      background: brand.primary,
                    }}
                  />
                </div>
              </div>
              <div style={{ fontFamily: brand.fontBold, fontWeight: 800, fontSize: 28, color: glassText, textShadow: "0 2px 14px rgba(0,0,0,0.4)" }}>
                {card.label}
              </div>
            </div>
          );
        })}
      </div>
    </GlassStage>
  );
};
