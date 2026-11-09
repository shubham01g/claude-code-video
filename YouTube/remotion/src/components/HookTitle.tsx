import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Emphasis, GlassOverline, GlassStage, glassCard, glassMuted, glassText } from "./glass";

interface Props {
  overline?: string;
  title: string; // supports *word* → Caveat orange
  sub?: string;
  chipLabel?: string; // small caps over the countdown
  // countdown start values; seconds tick down live while the scene is up
  countdown?: { days: number; hours: number; minutes: number; seconds: number };
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

// Glass hook card: course title lands word by word, a live countdown ticks under it.
export const HookTitle: React.FC<Props> = ({
  overline = "CLAUDE CODE · FULL COURSE",
  title,
  sub,
  chipLabel = "TIME LEFT IN 2026",
  countdown,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const panel = spring({ frame, fps, config: { damping: 13, stiffness: 150 } });
  const parts = title.match(/\*[^*]+\*|\S+/g) ?? [];
  const subIn = interpolate(t, [0.35 + parts.length * 0.11, 0.65 + parts.length * 0.11], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const clockIn = spring({ frame: frame - Math.round((0.55 + parts.length * 0.11) * fps), fps, config: { damping: 12, stiffness: 170 } });

  let units: [string, string][] = [];
  if (countdown) {
    let total =
      countdown.days * 86400 + countdown.hours * 3600 + countdown.minutes * 60 + countdown.seconds - Math.floor(t);
    const d = Math.floor(total / 86400);
    total -= d * 86400;
    const h = Math.floor(total / 3600);
    total -= h * 3600;
    const m = Math.floor(total / 60);
    const s = total - m * 60;
    units = [
      [pad(d), "DAYS"],
      [pad(h), "HRS"],
      [pad(m), "MIN"],
      [pad(s), "SEC"],
    ];
  }

  return (
    <GlassStage>
      <div
        style={{
          ...glassCard,
          opacity: interpolate(panel, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
          transform: `scale(${interpolate(panel, [0, 1], [0.88, 1])})`,
          borderRadius: 36,
          padding: "40px 72px 44px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: 1040,
        }}
      >
        <GlassOverline label={overline} />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "baseline",
            gap: "0 0.26em",
            fontFamily: brand.fontBold,
            fontWeight: 900,
            fontSize: 70,
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            color: glassText,
            textShadow: "0 4px 24px rgba(0,0,0,0.35)",
            textAlign: "center",
          }}
        >
          {parts.map((part, i) => {
            const s = spring({ frame: frame - Math.round((0.15 + i * 0.11) * fps), fps, config: { damping: 11, stiffness: 180 } });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: interpolate(s, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
                  transform: `translateY(${(1 - s) * 24}px)`,
                }}
              >
                <Emphasis text={part} scale={1.25} />
              </span>
            );
          })}
        </div>
        {sub ? (
          <div
            style={{
              opacity: subIn,
              transform: `translateY(${(1 - subIn) * 10}px)`,
              marginTop: 18,
              fontFamily: brand.fontSans,
              fontWeight: 600,
              fontSize: 24,
              color: glassMuted,
              letterSpacing: "0.01em",
            }}
          >
            {sub}
          </div>
        ) : null}
        {countdown ? (
          <div
            style={{
              marginTop: 30,
              opacity: interpolate(clockIn, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
              transform: `scale(${interpolate(clockIn, [0, 1], [0.8, 1])})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.2em", color: "#FDBA74" }}>{chipLabel}</div>
            <div style={{ display: "flex", gap: 14 }}>
              {units.map(([v, l]) => (
                <div
                  key={l}
                  style={{
                    ...glassCard,
                    borderRadius: 18,
                    width: 104,
                    padding: "12px 0 10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontFamily: brand.fontBold, fontWeight: 900, fontSize: 44, color: glassText, fontVariantNumeric: "tabular-nums" }}>
                    {v}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", color: glassMuted }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </GlassStage>
  );
};
