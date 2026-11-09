import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { brand } from "../../brand";
import { Background, Overline } from "../../components/shared";
import { lessonColors } from "./parts";

// Scene 3 — Hook Message (0:09–0:15)
// "in this video I give you everything that I wish I knew when I started"
// Headline builds word by word; 7 blurred lesson cards fan out (same "locked board" as the
// lesson presentation); card 1 un-blurs last as the tease.
const words: { t: string; s?: boolean }[] = [
  { t: "Everything" },
  { t: "I" },
  { t: "wish", s: true },
  { t: "I", s: true },
  { t: "knew", s: true },
  { t: "when" },
  { t: "I" },
  { t: "started" },
];

const lessons = [
  "Don't trust the first output",
  "Make Claude check its own work",
  "Let Claude write the prompt",
  "New task? New session.",
  "Run sub-agents in parallel",
  "Turn anything into a skill",
  "Always keep a backup tool",
];

const FAN_AT = 46;
const REVEAL_AT = 118;

export const Scene3_WishIKnew: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const swoosh = interpolate(frame, [38, 54], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const reveal = spring({ frame: frame - REVEAL_AT, fps, config: { damping: 12, stiffness: 140 } });
  const tagIn = interpolate(frame, [REVEAL_AT + 10, REVEAL_AT + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Background>
      <Overline label="IN THIS VIDEO" />

      {/* Headline */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "nowrap", position: "relative" }}>
        {words.map((w, i) => {
          const t0 = 4 + i * 4;
          const p = interpolate(frame, [t0, t0 + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <span
              key={i}
              style={{
                opacity: p,
                transform: `translateY(${16 * (1 - p)}px)`,
                display: "inline-block",
                // italic Caveat overhangs its box — pad so it doesn't touch the next word
                paddingRight: w.s ? 10 : 0,
                fontFamily: w.s ? brand.fontScript : brand.fontBold,
                fontStyle: w.s ? "italic" : "normal",
                fontWeight: w.s ? 700 : 900,
                fontSize: w.s ? 68 * 1.18 : 58,
                letterSpacing: w.s ? 0 : "-1.5px",
                color: w.s ? brand.primary : brand.textPrimary,
                lineHeight: 1,
              }}
            >
              {w.t}
            </span>
          );
        })}
      </div>

      {/* Hand-drawn swoosh under "wish I knew" */}
      <svg width={300} height={30} style={{ marginTop: -4, marginLeft: -40 }} viewBox="0 0 300 30">
        <path
          d="M6 20 C 80 6, 200 4, 294 16"
          fill="none"
          stroke={brand.primary}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={300}
          strokeDashoffset={300 * (1 - swoosh)}
        />
      </svg>

      {/* Fan of lesson cards */}
      <div style={{ position: "relative", width: 1100, height: 330, marginTop: 6 }}>
        {lessons.map((title, i) => {
          const t = i - 3;
          const s = spring({ frame: frame - FAN_AT - i * 5, fps, config: { damping: 13, stiffness: 150 } });
          const isFirst = i === 0;
          const lift = isFirst ? reveal : 0;
          const rot = t * 7 * s * (1 - lift);
          const x = 550 + t * 132 * s - 85 + lift * 60;
          const y = 70 + t * t * 7 * s - lift * 40;
          const blur = isFirst ? 6 * (1 - reveal) : 6;
          const c = lessonColors[i];
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: 170,
                height: 210,
                borderRadius: 18,
                background: brand.cardBg,
                boxShadow: isFirst && reveal > 0.05
                  ? `0 0 0 ${3 * reveal}px ${brand.primary}, 0 0 0 ${10 * reveal}px rgba(249,115,22,0.18), 0 20px 40px rgba(0,0,0,0.15)`
                  : brand.cardShadow,
                transform: `rotate(${rot}deg) scale(${(0.6 + 0.4 * s) * (1 + 0.14 * lift)})`,
                transformOrigin: "50% 100%",
                opacity: Math.min(1, s * 1.5),
                zIndex: isFirst ? 10 : 7 - Math.abs(t),
                padding: "30px 16px 16px",
              }}
            >
              {/* number — always sharp */}
              <div
                style={{
                  position: "absolute",
                  top: -16,
                  left: -12,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: `color-mix(in srgb, ${c} 30%, white)`,
                  border: `2.5px solid ${c}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: brand.fontBold,
                  fontWeight: 900,
                  fontSize: 18,
                  color: brand.textPrimary,
                }}
              >
                {i + 1}
              </div>
              {/* content — blurred until revealed */}
              <div style={{ filter: `blur(${blur}px)`, opacity: blur > 1 ? 0.6 : 1 }}>
                <div
                  style={{
                    fontFamily: brand.fontScript,
                    fontWeight: 700,
                    fontSize: 27,
                    lineHeight: 1.05,
                    color: brand.textPrimary,
                    textDecoration: "underline",
                    textDecorationColor: c,
                    textDecorationThickness: 3,
                    textUnderlineOffset: 5,
                  }}
                >
                  {title}
                </div>
                <div style={{ marginTop: 16, height: 8, borderRadius: 6, background: "#EDE6DD", width: "90%" }} />
                <div style={{ marginTop: 9, height: 8, borderRadius: 6, background: "#EDE6DD", width: "65%" }} />
                <div style={{ marginTop: 9, height: 8, borderRadius: 6, background: `color-mix(in srgb, ${c} 40%, white)`, width: "45%" }} />
              </div>
            </div>
          );
        })}

        {/* "starting with #1" tag */}
        <div
          style={{
            position: "absolute",
            left: 330,
            top: 4,
            opacity: tagIn,
            transform: `translateX(${-12 * (1 - tagIn)}px)`,
            fontFamily: brand.fontScript,
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 38,
            color: brand.primary,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 34 }}>←</span> starting with #1
        </div>
      </div>
    </Background>
  );
};
