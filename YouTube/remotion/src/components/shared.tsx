import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { brand } from "../brand";

// Design reference width — all px values are authored at this width, then scaled
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

// Hook: returns a scale factor so components always fill the actual canvas
export function useScale() {
  const { width } = useVideoConfig();
  return width / DESIGN_WIDTH;
}

// Small-caps overline label above every graphic — e.g. "REAL EDITORS · REAL MONEY"
export const Overline: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      fontFamily: brand.fontSans,
      fontSize: 13,
      fontWeight: 600,
      color: brand.primary,
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      textAlign: "center",
      marginBottom: 32,
    }}
  >
    {label}
  </div>
);

// Bottom center dash — visual anchor on every frame
export const BottomDash: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 44,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      pointerEvents: "none",
    }}
  >
    <div
      style={{
        width: 36,
        height: 3,
        borderRadius: 2,
        background: brand.textMuted,
        opacity: 0.35,
      }}
    />
  </div>
);

// Orange gradient badge — step numbers, icon holders
export const IconBadge: React.FC<{
  children: React.ReactNode;
  size?: number;
  active?: boolean;
}> = ({ children, size = 56, active = true }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.36),
      background: active ? brand.badgeGradient : "rgba(0,0,0,0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: Math.round(size * 0.44),
      fontWeight: 900,
      color: active ? "#fff" : brand.textMuted,
      fontFamily: brand.fontBold,
      flexShrink: 0,
      boxShadow: active ? "inset 0 -2px 8px rgba(0,0,0,0.18)" : "none",
    }}
  >
    {children}
  </div>
);

// Full-frame background — warm cream + top-right orange glow, scaled content
export const Background: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scale = useScale();

  return (
    <AbsoluteFill
      style={{
        // Solid cream base under the glow — the glow is semi-transparent and VP8 has no alpha,
        // so without a base it gets flattened onto black (muddy brown centre).
        background: `${brand.backgroundGradient}, ${brand.background}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Scaled content wrapper — design at 1280×720, renders at any canvas size */}
      <div
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 80px",
          fontFamily: brand.fontSans,
          position: "relative",
          flexShrink: 0,
        }}
      >
        {children}
        <BottomDash />
      </div>
    </AbsoluteFill>
  );
};
