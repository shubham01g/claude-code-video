import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Background, Overline } from "./shared";

export interface BarData {
  label: string;   // axis label below bar
  value: string;   // dollar/number label above bar e.g. "$500"
  highlight?: boolean; // last/featured bar — gets orange gradient + spring overshoot
}

interface Props {
  overline?: string;
  bars: BarData[];
}

export const BarChart: React.FC<Props> = ({
  overline = "THE SAME SYSTEM KEEPS CLIMBING",
  bars,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const maxBars = bars.length;

  return (
    <Background>
      <Overline label={overline} />

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 20,
          height: 260,
          width: "100%",
          maxWidth: 640,
          position: "relative",
        }}
      >
        {bars.map((bar, i) => {
          const isHighlight = bar.highlight ?? i === bars.length - 1;
          // Stagger: each bar starts 6 frames after previous
          const entryDelay = i * 6;
          const f = frame - entryDelay;

          let heightPct: number;
          if (isHighlight) {
            // Spring overshoot on highlight bar
            const s = spring({ frame: f, fps, config: { damping: 10, stiffness: 100 }, durationInFrames: 40 });
            heightPct = Math.min(s * 100, 100);
          } else {
            // Regular bars grow to proportional height (60–75% of max)
            const targetPct = 30 + (i / (maxBars - 1)) * 45;
            heightPct = interpolate(f, [0, 30], [0, targetPct], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          }

          const labelOpacity = interpolate(f, [20, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                height: "100%",
                justifyContent: "flex-end",
              }}
            >
              {/* Value label above bar */}
              <div
                style={{
                  opacity: labelOpacity,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: brand.fontBold,
                  color: isHighlight ? brand.primary : brand.textMuted,
                }}
              >
                {bar.value}
              </div>

              {/* Bar */}
              <div
                style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  background: isHighlight
                    ? `linear-gradient(to top, ${brand.barGradient[0]}, ${brand.barGradient[1]})`
                    : "rgba(0,0,0,0.10)",
                  borderRadius: `${brand.borderRadius}px ${brand.borderRadius}px 6px 6px`,
                  boxShadow: isHighlight ? `0 -4px 20px ${brand.accentGlow}` : "none",
                  transition: "none",
                }}
              />

              {/* Axis label */}
              <div
                style={{
                  opacity: labelOpacity,
                  fontSize: 11,
                  color: brand.textMuted,
                  fontFamily: brand.fontSans,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {bar.label}
              </div>
            </div>
          );
        })}
      </div>
    </Background>
  );
};
