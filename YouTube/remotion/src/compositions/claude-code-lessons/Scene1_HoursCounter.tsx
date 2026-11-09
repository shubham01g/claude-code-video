import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";
import { brand } from "../../brand";
import { Background, Overline } from "../../components/shared";
import { MixedLine } from "./parts";

// Scene 1 — Hook (0:00–0:04)
// "I spent thousands of hours on Claude Code"
// Counter rolls 0 → 1,000, then an "s" stamps on → "1,000s". Stopwatch fills while it counts.
export const Scene1_HoursCounter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, brand.enterFrames], [0, 1], { extrapolateRight: "clamp" });
  const count = interpolate(frame, [6, 52], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const n = Math.round(1000 * count).toLocaleString("en-US");

  const sPop = spring({ frame: frame - 54, fps, config: { damping: 10, stiffness: 180 } });
  const flash = interpolate(frame, [54, 60, 80], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const bottom = interpolate(frame, [30, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const chipIn = spring({ frame: frame - 62, fps, config: { damping: 14, stiffness: 160 } });
  const typed = "claude".slice(0, Math.max(0, Math.floor((frame - 70) / 3)));
  const cursorOn = Math.floor(frame / 8) % 2 === 0;

  // Stopwatch: arc fills + hand spins fast while counting
  const R = 34;
  const C = 2 * Math.PI * R;
  const handDeg = count * 360 * 6;

  return (
    <Background>
      <Overline label="CLAUDE CODE · REAL HOURS" />

      <div
        style={{
          opacity: enter,
          transform: `scale(${0.93 + 0.07 * enter}) translateY(${18 * (1 - enter)}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        <MixedLine text="I spent *thousands*" size={40} />

        <div style={{ display: "flex", alignItems: "center", gap: 34, margin: "6px 0" }}>
          {/* Stopwatch */}
          <svg width={110} height={120} viewBox="0 0 110 120">
            <rect x={47} y={4} width={16} height={12} rx={4} fill={brand.textPrimary} />
            <circle cx={55} cy={66} r={46} fill="#fff" stroke={brand.textPrimary} strokeWidth={5} />
            <circle
              cx={55}
              cy={66}
              r={R}
              fill="none"
              stroke={brand.primary}
              strokeWidth={10}
              strokeDasharray={C}
              strokeDashoffset={C * (1 - count)}
              transform="rotate(-90 55 66)"
              strokeLinecap="round"
            />
            <line
              x1={55}
              y1={66}
              x2={55}
              y2={38}
              stroke={brand.textPrimary}
              strokeWidth={5}
              strokeLinecap="round"
              transform={`rotate(${handDeg} 55 66)`}
            />
            <circle cx={55} cy={66} r={6} fill={brand.textPrimary} />
          </svg>

          {/* Hero number */}
          <div
            style={{
              fontFamily: brand.fontBold,
              fontWeight: 900,
              fontSize: 168,
              lineHeight: 1,
              letterSpacing: "-5px",
              color: brand.primary,
              display: "flex",
              alignItems: "baseline",
              fontVariantNumeric: "tabular-nums",
              textShadow: `0 0 ${40 * flash}px rgba(249,115,22,${0.6 * flash})`,
            }}
          >
            <span>{n}</span>
            <span
              style={{
                display: "inline-block",
                transform: `scale(${sPop}) rotate(${(1 - sPop) * -25}deg)`,
                opacity: Math.min(1, sPop * 1.5),
                marginLeft: 4,
              }}
            >
              s
            </span>
          </div>
        </div>

        <MixedLine text="of hours on *Claude Code*" size={40} opacity={bottom} y={14 * (1 - bottom)} />

        {/* Terminal chip */}
        <div
          style={{
            marginTop: 26,
            transform: `scale(${chipIn})`,
            opacity: chipIn,
            background: brand.textPrimary,
            color: "#F3EFEB",
            borderRadius: 14,
            padding: "12px 22px",
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            fontSize: 22,
            boxShadow: brand.cardShadow,
            minWidth: 230,
          }}
        >
          <span style={{ color: brand.primary }}>$ </span>
          {typed}
          <span style={{ opacity: cursorOn ? 1 : 0, color: brand.primary }}>▍</span>
        </div>
      </div>
    </Background>
  );
};
