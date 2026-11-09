import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Emphasis, GlassOverline, GlassStage, glassCard, glassMuted, glassText } from "./glass";
import { IconBadge } from "./shared";

interface Props {
  overline?: string;
  logo: string;          // staged asset path, e.g. "assets/claude.png"
  title?: string;        // supports *word* → Caveat orange
  items: string[];       // ranked 1..n, laid out in two columns
  itemTimes?: number[];  // seconds into the scene each item lights up (default: quick stagger)
  finale?: { at: number; title: string }; // title swap + logo pulse, e.g. on the punchline
}

// Glass scene over the footage: logo spins in with pulse rings, then a numbered
// list lights up item by item. Timed in seconds so it plays the same at 24 and 30 fps.
export const ClaudeRank: React.FC<Props> = ({
  overline = "ONE TOOL · EVERY EDIT",
  logo,
  title = "Claude does *everything*",
  items,
  itemTimes,
  finale,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const logoIn = spring({ frame, fps, config: { damping: 9, stiffness: 150, mass: 0.8 } });
  const finaleFrame = finale ? frame - Math.round(finale.at * fps) : -1;
  const finalePop = finale ? spring({ frame: finaleFrame, fps, config: { damping: 9, stiffness: 160 } }) : 0;
  const logoScale = interpolate(logoIn, [0, 1], [0.2, 1]) * (1 + 0.14 * Math.sin(Math.min(finalePop, 1) * Math.PI));
  const logoRotate = interpolate(logoIn, [0, 1], [-140, 0]);
  const float = Math.sin(t * 2.4) * 3;

  const titleIn = interpolate(t, [0.22, 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const showFinale = finale !== undefined && finaleFrame >= 0;
  const ringStarts = [0.15, 0.6, ...(finale ? [finale.at, finale.at + 0.4] : [])];

  const half = Math.ceil(items.length / 2);
  const columns = [items.slice(0, half), items.slice(half)];

  return (
    <GlassStage>
      <GlassOverline label={overline} />

      <div style={{ position: "relative", width: 104, height: 104, marginBottom: 16 }}>
        {ringStarts.map((start) => {
          const p = interpolate(t, [start, start + 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={start}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 26,
                border: "3px solid #FDBA74",
                opacity: p > 0 ? (1 - p) * 0.7 : 0,
                transform: `scale(${1 + p * 1.2})`,
              }}
            />
          );
        })}
        <Img
          src={staticFile(logo)}
          style={{
            position: "absolute",
            inset: 0,
            width: 104,
            height: 104,
            borderRadius: 24,
            transform: `translateY(${float}px) scale(${logoScale}) rotate(${logoRotate}deg)`,
            boxShadow: "0 16px 44px rgba(249,115,22,0.45), 0 6px 16px rgba(0,0,0,0.3)",
          }}
        />
      </div>

      <div
        style={{
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 12}px) scale(${showFinale ? interpolate(finalePop, [0, 1], [0.8, 1]) : 1})`,
          fontFamily: brand.fontBold,
          fontWeight: 900,
          fontSize: 46,
          letterSpacing: "-0.01em",
          color: glassText,
          textShadow: "0 4px 24px rgba(0,0,0,0.35)",
          marginBottom: 26,
        }}
      >
        <Emphasis text={showFinale && finale ? finale.title : title} />
      </div>

      <div style={{ display: "flex", gap: 18 }}>
        {columns.map((column, c) => (
          <div key={c} style={{ display: "flex", flexDirection: "column", gap: 12, width: 340 }}>
            {column.map((item, r) => {
              const rank = c * half + r;
              const ghostIn = interpolate(t, [0.3 + rank * 0.05, 0.55 + rank * 0.05], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const start = Math.round((itemTimes?.[rank] ?? 0.42 + rank * 0.2) * fps);
              const lit = frame >= start;
              const s = spring({ frame: frame - start, fps, config: { damping: 10, stiffness: 190 } });
              return (
                <div
                  key={item}
                  style={{
                    ...glassCard,
                    // not-yet-spoken items wait as ghosts (38%), then pop when their word lands
                    opacity: lit ? 1 : ghostIn * 0.38,
                    transform: `scale(${lit ? interpolate(s, [0, 1], [0.9, 1]) : 1})`,
                    border: lit ? "1.5px solid rgba(253,186,116,0.85)" : glassCard.border,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    borderRadius: brand.borderRadius,
                    padding: "12px 20px 12px 14px",
                  }}
                >
                  <div style={{ transform: `scale(${lit ? interpolate(s, [0, 1], [0.5, 1]) : 1})` }}>
                    <IconBadge size={46} active={lit}>
                      {rank + 1}
                    </IconBadge>
                  </div>
                  <div style={{ fontFamily: brand.fontBold, fontWeight: 800, fontSize: 25, color: lit ? glassText : glassMuted }}>
                    {item}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </GlassStage>
  );
};
