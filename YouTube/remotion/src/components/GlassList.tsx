import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Emphasis, GlassOverline, GlassStage, glassCard, glassMuted, glassText } from "./glass";
import { IconBadge } from "./shared";

interface Item {
  label: string;
  sub?: string;
  icon?: string; // emoji / short glyph; default = number or check
}

interface Props {
  overline?: string;
  title?: string; // supports *word*
  items: Item[];
  itemTimes?: number[]; // seconds into the scene each item lights (set to the spoken words)
  layout?: "row" | "column";
  marker?: "number" | "check" | "icon";
  arrows?: boolean; // row only: arrows between items (a process)
  finale?: { at: number; title: string }; // title swap on the punchline
}

// Glass list / process: items wait as 38% ghosts and light up on their spoken word.
export const GlassList: React.FC<Props> = ({
  overline,
  title,
  items,
  itemTimes,
  layout = "row",
  marker = "number",
  arrows = false,
  finale,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const titleIn = interpolate(t, [0.05, 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const showFinale = finale !== undefined && t >= finale.at;
  const finalePop = finale ? spring({ frame: frame - Math.round(finale.at * fps), fps, config: { damping: 9, stiffness: 160 } }) : 1;
  const row = layout === "row";
  const n = items.length;
  const cardW = row ? Math.min(250, (1120 - (n - 1) * (arrows ? 54 : 18)) / n) : 640;

  return (
    <GlassStage>
      {overline ? <GlassOverline label={overline} /> : null}
      {title ? (
        <div
          style={{
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * 12}px) scale(${showFinale ? interpolate(finalePop, [0, 1], [0.85, 1]) : 1})`,
            fontFamily: brand.fontBold,
            fontWeight: 900,
            fontSize: 50,
            letterSpacing: "-0.015em",
            color: glassText,
            textShadow: "0 4px 24px rgba(0,0,0,0.35)",
            marginBottom: 34,
            textAlign: "center",
          }}
        >
          <Emphasis text={showFinale && finale ? finale.title : title} />
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: row ? "row" : "column", alignItems: "center", gap: row ? 0 : 14 }}>
        {items.map((item, i) => {
          const ghostIn = interpolate(t, [0.15 + i * 0.05, 0.4 + i * 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const at = itemTimes?.[i] ?? 0.4 + i * 0.3;
          const lit = t >= at;
          const s = spring({ frame: frame - Math.round(at * fps), fps, config: { damping: 10, stiffness: 190 } });
          const badge =
            marker === "check" ? (lit ? "✓" : String(i + 1)) : marker === "icon" ? item.icon ?? String(i + 1) : String(i + 1);
          const arrowIn = interpolate(t, [at + 0.05, at + 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <React.Fragment key={item.label}>
              <div
                style={{
                  ...glassCard,
                  width: cardW,
                  opacity: lit ? 1 : ghostIn * 0.38,
                  transform: `scale(${lit ? interpolate(s, [0, 1], [0.88, 1]) : 1})`,
                  border: lit ? "1.5px solid rgba(253,186,116,0.9)" : glassCard.border,
                  boxShadow: lit ? `${glassCard.boxShadow}, 0 0 ${28 * s}px rgba(249,115,22,0.35)` : glassCard.boxShadow,
                  borderRadius: 22,
                  padding: row ? "24px 18px 22px" : "16px 24px",
                  display: "flex",
                  flexDirection: row ? "column" : "row",
                  alignItems: "center",
                  gap: row ? 14 : 20,
                  textAlign: row ? "center" : "left",
                }}
              >
                <div style={{ transform: `scale(${lit ? interpolate(s, [0, 1], [0.5, 1]) : 1})` }}>
                  {marker === "icon" ? (
                    <div style={{ fontSize: 50, lineHeight: 1, filter: lit ? "none" : "grayscale(1)" }}>{badge}</div>
                  ) : (
                    <IconBadge size={row ? 56 : 50} active={lit}>
                      {badge}
                    </IconBadge>
                  )}
                </div>
                <div>
                  <div style={{ fontFamily: brand.fontBold, fontWeight: 800, fontSize: row ? 26 : 30, lineHeight: 1.15, color: lit ? glassText : glassMuted }}>
                    {item.label}
                  </div>
                  {item.sub ? (
                    <div style={{ marginTop: 6, fontSize: row ? 18 : 21, fontWeight: 600, lineHeight: 1.25, color: lit ? "#FDBA74" : glassMuted }}>
                      {item.sub}
                    </div>
                  ) : null}
                </div>
              </div>
              {row && arrows && i < n - 1 ? (
                <div style={{ width: 54, display: "flex", justifyContent: "center", opacity: lit ? arrowIn : 0.2 }}>
                  <svg width="34" height="20" viewBox="0 0 34 20">
                    <path d="M2 10 H28 M20 3 L29 10 L20 17" stroke="#FDBA74" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : row && i < n - 1 ? (
                <div style={{ width: 18 }} />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </GlassStage>
  );
};
