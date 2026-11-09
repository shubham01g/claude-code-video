import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { brand } from "../brand";
import { Background, Overline } from "./shared";

interface Props {
  overline?: string;
  // Mark emphasis/script words with *asterisks* → renders Caveat italic orange
  // Mark strikethrough words with ~tildes~ → renders with a line through them
  topLine?: string;
  value: string;
  bottomLine?: string;
  strikethrough?: boolean; // draws a line across the big number
}

// Parses a line into segments: plain | *script* | ~strike~
function MixedLine({ text, baseFontSize = 36 }: { text: string; baseFontSize?: number }) {
  type Seg = { text: string; type: "plain" | "script" | "strike" };
  const segs: Seg[] = [];
  const regex = /(\*[^*]+\*|~[^~]+~)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index), type: "plain" });
    const inner = m[0].slice(1, -1);
    segs.push({ text: inner, type: m[0][0] === "*" ? "script" : "strike" });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ text: text.slice(last), type: "plain" });

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "center", gap: "0.2em" }}>
      {segs.map((seg, i) => {
        if (seg.type === "script") {
          return (
            <span key={i} style={{ fontFamily: brand.fontScript, fontStyle: "italic", fontSize: baseFontSize * 1.2, fontWeight: 600, color: brand.primary }}>
              {seg.text}
            </span>
          );
        }
        if (seg.type === "strike") {
          return (
            <span key={i} style={{ fontFamily: brand.fontScript, fontStyle: "italic", fontSize: baseFontSize * 1.2, fontWeight: 600, color: brand.primary, textDecoration: "line-through", textDecorationColor: brand.textPrimary, textDecorationThickness: 3 }}>
              {seg.text}
            </span>
          );
        }
        return (
          <span key={i} style={{ fontFamily: brand.fontSans, fontSize: baseFontSize, fontWeight: 500, color: brand.textPrimary }}>
            {seg.text}
          </span>
        );
      })}
    </div>
  );
}

export const StatCallout: React.FC<Props> = ({
  overline = "THE NUMBER",
  topLine,
  value,
  bottomLine,
  strikethrough = false,
}) => {
  const frame = useCurrentFrame();

  // Parse numeric for count-up
  const numStr = value.replace(/[^0-9.]/g, "");
  const numeric = parseFloat(numStr);
  const prefix = value.replace(/[0-9.,].*$/, "");
  const suffix = value.replace(/^[^0-9]*[0-9.,]+/, "");

  const countProgress = interpolate(frame, [0, 50], [0, 1], { extrapolateRight: "clamp" });
  const displayNum = isNaN(numeric)
    ? value
    : `${prefix}${Math.round(numeric * countProgress).toLocaleString()}${suffix}`;

  // Entry animation
  const opacity = interpolate(frame, [0, brand.enterFrames], [0, 1], { extrapolateRight: "clamp" });
  const scale  = interpolate(frame, [0, brand.enterFrames], [0.88, 1], { extrapolateRight: "clamp" });
  const y      = interpolate(frame, [0, brand.enterFrames], [20, 0], { extrapolateRight: "clamp" });

  // Strikethrough line draws left→right after the count-up finishes
  const strikeW = strikethrough
    ? interpolate(frame, [55, 85], [0, 108], { extrapolateRight: "clamp" })
    : 0;

  return (
    <Background>
      <Overline label={overline} />

      <div
        style={{
          opacity,
          transform: `scale(${scale}) translateY(${y}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          textAlign: "center",
        }}
      >
        {/* Top line — mixed fonts */}
        {topLine && <MixedLine text={topLine} baseFontSize={38} />}

        {/* Hero number */}
        <div style={{ position: "relative", display: "inline-block", lineHeight: 1 }}>
          <span
            style={{
              fontSize: 148,
              fontWeight: 900,
              fontFamily: brand.fontBold,
              color: brand.primary,
              letterSpacing: "-3px",
              lineHeight: 1,
              display: "block",
            }}
          >
            {displayNum}
          </span>

          {/* Animated strikethrough across the number */}
          {strikethrough && (
            <div
              style={{
                position: "absolute",
                top: "52%",
                left: "-4%",
                width: `${strikeW}%`,
                height: 7,
                background: brand.textPrimary,
                borderRadius: 4,
                transform: "rotate(-5deg)",
                transformOrigin: "left center",
              }}
            />
          )}
        </div>

        {/* Bottom line — mixed fonts */}
        {bottomLine && <MixedLine text={bottomLine} baseFontSize={36} />}
      </div>
    </Background>
  );
};
