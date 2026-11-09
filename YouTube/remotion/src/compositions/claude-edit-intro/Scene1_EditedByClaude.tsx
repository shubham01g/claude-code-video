import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand";
import { Background, Overline } from "../../components/shared";

// Scene 1 — Hook (0:00–0:04)
// "This entire video that you're going to see is edited by Claude."
// An editing timeline assembles itself clip by clip while the playhead sweeps the full
// 25:00; the Claude logo and "Edited by Claude" stamp in on "edited by Claude" (~2.6s).
const TRACK_W = 860;
const STAMP_AT = 76;

// [start, width] as fractions of the track
const tracks: { label: string; kind: "fx" | "video" | "text" | "audio"; clips: [number, number][] }[] = [
  { label: "Motion graphics", kind: "fx", clips: [[0.06, 0.13], [0.3, 0.1], [0.52, 0.16], [0.8, 0.12]] },
  { label: "Video", kind: "video", clips: [[0, 0.22], [0.23, 0.2], [0.44, 0.27], [0.72, 0.28]] },
  { label: "Text + captions", kind: "text", clips: [[0.02, 0.09], [0.16, 0.07], [0.36, 0.12], [0.6, 0.08], [0.86, 0.1]] },
  { label: "Audio", kind: "audio", clips: [[0, 1]] },
];

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export const Scene1_EditedByClaude: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardIn = interpolate(frame, [0, brand.enterFrames], [0, 1], { extrapolateRight: "clamp" });
  const sweep = interpolate(frame, [8, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stamp = spring({ frame: frame - STAMP_AT, fps, config: { damping: 10, stiffness: 170 } });
  const logoSpin = spring({ frame: frame - STAMP_AT, fps, config: { damping: 12, stiffness: 120 } });
  const pulse = 0.5 + 0.5 * Math.sin(frame / 6);

  return (
    <Background>
      <Overline label="THIS ENTIRE VIDEO · START TO FINISH" />

      {/* Headline: logo + "Edited by Claude" */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          marginBottom: 30,
          opacity: Math.min(1, stamp * 1.6),
          transform: `scale(${0.7 + 0.3 * stamp})`,
        }}
      >
        <Img
          src={staticFile("claude.png")}
          style={{
            width: 84,
            height: 84,
            borderRadius: 20,
            transform: `rotate(${(1 - logoSpin) * -160}deg)`,
            boxShadow: `0 0 0 ${6 + 8 * pulse}px rgba(249,115,22,${0.1 + 0.1 * pulse}), 0 12px 30px rgba(232,98,42,0.3)`,
          }}
        />
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontFamily: brand.fontBold, fontWeight: 900, fontSize: 64, letterSpacing: "-2px", color: brand.textPrimary }}>
            Edited by
          </span>
          <span
            style={{
              fontFamily: brand.fontScript,
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: 86,
              color: brand.primary,
              paddingRight: "0.14em",
            }}
          >
            Claude
          </span>
        </div>
      </div>

      {/* Timeline card */}
      <div
        style={{
          opacity: cardIn,
          transform: `scale(${0.93 + 0.07 * cardIn}) translateY(${18 * (1 - cardIn)}px)`,
          width: 1080,
          background: brand.cardBg,
          border: brand.cardBorder,
          borderRadius: brand.borderRadius * 1.3,
          boxShadow: brand.cardShadow,
          padding: "22px 28px 26px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: brand.fontBold, fontWeight: 800, fontSize: 20, color: brand.textPrimary }}>Timeline</div>
          <div
            style={{
              fontFamily: brand.fontBold,
              fontWeight: 800,
              fontSize: 20,
              color: brand.primary,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {clock(sweep * 1500)} <span style={{ color: brand.textMuted }}>/ 25:00</span>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          {tracks.map((track, r) => (
            <div key={track.label} style={{ display: "flex", alignItems: "center", height: 50, marginBottom: r < tracks.length - 1 ? 10 : 0 }}>
              <div style={{ width: 164, fontFamily: brand.fontSans, fontWeight: 600, fontSize: 15, color: brand.textMuted }}>
                {track.label}
              </div>
              <div style={{ position: "relative", width: TRACK_W, height: 50, borderRadius: 12, background: "rgba(0,0,0,0.035)" }}>
                {track.clips.map(([start, width], c) => {
                  // each clip drops in just before the playhead reaches it
                  const at = 8 + start * 100 - 6;
                  const s = spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 190 } });
                  const passed = sweep >= start;
                  return (
                    <div
                      key={c}
                      style={{
                        position: "absolute",
                        left: start * TRACK_W + 2,
                        width: width * TRACK_W - 4,
                        top: 5,
                        height: 40,
                        borderRadius: 10,
                        opacity: Math.min(1, s * 1.5),
                        transform: `scaleY(${s})`,
                        overflow: "hidden",
                        background:
                          track.kind === "fx"
                            ? brand.badgeGradient
                            : track.kind === "text"
                              ? "rgba(249,115,22,0.22)"
                              : track.kind === "video"
                                ? passed
                                  ? "rgba(28,28,30,0.82)"
                                  : "rgba(28,28,30,0.22)"
                                : "rgba(0,0,0,0.05)",
                        border: track.kind === "text" ? `1.5px solid ${brand.primary}` : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        padding: track.kind === "audio" ? "0 6px" : 0,
                      }}
                    >
                      {track.kind === "audio"
                        ? Array.from({ length: 120 }, (_, i) => {
                            const h = 6 + 26 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.37));
                            return (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  height: h,
                                  borderRadius: 2,
                                  background: i / 120 <= sweep ? brand.primary : "rgba(0,0,0,0.16)",
                                }}
                              />
                            );
                          })
                        : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Playhead */}
          <div
            style={{
              position: "absolute",
              left: 164 + sweep * TRACK_W - 2,
              top: -8,
              bottom: -8,
              width: 4,
              borderRadius: 2,
              background: brand.primary,
              boxShadow: `0 0 14px rgba(249,115,22,0.6)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: -7,
                top: -8,
                width: 18,
                height: 18,
                borderRadius: 5,
                background: brand.primary,
              }}
            />
          </div>
        </div>
      </div>
    </Background>
  );
};
