import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { brand } from "../brand";

// YouTube thumbnail, 1280×720 (Shubham's comparison style, approved 2026-10-16):
// glowing logo tile + huge title on top, 2–6 glowing portrait panels below, each with
// a dark label pill. Every panel is cropped around its subject so the subject sits in
// the same place in all panels — same height, centred, feet on the same line.
//
// Render:
//   npx remotion still src/index.ts PanelThumbnail out.png \
//     --props=<project>/thumbnail/thumbnail.json --public-dir=<project>/thumbnail/assets

export type ThumbPanel = {
  label: string;
  src: string; // file in the public dir (thumbnail/assets)
  cx: number; // subject centre x, in source pixels
  feet: number; // subject's lowest point (feet / wheels) y, in source pixels
  subjectH: number; // subject height (head → feet), in source pixels
  glow?: number; // 0–1, rises left → right so the best panel glows most
};

export type PanelThumbnailProps = {
  title: string;
  logo?: string; // square logo tile in the public dir, e.g. "claude.png"
  panels: ThumbPanel[];
  srcW: number; // pixel size of the panel source frames
  srcH: number;
  subjectShare?: number; // subject height as a share of panel height (raise it if a frame doesn't cover its panel)
  feetAt?: number; // feet line as a share of panel height (the label covers the bottom)
};

const ORANGE = brand.primary;

const cropStyle = (p: ThumbPanel, props: PanelThumbnailProps, panelW: number, panelH: number): React.CSSProperties => {
  const scale = Math.max((panelH * (props.subjectShare ?? 0.39)) / p.subjectH, panelW / props.srcW, panelH / props.srcH);
  const left = panelW / 2 - p.cx * scale;
  const top = panelH * (props.feetAt ?? 0.78) - p.feet * scale;
  return {
    position: "absolute",
    width: props.srcW * scale,
    height: props.srcH * scale,
    left: Math.min(0, Math.max(panelW - props.srcW * scale, left)),
    top: Math.min(0, Math.max(panelH - props.srcH * scale, top)),
    maxWidth: "none",
  };
};

export const PanelThumbnail: React.FC<PanelThumbnailProps> = (props) => {
  const { title, logo, panels } = props;
  const gap = panels.length > 4 ? 14 : 20;
  const side = 34;
  const panelW = (1280 - side * 2 - gap * (panels.length - 1)) / panels.length;
  const panelTop = 200;
  const panelH = 420;
  const labelSize = panels.length > 4 ? 40 : 58;

  return (
    <AbsoluteFill style={{ background: "#0B0A0C", overflow: "hidden", fontFamily: brand.fontHeading }}>
      {/* warm light streaks + glow behind the title */}
      <AbsoluteFill
        style={{
          background: [
            "radial-gradient(ellipse 55% 38% at 50% 12%, rgba(249,115,22,0.45), rgba(249,115,22,0) 70%)",
            "radial-gradient(ellipse 70% 40% at 50% 100%, rgba(249,115,22,0.30), rgba(249,115,22,0) 70%)",
            "linear-gradient(115deg, rgba(249,115,22,0) 38%, rgba(253,186,116,0.10) 40%, rgba(249,115,22,0) 43%)",
            "linear-gradient(65deg, rgba(249,115,22,0) 57%, rgba(253,186,116,0.10) 59%, rgba(249,115,22,0) 62%)",
          ].join(","),
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 26,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
        }}
      >
        {logo ? (
          <div
            style={{
              width: 150,
              height: 150,
              borderRadius: 34,
              background: `linear-gradient(145deg, #FB8A3C, ${ORANGE} 55%, #D9561A)`,
              boxShadow: "0 0 50px rgba(249,115,22,0.75), 0 0 0 3px rgba(255,200,150,0.55) inset",
              flexShrink: 0,
            }}
          >
            <Img
              src={staticFile(logo)}
              style={{ width: 150, height: 150, borderRadius: 34, filter: "saturate(1.7) brightness(1.12) contrast(1.1)" }}
            />
          </div>
        ) : null}
        <div
          style={{
            fontWeight: 900,
            fontSize: title.length > 10 ? 120 : 150,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: "#FFF6EC",
            textShadow: "0 0 34px rgba(249,115,22,0.55), 0 8px 0 rgba(0,0,0,0.35)",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
      </div>

      {panels.map((p, i) => {
        const left = side + i * (panelW + gap);
        const glow = p.glow ?? 0.55 + (0.45 * i) / Math.max(panels.length - 1, 1);
        return (
          <React.Fragment key={p.label}>
            <div
              style={{
                position: "absolute",
                left,
                top: panelTop,
                width: panelW,
                height: panelH,
                borderRadius: 20,
                overflow: "hidden",
                border: `3px solid rgba(253,186,116,${0.6 + glow * 0.4})`,
                boxShadow: `0 0 ${18 + glow * 26}px rgba(249,115,22,${0.35 + glow * 0.45})`,
              }}
            >
              <Img src={staticFile(p.src)} style={cropStyle(p, props, panelW, panelH)} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.55) 100%)" }} />
            </div>
            <div
              style={{
                position: "absolute",
                left: left + 14,
                width: panelW - 28,
                top: panelTop + panelH - 44,
                height: 92,
                borderRadius: 22,
                background: "linear-gradient(180deg, #1E1410, #0E0A08)",
                border: `3px solid rgba(253,186,116,${0.7 + glow * 0.3})`,
                boxShadow: `0 0 ${16 + glow * 20}px rgba(249,115,22,${0.45 + glow * 0.4})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: labelSize,
                letterSpacing: "-0.01em",
                color: "#FFFFFF",
              }}
            >
              {p.label}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

export const panelThumbnailDefaults: PanelThumbnailProps = {
  title: "Opus 5.5",
  logo: "claude.png",
  srcW: 1430,
  srcH: 860,
  subjectShare: 0.39,
  feetAt: 0.78,
  panels: [
    { label: "Low", src: "low_g.jpg", cx: 968, feet: 626, subjectH: 328, glow: 0.55 },
    { label: "High", src: "high_g.jpg", cx: 804, feet: 626, subjectH: 283, glow: 0.7 },
    { label: "Extra", src: "extra_g.jpg", cx: 879, feet: 626, subjectH: 254, glow: 0.85 },
    { label: "Max", src: "max_g.jpg", cx: 834, feet: 640, subjectH: 253, glow: 1 },
  ],
};
