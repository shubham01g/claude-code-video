import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand";
import { Background, Overline } from "../../components/shared";

// Scene 3 — Hook (0:14–0:21)
// "It can edit Instagram Reels, YouTube Shorts, intro videos, etc. Claude can do everything for you."
// One screen per format pops in on its word (two phones, one widescreen); the caption
// pill lands on "Claude can do everything for you".
const CAPTION_AT = 133;

const screens = [
  { label: "Instagram Reels", ratio: "9:16", wide: false, at: 24 },
  { label: "YouTube Shorts", ratio: "9:16", wide: false, at: 60 },
  { label: "Intro videos", ratio: "16:9", wide: true, at: 88 },
];

export const Scene3_EveryFormat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const caption = spring({ frame: frame - CAPTION_AT, fps, config: { damping: 11, stiffness: 170 } });

  return (
    <Background>
      <Overline label="REELS · SHORTS · INTROS" />

      <div style={{ display: "flex", alignItems: "flex-end", gap: 56, marginBottom: 36 }}>
        {screens.map((sc, i) => {
          const s = spring({ frame: frame - sc.at, fps, config: { damping: 10, stiffness: 170 } });
          const play = spring({ frame: frame - sc.at - 6, fps, config: { damping: 9, stiffness: 200 } });
          const progress = interpolate(frame - sc.at, [0, 110], [6, 92], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const next = screens[i + 1]?.at ?? CAPTION_AT;
          const active = (frame >= sc.at && frame < next) || frame >= CAPTION_AT;
          const w = sc.wide ? 440 : 178;
          const h = sc.wide ? 248 : 316;
          return (
            <div
              key={sc.label}
              style={{
                opacity: frame < sc.at ? 0 : Math.min(1, s * 1.5),
                transform: `translateY(${(1 - s) * 70}px) scale(${0.6 + 0.4 * s}) rotate(${(1 - s) * (i === 1 ? 6 : -6)}deg)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              {/* device */}
              <div
                style={{
                  width: w,
                  height: h,
                  padding: 9,
                  borderRadius: sc.wide ? 24 : 32,
                  background: brand.cardBg,
                  border: active ? brand.activeBorder : brand.cardBorder,
                  boxShadow: active ? `${brand.activeGlow}, ${brand.cardShadow}` : brand.cardShadow,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: sc.wide ? 16 : 24,
                    background: `linear-gradient(160deg, #FDBA74, ${brand.primary} 55%, ${brand.secondary})`,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* play button */}
                  <div
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 31,
                      background: "#FFFFFF",
                      transform: `scale(${play})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 8px 22px rgba(0,0,0,0.18)",
                    }}
                  >
                    <div
                      style={{
                        marginLeft: 5,
                        width: 0,
                        height: 0,
                        borderTop: "12px solid transparent",
                        borderBottom: "12px solid transparent",
                        borderLeft: `20px solid ${brand.primary}`,
                      }}
                    />
                  </div>
                  {/* ratio tag */}
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      background: "rgba(255,255,255,0.92)",
                      borderRadius: 999,
                      padding: "3px 11px",
                      fontFamily: brand.fontBold,
                      fontWeight: 800,
                      fontSize: 13,
                      color: brand.secondary,
                    }}
                  >
                    {sc.ratio}
                  </div>
                  {/* vertical formats get the side action dots */}
                  {!sc.wide ? (
                    <div style={{ position: "absolute", right: 12, bottom: 44, display: "flex", flexDirection: "column", gap: 9 }}>
                      {[0, 1, 2].map((d) => (
                        <div key={d} style={{ width: 20, height: 20, borderRadius: 10, background: "rgba(255,255,255,0.75)" }} />
                      ))}
                    </div>
                  ) : null}
                  {/* progress bar */}
                  <div
                    style={{
                      position: "absolute",
                      left: 14,
                      right: 14,
                      bottom: 14,
                      height: 6,
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.4)",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ width: `${progress}%`, height: "100%", background: "#FFFFFF" }} />
                  </div>
                </div>
              </div>
              <div style={{ fontFamily: brand.fontBold, fontWeight: 800, fontSize: 26, color: brand.textPrimary }}>{sc.label}</div>
            </div>
          );
        })}
      </div>

      {/* caption pill */}
      <div
        style={{
          opacity: Math.min(1, caption * 1.5),
          transform: `scale(${0.8 + 0.2 * caption}) translateY(${(1 - caption) * 14}px)`,
          background: brand.cardBg,
          border: brand.activeBorder,
          boxShadow: `${brand.activeGlow}, ${brand.cardShadow}`,
          borderRadius: 999,
          padding: "12px 38px 14px",
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          fontFamily: brand.fontBold,
          fontWeight: 800,
          fontSize: 32,
          color: brand.textPrimary,
        }}
      >
        <span>Claude can do</span>
        <span
          style={{
            fontFamily: brand.fontScript,
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 46,
            color: brand.primary,
            paddingRight: "0.14em",
          }}
        >
          everything
        </span>
        <span>for you</span>
      </div>
    </Background>
  );
};
