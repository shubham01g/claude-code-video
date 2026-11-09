import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { brand } from "../../brand";
import { Background, Overline, IconBadge } from "../../components/shared";

// Scene 2 — Hook (0:04–0:09)
// "making web apps, skills, agents, operating systems etc."
// Claude Code hub in the middle; one card shoots out per spoken word, "+ more" lands on "etc."
const W = 1120;
const H = 520;
const HUB = { x: W / 2, y: 250 };
const START = 14;
const STAGGER = 22;

const items = [
  { icon: "🌐", label: "Web Apps", x: 190, y: 95 },
  { icon: "🧩", label: "Skills", x: 930, y: 95 },
  { icon: "🤖", label: "Agents", x: 190, y: 405 },
  { icon: "🧠", label: "AI Operating Systems", x: 930, y: 405 },
];

export const Scene2_BuildHub: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hubIn = spring({ frame, fps, config: { damping: 12, stiffness: 160 } });
  const pulse = 0.5 + 0.5 * Math.sin(frame / 7);
  const moreAt = START + items.length * STAGGER;
  const moreIn = spring({ frame: frame - moreAt, fps, config: { damping: 10, stiffness: 180 } });

  return (
    <Background>
      <Overline label="WHAT I BUILT WITH IT" />

      <div style={{ position: "relative", width: W, height: H }}>
        {/* Wires */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {items.map((it, i) => {
            const t0 = START + i * STAGGER;
            const draw = interpolate(frame, [t0, t0 + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const len = Math.hypot(it.x - HUB.x, it.y - HUB.y);
            // Dot travels hub → card on a loop once the wire is drawn
            const p = frame > t0 + 10 ? ((frame - t0 - 10) % 30) / 30 : -1;
            return (
              <g key={i}>
                <line
                  x1={HUB.x}
                  y1={HUB.y}
                  x2={it.x}
                  y2={it.y}
                  stroke={brand.primary}
                  strokeWidth={3}
                  strokeDasharray={len}
                  strokeDashoffset={len * (1 - draw)}
                  strokeLinecap="round"
                  opacity={0.55}
                />
                {p >= 0 && (
                  <circle
                    cx={HUB.x + (it.x - HUB.x) * p}
                    cy={HUB.y + (it.y - HUB.y) * p}
                    r={6}
                    fill={brand.primary}
                    opacity={1 - p * 0.6}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Hub */}
        <div
          style={{
            position: "absolute",
            left: HUB.x - 130,
            top: HUB.y - 62,
            width: 260,
            height: 124,
            borderRadius: 28,
            background: brand.badgeGradient,
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${hubIn})`,
            boxShadow: `0 0 0 ${8 + 10 * pulse}px rgba(249,115,22,${0.12 + 0.1 * pulse}), 0 16px 40px rgba(232,98,42,0.35)`,
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono', Consolas, monospace", fontSize: 22, opacity: 0.85 }}>&gt;_</div>
          <div style={{ fontFamily: brand.fontBold, fontWeight: 900, fontSize: 34, letterSpacing: "-1px" }}>Claude Code</div>
        </div>

        {/* Cards */}
        {items.map((it, i) => {
          const t0 = START + i * STAGGER;
          const s = spring({ frame: frame - t0, fps, config: { damping: 10, stiffness: 180 } });
          const x = HUB.x + (it.x - HUB.x) * s;
          const y = HUB.y + (it.y - HUB.y) * s;
          const active = frame >= t0 && (i === items.length - 1 ? frame < moreAt + 12 : frame < t0 + STAGGER);
          const textIn = interpolate(frame, [t0 + 6, t0 + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - 160,
                top: y - 48,
                width: 320,
                height: 96,
                borderRadius: brand.borderRadius,
                background: brand.cardBg,
                border: active ? brand.activeBorder : brand.cardBorder,
                boxShadow: active ? `${brand.activeGlow}, ${brand.cardShadow}` : brand.cardShadow,
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "0 20px",
                opacity: frame < t0 ? 0 : Math.min(1, s * 1.4),
                transform: `scale(${0.4 + 0.6 * s})`,
              }}
            >
              <IconBadge size={58}>
                <span style={{ fontSize: 28 }}>{it.icon}</span>
              </IconBadge>
              <div
                style={{
                  fontFamily: brand.fontBold,
                  fontWeight: 800,
                  fontSize: it.label.length > 12 ? 23 : 28,
                  lineHeight: 1.1,
                  color: brand.textPrimary,
                  opacity: textIn,
                  transform: `translateY(${8 * (1 - textIn)}px)`,
                }}
              >
                {it.label}
              </div>
            </div>
          );
        })}

        {/* + more */}
        <div
          style={{
            position: "absolute",
            left: HUB.x - 90,
            top: HUB.y + 100,
            width: 180,
            textAlign: "center",
            transform: `scale(${Math.max(0, moreIn)})`,
            fontFamily: brand.fontScript,
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 44,
            color: brand.primary,
          }}
        >
          + more
        </div>
      </div>
    </Background>
  );
};
