import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Emphasis, glassCard, glassMuted, glassText } from "./glass";

interface Props {
  overline?: string;
  title?: string; // supports *word*
  stamp?: string; // rubber-stamp label that slams in at `stampAt`
  stampAt?: number; // seconds into the scene
  chipLabel?: string; // label of the scrambling chip
  levels?: string[]; // values the chip shuffles through before it locks on "???"
  chipAt?: number; // seconds into the scene the chip starts shuffling
  keepClear?: [number, number, number, number]; // x, y, w, h (1920 px) left undimmed, e.g. the face-cam box
}

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

// Overlay for a screen that's been blurred to keep the result a secret: a lock
// drops shut on a glass card, an optional stamp slams in, and a chip shuffles
// through the effort levels before locking on "???". No backdrop blur of its
// own — the footage underneath is already blurred, and the face cam stays sharp.
export const MysteryReveal: React.FC<Props> = ({
  overline = "THE END RESULT",
  title = "Revealed at the *end*",
  stamp = "1 PROMPT",
  stampAt,
  chipLabel = "EFFORT LEVEL",
  levels = ["LOW", "MEDIUM", "HIGH", "EXTRA", "MAX"],
  chipAt,
  keepClear,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  const k = width / 1920;

  const cardIn = spring({ frame, fps, config: { damping: 13, stiffness: 150 } });
  // shackle drops shut a beat after the card lands
  const shut = spring({ frame: frame - Math.round(0.45 * fps), fps, config: { damping: 8, stiffness: 220 } });
  const shake = shut > 0.9 ? Math.sin((t - 0.45) * 60) * Math.max(0, 1 - (t - 0.6) * 4) * 4 : 0;

  const stampS = stampAt !== undefined ? spring({ frame: frame - Math.round(stampAt * fps), fps, config: { damping: 10, stiffness: 240 } }) : 0;
  const stampOn = stampAt !== undefined && t >= stampAt;

  // chip: shuffle fast, slow down, land on ???
  let chipValue = "???";
  let chipHot = false;
  if (chipAt !== undefined && t >= chipAt && t < chipAt + 1.6) {
    const local = t - chipAt;
    const step = Math.floor(Math.pow(local, 0.7) * 9);
    chipValue = levels[step % levels.length];
    chipHot = true;
  }
  const chipLand = chipAt !== undefined && t >= chipAt + 1.6 ? spring({ frame: frame - Math.round((chipAt + 1.6) * fps), fps, config: { damping: 9, stiffness: 200 } }) : 1;

  const marks = [
    { x: 150, y: 130, s: 64, d: 0 },
    { x: 1090, y: 110, s: 48, d: 0.8 },
    { x: 130, y: 500, s: 44, d: 1.6 },
    { x: 1110, y: 330, s: 56, d: 2.3 },
  ];

  return (
    <AbsoluteFill>
      {/* soft vignette so the card reads on any screen, face cam left clear */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 60% 55% at 50% 48%, rgba(0,0,0,0.38), rgba(0,0,0,0.12) 70%, rgba(0,0,0,0) 100%)",
          opacity: interpolate(t, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
          clipPath: keepClear
            ? `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${keepClear[0] * k}px ${keepClear[1] * k}px, ${keepClear[0] * k}px ${(keepClear[1] + keepClear[3]) * k}px, ${(keepClear[0] + keepClear[2]) * k}px ${(keepClear[1] + keepClear[3]) * k}px, ${(keepClear[0] + keepClear[2]) * k}px ${keepClear[1] * k}px, ${keepClear[0] * k}px ${keepClear[1] * k}px)`
            : undefined,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: DESIGN_WIDTH,
            height: DESIGN_HEIGHT,
            transform: `scale(${width / DESIGN_WIDTH})`,
            position: "relative",
            flexShrink: 0,
            fontFamily: brand.fontSans,
          }}
        >
          {marks.map((m) => {
            const o = interpolate(t, [0.3 + m.d * 0.25, 0.7 + m.d * 0.25], [0, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={m.x}
                style={{
                  position: "absolute",
                  left: m.x,
                  top: m.y + Math.sin(t * 1.8 + m.d) * 10,
                  fontFamily: brand.fontBold,
                  fontWeight: 900,
                  fontSize: m.s,
                  color: "#FDBA74",
                  opacity: o,
                  transform: `rotate(${Math.sin(t + m.d) * 12}deg)`,
                  textShadow: "0 6px 24px rgba(0,0,0,0.45)",
                }}
              >
                ?
              </div>
            );
          })}

          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "48%",
              transform: `translate(-50%, -50%) translateX(${shake}px) scale(${interpolate(cardIn, [0, 1], [0.86, 1])})`,
              opacity: interpolate(cardIn, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
              ...glassCard,
              background: "linear-gradient(135deg, rgba(30,24,28,0.55), rgba(60,30,12,0.45))",
              borderRadius: 36,
              padding: "36px 64px 34px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 560,
            }}
          >
            {/* lock */}
            <div style={{ position: "relative", width: 92, height: 104, marginBottom: 18 }}>
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  width: 56,
                  height: 62,
                  top: interpolate(shut, [0, 1], [-18, 0]),
                  border: "10px solid #FDBA74",
                  borderBottom: "none",
                  borderRadius: "34px 34px 0 0",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  width: 92,
                  height: 64,
                  borderRadius: 18,
                  background: `linear-gradient(135deg, #FDBA74, ${brand.primary})`,
                  boxShadow: `0 0 ${18 + (shut > 0.9 ? 22 * Math.max(0, 1 - (t - 0.6) * 2) : 0)}px rgba(249,115,22,0.6)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ width: 14, height: 24, borderRadius: 7, background: "rgba(40,20,8,0.75)" }} />
              </div>
            </div>

            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#FDBA74",
                letterSpacing: "0.2em",
                marginBottom: 10,
              }}
            >
              {overline}
            </div>
            <div
              style={{
                fontFamily: brand.fontBold,
                fontWeight: 900,
                fontSize: 60,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: glassText,
                textShadow: "0 4px 24px rgba(0,0,0,0.35)",
                marginBottom: chipAt !== undefined ? 24 : 0,
                whiteSpace: "nowrap",
              }}
            >
              <Emphasis text={title} scale={1.25} />
            </div>

            {chipAt !== undefined ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  borderRadius: 999,
                  padding: "10px 12px 10px 22px",
                  background: "rgba(255,255,255,0.10)",
                  border: `1.5px solid ${chipHot ? "rgba(253,186,116,0.9)" : "rgba(255,255,255,0.3)"}`,
                  opacity: interpolate(t, [Math.max(chipAt - 0.25, 0), chipAt], [0.45, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.16em", color: glassMuted }}>{chipLabel}</div>
                <div
                  style={{
                    minWidth: 150,
                    textAlign: "center",
                    borderRadius: 999,
                    padding: "6px 18px",
                    fontFamily: brand.fontBold,
                    fontWeight: 900,
                    fontSize: 24,
                    letterSpacing: "0.12em",
                    color: chipHot ? "#1C1C1E" : "#FFFFFF",
                    background: chipHot ? "#FDBA74" : `linear-gradient(135deg, #FDBA74, ${brand.primary})`,
                    transform: `scale(${chipHot ? 1 : interpolate(chipLand, [0, 1], [1.25, 1])})`,
                  }}
                >
                  {chipValue}
                </div>
              </div>
            ) : null}
          </div>

          {stampOn ? (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "48%",
                transform: `translate(150px, -205px) rotate(-12deg) scale(${interpolate(stampS, [0, 1], [2.2, 1])})`,
                opacity: interpolate(stampS, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
                border: `5px solid ${brand.primary}`,
                borderRadius: 14,
                padding: "8px 22px",
                fontFamily: brand.fontBold,
                fontWeight: 900,
                fontSize: 38,
                letterSpacing: "0.1em",
                color: "#FFFFFF",
                background: "rgba(249,115,22,0.85)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              }}
            >
              {stamp}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
