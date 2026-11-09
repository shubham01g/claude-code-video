import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { brand } from "../brand";

// Frosted-glass look for graphics that sit over live footage: the footage stays
// visible, blurred and dimmed, instead of being replaced by a solid background.

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

export const glassText = "#FFFFFF";
export const glassMuted = "rgba(255,255,255,0.62)";

// A glass panel / card. Spread into a style and add padding + radius.
export const glassCard: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))",
  border: "1.5px solid rgba(255,255,255,0.34)",
  boxShadow: "0 12px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.45)",
  backdropFilter: "blur(14px)",
};

// Full-frame glass sheet + a 1280×720 design wrapper scaled to the canvas.
export const GlassStage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        backdropFilter: "blur(26px) saturate(1.25)",
        background: "linear-gradient(160deg, rgba(20,18,22,0.50), rgba(60,30,12,0.42))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${width / DESIGN_WIDTH})`,
          transformOrigin: "center center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 80px",
          fontFamily: brand.fontSans,
          position: "relative",
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const GlassOverline: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      fontFamily: brand.fontSans,
      fontSize: 14,
      fontWeight: 700,
      color: "#FDBA74",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      textAlign: "center",
      marginBottom: 24,
    }}
  >
    {label}
  </div>
);

// "*word*" → Caveat orange emphasis.
export const Emphasis: React.FC<{ text: string; scale?: number }> = ({ text, scale = 1.22 }) => (
  <>
    {text.split(/(\*[^*]+\*)/g).map((part, i) =>
      part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
        <span
          key={i}
          style={{
            fontFamily: brand.fontScript,
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: `${scale}em`,
            color: brand.primary,
            paddingRight: "0.14em",
          }}
        >
          {part.slice(1, -1)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);
