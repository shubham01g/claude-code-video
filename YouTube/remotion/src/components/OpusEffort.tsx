import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Emphasis, GlassOverline, GlassStage, glassCard, glassMuted, glassText } from "./glass";

interface Props {
  overline?: string;
  logo: string; // staged asset path, e.g. "assets/claude.png"
  model?: string; // big wordmark next to the logo
  title?: string; // line under the meter, supports *word*
  levels: string[]; // left → right, lowest effort first
  levelTimes?: number[]; // seconds into the scene each bar fills (default: quick sweep)
}

// Glass scene: logo + model wordmark land, then a signal-bar effort meter fills
// left to right, one bar per effort level, with a glow sweeping across it.
export const OpusEffort: React.FC<Props> = ({
  overline = "ONE MODEL · EVERY SETTING",
  logo,
  model = "Opus 5.5",
  title = "at *every* effort level",
  levels,
  levelTimes,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const logoIn = spring({ frame, fps, config: { damping: 9, stiffness: 150, mass: 0.8 } });
  const wordIn = spring({ frame: frame - Math.round(0.18 * fps), fps, config: { damping: 12, stiffness: 160 } });
  const meterIn = interpolate(t, [0.35, 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const times = levels.map((_, i) => levelTimes?.[i] ?? 0.75 + i * 0.22);
  const last = times[times.length - 1];
  const titleIn = interpolate(t, [last + 0.15, last + 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // the glow follows the newest lit bar
  const litCount = times.filter((s) => t >= s).length;
  const float = Math.sin(t * 2.4) * 3;

  const barW = 150;
  const gap = 18;
  const maxH = 210;

  return (
    <GlassStage>
      <GlassOverline label={overline} />

      <div style={{ display: "flex", alignItems: "center", gap: 26, marginBottom: 34 }}>
        <div style={{ position: "relative", width: 96, height: 96 }}>
          {[0.1, 0.5].map((start) => {
            const p = interpolate(t, [start, start + 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={start}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 24,
                  border: "3px solid #FDBA74",
                  opacity: p > 0 ? (1 - p) * 0.7 : 0,
                  transform: `scale(${1 + p * 1.1})`,
                }}
              />
            );
          })}
          <Img
            src={staticFile(logo)}
            style={{
              position: "absolute",
              inset: 0,
              width: 96,
              height: 96,
              borderRadius: 22,
              transform: `translateY(${float}px) scale(${interpolate(logoIn, [0, 1], [0.2, 1])}) rotate(${interpolate(logoIn, [0, 1], [-140, 0])}deg)`,
              boxShadow: "0 16px 44px rgba(249,115,22,0.45), 0 6px 16px rgba(0,0,0,0.3)",
            }}
          />
        </div>
        <div
          style={{
            opacity: interpolate(wordIn, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateX(${(1 - wordIn) * -30}px)`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontFamily: brand.fontBold, fontWeight: 700, fontSize: 26, color: glassMuted, letterSpacing: "0.02em" }}>Claude</div>
          <div
            style={{
              fontFamily: brand.fontBold,
              fontWeight: 900,
              fontSize: 76,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: glassText,
              textShadow: "0 4px 24px rgba(0,0,0,0.35)",
            }}
          >
            {model}
          </div>
        </div>
      </div>

      <div
        style={{
          ...glassCard,
          opacity: meterIn,
          transform: `translateY(${(1 - meterIn) * 20}px)`,
          borderRadius: 30,
          padding: "30px 36px 22px",
          display: "flex",
          gap,
          alignItems: "flex-end",
        }}
      >
        {levels.map((level, i) => {
          const s = spring({ frame: frame - Math.round(times[i] * fps), fps, config: { damping: 11, stiffness: 170 } });
          const lit = t >= times[i];
          const h = maxH * (0.34 + (0.66 * i) / Math.max(levels.length - 1, 1));
          const isNewest = lit && i === litCount - 1;
          const isMax = i === levels.length - 1;
          const pulse = isMax && lit ? 0.5 + 0.5 * Math.sin((t - times[i]) * 9) : 0;
          return (
            <div key={level} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  position: "relative",
                  width: barW,
                  height: maxH,
                  display: "flex",
                  alignItems: "flex-end",
                }}
              >
                {/* empty track */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: h,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.10)",
                    border: "1.5px dashed rgba(255,255,255,0.28)",
                  }}
                />
                {/* fill grows up from the bottom */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: h * Math.min(s, 1.04),
                    borderRadius: 16,
                    background: `linear-gradient(0deg, ${brand.primary}, #FDBA74)`,
                    boxShadow: isNewest || pulse
                      ? `0 0 ${28 + pulse * 30}px rgba(249,115,22,${0.55 + pulse * 0.3})`
                      : "0 6px 18px rgba(0,0,0,0.25)",
                    opacity: lit ? 1 : 0,
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: brand.fontBold,
                  fontWeight: 900,
                  fontSize: 24,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: lit ? glassText : glassMuted,
                  transform: `scale(${lit ? interpolate(s, [0, 1], [0.8, 1]) : 1})`,
                }}
              >
                {level}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 12}px)`,
          marginTop: 26,
          fontFamily: brand.fontBold,
          fontWeight: 900,
          fontSize: 44,
          color: glassText,
          textShadow: "0 4px 24px rgba(0,0,0,0.35)",
        }}
      >
        <Emphasis text={title} />
      </div>
    </GlassStage>
  );
};
