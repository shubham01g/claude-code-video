import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Emphasis, GlassOverline, GlassStage, glassCard, glassMuted, glassText } from "./glass";

interface Props {
  overline?: string;
  prompt: string; // typed into the prompt bar
  image?: string; // staged asset shown (blurred) inside every result window
  levels: string[];
  levelTimes?: number[]; // seconds into the scene each window lights up
  title?: string; // line at the bottom, supports *word*
  typeSeconds?: number; // how long the prompt takes to type
}

// Glass scene: one prompt types out in a chat bar, hits send, and fans out along
// drawn connector lines into one result window per effort level. The results
// stay blurred — the reveal is saved for the end of the video.
export const PromptFanout: React.FC<Props> = ({
  overline = "SAME GAME · SAME PROMPT",
  prompt,
  image,
  levels,
  levelTimes,
  title = "One prompt · *five* effort levels",
  typeSeconds = 1.3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const barIn = spring({ frame, fps, config: { damping: 13, stiffness: 160 } });
  const typed = Math.round(interpolate(t, [0.25, 0.25 + typeSeconds], [0, prompt.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const sentAt = 0.3 + typeSeconds;
  const send = spring({ frame: frame - Math.round(sentAt * fps), fps, config: { damping: 8, stiffness: 260 } });
  const caretOn = t < sentAt && Math.floor(t * 3) % 2 === 0;

  const times = levels.map((_, i) => levelTimes?.[i] ?? sentAt + 0.3 + i * 0.25);
  const titleAt = times[times.length - 1] + 0.3;
  const titleIn = interpolate(t, [titleAt, titleAt + 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cardW = 200;
  const cardGap = 22;
  const rowW = levels.length * cardW + (levels.length - 1) * cardGap;
  const svgH = 110;
  const originX = rowW / 2;

  return (
    <GlassStage>
      <GlassOverline label={overline} />

      {/* prompt bar */}
      <div
        style={{
          ...glassCard,
          opacity: interpolate(barIn, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${(1 - barIn) * 18}px)`,
          borderRadius: 22,
          width: 980,
          padding: "16px 16px 16px 26px",
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            flex: 1,
            fontFamily: brand.fontSans,
            fontWeight: 600,
            fontSize: 22,
            color: glassText,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "clip",
          }}
        >
          {prompt.slice(0, typed)}
          <span style={{ opacity: caretOn ? 1 : 0, color: "#FDBA74" }}>|</span>
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `linear-gradient(135deg, #FDBA74, ${brand.primary})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${t >= sentAt ? 1 + 0.18 * Math.sin(Math.min(send, 1) * Math.PI) : 1})`,
            boxShadow: t >= sentAt ? "0 0 26px rgba(249,115,22,0.6)" : "none",
            flexShrink: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path d="M12 19V5M5 12l7-7 7 7" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* connectors */}
      <svg width={rowW} height={svgH} style={{ overflow: "visible" }}>
        {levels.map((level, i) => {
          const x = i * (cardW + cardGap) + cardW / 2;
          const d = `M ${originX} 0 C ${originX} ${svgH * 0.55}, ${x} ${svgH * 0.45}, ${x} ${svgH}`;
          const p = interpolate(t, [sentAt + 0.05, times[i]], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const lit = t >= times[i];
          return (
            <path
              key={level}
              d={d}
              pathLength={1}
              stroke={lit ? "#FDBA74" : "rgba(255,255,255,0.55)"}
              strokeWidth={3}
              fill="none"
              strokeDasharray="1"
              strokeDashoffset={1 - p}
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* result windows */}
      <div style={{ display: "flex", gap: cardGap }}>
        {levels.map((level, i) => {
          const lit = t >= times[i];
          const s = spring({ frame: frame - Math.round(times[i] * fps), fps, config: { damping: 10, stiffness: 190 } });
          const ghost = interpolate(t, [sentAt, sentAt + 0.3], [0, 0.38], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={level}
              style={{
                ...glassCard,
                width: cardW,
                borderRadius: 16,
                overflow: "hidden",
                opacity: lit ? 1 : ghost,
                transform: `scale(${lit ? interpolate(s, [0, 1], [0.86, 1]) : 0.94})`,
                border: lit ? "2px solid rgba(253,186,116,0.9)" : glassCard.border,
                boxShadow: lit ? "0 0 0 4px rgba(249,115,22,0.18), 0 12px 34px rgba(0,0,0,0.35)" : glassCard.boxShadow,
              }}
            >
              <div style={{ display: "flex", gap: 6, padding: "9px 10px", background: "rgba(0,0,0,0.25)" }}>
                {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
                  <div key={c} style={{ width: 9, height: 9, borderRadius: 5, background: c }} />
                ))}
              </div>
              <div style={{ position: "relative", width: cardW, height: (cardW * 9) / 16, overflow: "hidden", background: "#1d1530" }}>
                {image ? (
                  <Img
                    src={staticFile(image)}
                    style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(9px) saturate(1.2)", transform: "scale(1.2)" }}
                  />
                ) : null}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: brand.fontBold,
                    fontWeight: 900,
                    fontSize: 46,
                    color: "#FFFFFF",
                    textShadow: "0 4px 18px rgba(0,0,0,0.6)",
                  }}
                >
                  ?
                </div>
              </div>
              <div
                style={{
                  padding: "10px 0 12px",
                  textAlign: "center",
                  fontFamily: brand.fontBold,
                  fontWeight: 900,
                  fontSize: 20,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: lit ? "#FFFFFF" : glassMuted,
                  background: lit ? `linear-gradient(135deg, rgba(253,186,116,0.55), rgba(249,115,22,0.75))` : "transparent",
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
          marginTop: 30,
          fontFamily: brand.fontBold,
          fontWeight: 900,
          fontSize: 42,
          color: glassText,
          textShadow: "0 4px 24px rgba(0,0,0,0.35)",
        }}
      >
        <Emphasis text={title} />
      </div>
    </GlassStage>
  );
};
