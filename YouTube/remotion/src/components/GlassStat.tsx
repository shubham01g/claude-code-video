import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Emphasis, GlassOverline, GlassStage, glassCard, glassMuted, glassText } from "./glass";

interface Props {
  overline?: string;
  topLine?: string; // supports *word*
  value: string; // "8,613" or "$5,000+" — the digits count up, prefix/suffix stay
  label?: string; // supports *word*
  chips?: { label: string; at?: number }[]; // seconds into the scene each chip lights
  countSeconds?: number;
}

// Glass stat: one hero number counts up, label under it, proof chips light on their words.
export const GlassStat: React.FC<Props> = ({ overline, topLine, value, label, chips = [], countSeconds = 1.3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const panel = spring({ frame, fps, config: { damping: 13, stiffness: 150 } });

  const m = value.match(/^(\D*)([\d,]+)(.*)$/);
  let shown = value;
  if (m) {
    const target = parseInt(m[2].replace(/,/g, ""), 10);
    const p = interpolate(t, [0.25, 0.25 + countSeconds], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const eased = 1 - Math.pow(1 - p, 3);
    const n = Math.round(target * eased);
    shown = m[1] + (m[2].includes(",") ? n.toLocaleString("en-US") : String(n)) + m[3];
  }
  const done = interpolate(t, [0.25 + countSeconds, 0.45 + countSeconds], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelIn = interpolate(t, [0.5, 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <GlassStage>
      <div
        style={{
          ...glassCard,
          opacity: interpolate(panel, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
          transform: `scale(${interpolate(panel, [0, 1], [0.88, 1])})`,
          borderRadius: 36,
          padding: "36px 80px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: 720,
        }}
      >
        {overline ? <GlassOverline label={overline} /> : null}
        {topLine ? (
          <div style={{ fontFamily: brand.fontBold, fontWeight: 800, fontSize: 30, color: glassText, marginBottom: 6 }}>
            <Emphasis text={topLine} />
          </div>
        ) : null}
        <div
          style={{
            fontFamily: brand.fontBold,
            fontWeight: 900,
            fontSize: 150,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: brand.primary,
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 0 ${40 * done}px rgba(249,115,22,0.55), 0 6px 30px rgba(0,0,0,0.35)`,
            transform: `scale(${1 + 0.05 * Math.sin(done * Math.PI)})`,
          }}
        >
          {shown}
        </div>
        {label ? (
          <div
            style={{
              opacity: labelIn,
              fontFamily: brand.fontBold,
              fontWeight: 700,
              fontSize: 34,
              color: glassText,
              marginTop: 4,
              textShadow: "0 3px 18px rgba(0,0,0,0.35)",
            }}
          >
            <Emphasis text={label} />
          </div>
        ) : null}
        {chips.length ? (
          <div style={{ display: "flex", gap: 14, marginTop: 26 }}>
            {chips.map((c, i) => {
              const at = c.at ?? 0.9 + i * 0.25;
              const lit = t >= at;
              const s = spring({ frame: frame - Math.round(at * fps), fps, config: { damping: 10, stiffness: 190 } });
              return (
                <div
                  key={c.label}
                  style={{
                    ...glassCard,
                    borderRadius: 999,
                    padding: "10px 24px",
                    fontSize: 22,
                    fontWeight: 800,
                    color: lit ? glassText : glassMuted,
                    opacity: lit ? 1 : 0.38 * labelIn,
                    border: lit ? "1.5px solid rgba(253,186,116,0.9)" : glassCard.border,
                    background: lit ? "linear-gradient(135deg, rgba(249,115,22,0.42), rgba(249,115,22,0.18))" : glassCard.background,
                    transform: `scale(${lit ? interpolate(s, [0, 1], [0.85, 1]) : 1})`,
                  }}
                >
                  {c.label}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </GlassStage>
  );
};
