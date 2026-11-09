import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand";
import { Background, IconBadge, Overline } from "../../components/shared";

// Scene 2 — Hook (0:04–0:14)
// "Claude would add motion graphics, B-rolls, text, different type of logos, animation,
//  captions, etc. Claude going to be do that everything."
// Claude logo hub in the middle; one numbered card shoots out per spoken word,
// "does everything" lands under the hub on the last line.
const W = 1120;
const H = 520;
const HUB = { x: W / 2, y: 230 };
const EVERYTHING_AT = 268; // "everything" ≈ 9.0s into the scene

// `at` = frame the word is spoken (scene starts on "Claude would add", 0:04.1 of the cut)
const items = [
  { icon: "✨", label: "Motion graphics", x: 170, y: 70, at: 29 },
  { icon: "🎞️", label: "B-rolls", x: 950, y: 70, at: 83 },
  { icon: "🔤", label: "Text", x: 170, y: 230, at: 106 },
  { icon: "🏷️", label: "Logos", x: 950, y: 230, at: 137 },
  { icon: "🌀", label: "Animation", x: 170, y: 390, at: 158 },
  { icon: "💬", label: "Captions", x: 950, y: 390, at: 186 },
];

export const Scene2_ClaudeAddsHub: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hubIn = spring({ frame, fps, config: { damping: 11, stiffness: 150 } });
  const pulse = 0.5 + 0.5 * Math.sin(frame / 7);
  const everything = spring({ frame: frame - EVERYTHING_AT, fps, config: { damping: 9, stiffness: 170 } });
  const hubBump = 1 + 0.12 * Math.sin(Math.min(everything, 1) * Math.PI);

  return (
    <Background>
      <Overline label="ONE TOOL · EVERY EDIT" />

      <div style={{ position: "relative", width: W, height: H }}>
        {/* Wires */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {items.map((it, i) => {
            const draw = interpolate(frame, [it.at, it.at + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const len = Math.hypot(it.x - HUB.x, it.y - HUB.y);
            // Dot travels hub → card on a loop once the wire is drawn
            const p = frame > it.at + 10 ? ((frame - it.at - 10) % 30) / 30 : -1;
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
                  <circle cx={HUB.x + (it.x - HUB.x) * p} cy={HUB.y + (it.y - HUB.y) * p} r={6} fill={brand.primary} opacity={1 - p * 0.6} />
                )}
              </g>
            );
          })}
        </svg>

        {/* Hub — Claude logo */}
        <Img
          src={staticFile("claude.png")}
          style={{
            position: "absolute",
            left: HUB.x - 75,
            top: HUB.y - 75,
            width: 150,
            height: 150,
            borderRadius: 36,
            transform: `scale(${hubIn * hubBump}) rotate(${(1 - hubIn) * -140}deg)`,
            boxShadow: `0 0 0 ${8 + 10 * pulse}px rgba(249,115,22,${0.12 + 0.1 * pulse}), 0 16px 40px rgba(232,98,42,0.35)`,
          }}
        />

        {/* Cards */}
        {items.map((it, i) => {
          const s = spring({ frame: frame - it.at, fps, config: { damping: 10, stiffness: 180 } });
          // travel is damped harder than the pop: these cards sit near the frame edge,
          // and a bouncy spring overshoots them off screen
          const travel = spring({ frame: frame - it.at, fps, config: { damping: 18, stiffness: 170 } });
          const x = HUB.x + (it.x - HUB.x) * travel;
          const y = HUB.y + (it.y - HUB.y) * travel;
          const next = items[i + 1]?.at ?? EVERYTHING_AT;
          const active = (frame >= it.at && frame < next) || frame >= EVERYTHING_AT;
          const textIn = interpolate(frame, [it.at + 6, it.at + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
                opacity: frame < it.at ? 0 : Math.min(1, s * 1.4),
                transform: `scale(${0.4 + 0.6 * s})`,
              }}
            >
              <IconBadge size={58}>
                <span style={{ fontSize: 28 }}>{it.icon}</span>
              </IconBadge>
              <div style={{ opacity: textIn, transform: `translateY(${8 * (1 - textIn)}px)` }}>
                <div style={{ fontFamily: brand.fontSans, fontWeight: 700, fontSize: 13, letterSpacing: "0.12em", color: brand.textMuted }}>
                  0{i + 1}
                </div>
                <div style={{ fontFamily: brand.fontBold, fontWeight: 800, fontSize: it.label.length > 12 ? 23 : 27, lineHeight: 1.1, whiteSpace: "nowrap", color: brand.textPrimary }}>
                  {it.label}
                </div>
              </div>
            </div>
          );
        })}

        {/* "does everything" */}
        <div
          style={{
            position: "absolute",
            left: HUB.x - 200,
            top: HUB.y + 104,
            width: 400,
            textAlign: "center",
            transform: `scale(${Math.max(0, everything)})`,
            lineHeight: 1,
          }}
        >
          <div style={{ fontFamily: brand.fontBold, fontWeight: 900, fontSize: 34, color: brand.textPrimary }}>Claude does</div>
          <div style={{ fontFamily: brand.fontScript, fontStyle: "italic", fontWeight: 700, fontSize: 72, color: brand.primary }}>
            everything
          </div>
        </div>
      </div>
    </Background>
  );
};
