import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { AbsoluteFill } from "remotion";
import { Overline } from "./shared";

export interface RoadmapStep {
  number: number;
  title: string;
  subtitle: string;
}

interface Props {
  overline?: string;
  steps: RoadmapStep[];
  activeStep?: number;
}

// One card — badge enters first via spring, then title+subtitle slide up
const StepCard: React.FC<{
  step: RoadmapStep;
  isActive: boolean;
  isGhost: boolean;
  entryFrame: number;
}> = ({ step, isActive, isGhost, entryFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const f = frame - entryFrame;

  // Card slides up + fades in
  const cardOpacity = interpolate(f, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardY       = interpolate(f, [0, 14], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardScale   = interpolate(f, [0, 14], [0.93, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Badge bounces in with spring, 4 frames after card starts
  const badgeSpring = spring({ frame: f - 4, fps, config: { damping: 10, stiffness: 180 }, durationInFrames: 20 });
  const badgeScale  = Math.max(0, badgeSpring);

  // Title fades up 8 frames after card
  const titleOpacity = interpolate(f, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY       = interpolate(f, [8, 20], [8, 0],  { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtitle fades 12 frames after card
  const subOpacity = interpolate(f, [12, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Active card: badge glow pulses after everything is revealed
  const pulseStart = 16;
  const glowPulse = isActive && f > pulseStart
    ? 0.15 + 0.08 * Math.sin(((f - pulseStart) / 30) * Math.PI * 2)
    : 0.15;

  return (
    <div
      style={{
        flex: 1,
        opacity: isGhost ? cardOpacity * 0.38 : cardOpacity,
        transform: `scale(${isActive ? cardScale * 1.04 : cardScale}) translateY(${cardY}px)`,
        background: brand.cardBg,
        border: isActive ? `2px solid ${brand.primary}` : brand.cardBorder,
        borderRadius: brand.borderRadius,
        boxShadow: isActive
          ? `0 12px 32px rgba(0,0,0,0.10), 0 0 0 4px rgba(249,115,22,${glowPulse})`
          : brand.cardShadow,
        padding: "24px 22px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minWidth: 0,
      }}
    >
      {/* Badge — spring bounce */}
      <div
        style={{
          transform: `scale(${badgeScale})`,
          transformOrigin: "center center",
          width: 52,
          height: 52,
          borderRadius: 14,
          background: isActive
            ? brand.badgeGradient
            : "rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 900,
          color: isActive ? "#fff" : brand.textMuted,
          fontFamily: brand.fontBold,
          boxShadow: isActive ? "inset 0 -2px 8px rgba(0,0,0,0.18)" : "none",
        }}
      >
        {step.number}
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 20,
          fontWeight: 700,
          color: brand.textPrimary,
          fontFamily: brand.fontBold,
          lineHeight: 1.25,
        }}
      >
        {step.title}
      </div>

      {/* Subtitle — Caveat italic orange on active, muted gray on ghost */}
      <div
        style={{
          opacity: subOpacity,
          fontSize: isActive ? 17 : 15,
          fontFamily: isActive ? brand.fontScript : brand.fontSans,
          fontStyle: isActive ? "italic" : "normal",
          fontWeight: isActive ? 600 : 400,
          color: isActive ? brand.primary : brand.textMuted,
          lineHeight: 1.35,
        }}
      >
        {step.subtitle}
      </div>
    </div>
  );
};

export const RoadmapCard: React.FC<Props> = ({
  overline = "YOUR ROADMAP",
  steps,
  activeStep = 1,
}) => {
  const frame = useCurrentFrame();

  // Frame stagger between cards — 30 frames (1 second) each so the reveal is clearly visible
  const CARD_STAGGER = 30;

  // Orange border frame fades in first
  const frameOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const overlineOpacity = interpolate(frame, [4, 16], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: brand.backgroundGradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Scaled design wrapper */}
      <div
        style={{
          width: 1280,
          height: 720,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${1920 / 1280})`,
          transformOrigin: "center center",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {/* Orange border frame — wraps the entire roadmap layout */}
        <div
          style={{
            opacity: frameOpacity,
            border: `3px solid ${brand.primary}`,
            borderRadius: 28,
            padding: "40px 48px 44px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 32,
            width: "88%",
          }}
        >
          {/* Overline */}
          <div style={{ opacity: overlineOpacity }}>
            <Overline label={overline} />
          </div>

          {/* Cards row */}
          <div style={{ display: "flex", alignItems: "stretch", gap: 0, width: "100%" }}>
            {steps.map((step, i) => {
              const isActive = step.number === activeStep;
              const isGhost  = step.number > activeStep;
              const entryFrame = 8 + i * CARD_STAGGER;

              return (
                <React.Fragment key={step.number}>
                  <StepCard
                    step={step}
                    isActive={isActive}
                    isGhost={isGhost}
                    entryFrame={entryFrame}
                  />

                  {/* Arrow between cards */}
                  {i < steps.length - 1 && (() => {
                    const arrowFrame = entryFrame + 18;
                    const arrowOpacity = interpolate(frame, [arrowFrame, arrowFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                    const arrowScale  = interpolate(frame, [arrowFrame, arrowFrame + 10], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                    return (
                      <div
                        style={{
                          opacity: arrowOpacity,
                          transform: `scale(${arrowScale})`,
                          fontSize: 22,
                          color: brand.textMuted,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 14px",
                          flexShrink: 0,
                          fontWeight: 300,
                        }}
                      >
                        →
                      </div>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Bottom dash */}
        <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: frameOpacity }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: brand.textMuted, opacity: 0.35 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
