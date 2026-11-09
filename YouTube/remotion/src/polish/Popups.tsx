import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../brand";
import { BarChart } from "../components/BarChart";
import { ChapterCard } from "../components/ChapterCard";
import { ChatThread } from "../components/ChatThread";
import { ClaudeRank } from "../components/ClaudeRank";
import { FloatingText } from "../components/FloatingText";
import { FormatCards } from "../components/FormatCards";
import { glassCard } from "../components/glass";
import { GlassList } from "../components/GlassList";
import { GlassStat } from "../components/GlassStat";
import { GlassTitle } from "../components/GlassTitle";
import { HookTitle } from "../components/HookTitle";
import { MysteryReveal } from "../components/MysteryReveal";
import { NodeDiagram } from "../components/NodeDiagram";
import { OpusEffort } from "../components/OpusEffort";
import { OutroCTA } from "../components/OutroCTA";
import { PromptFanout } from "../components/PromptFanout";
import { QuoteOverlay } from "../components/QuoteOverlay";
import { RoadmapCard } from "../components/RoadmapCard";
import { StackedCards } from "../components/StackedCards";
import { StatCallout } from "../components/StatCallout";
import { TwoPanel } from "../components/TwoPanel";
import type { Anchor, Popup } from "./types";

// Popups are authored at 1920 wide and scaled to the actual canvas.
const DESIGN_WIDTH = 1920;
const MARGIN = 90;
const EXIT_FRAMES = 8;

// Full-frame motion graphics that can cut in over the footage (type: "scene").
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SCENES: Record<string, React.FC<any>> = {
  BarChart,
  ChapterCard,
  ChatThread,
  ClaudeRank,
  FloatingText,
  FormatCards,
  GlassList,
  GlassStat,
  GlassTitle,
  HookTitle,
  MysteryReveal,
  NodeDiagram,
  OpusEffort,
  OutroCTA,
  PromptFanout,
  QuoteOverlay,
  RoadmapCard,
  StackedCards,
  StatCallout,
  TwoPanel,
};

const ANCHOR_STYLE: Record<Anchor, React.CSSProperties> = {
  "top-left": { justifyContent: "flex-start", alignItems: "flex-start" },
  top: { justifyContent: "center", alignItems: "flex-start" },
  "top-right": { justifyContent: "flex-end", alignItems: "flex-start" },
  left: { justifyContent: "flex-start", alignItems: "center" },
  center: { justifyContent: "center", alignItems: "center" },
  right: { justifyContent: "flex-end", alignItems: "center" },
  "bottom-left": { justifyContent: "flex-start", alignItems: "flex-end" },
  bottom: { justifyContent: "center", alignItems: "flex-end" },
  "bottom-right": { justifyContent: "flex-end", alignItems: "flex-end" },
};

// Direction a "slide" popup travels in from — the edge its anchor sits on.
function slideFrom(position: Anchor): [number, number] {
  if (position.endsWith("left")) return [-1, 0];
  if (position.endsWith("right")) return [1, 0];
  if (position.startsWith("top")) return [0, -1];
  return [0, 1];
}

// "*word*" → Caveat orange emphasis, everything else in the base style.
const Emphasised: React.FC<{ text: string; scriptScale?: number }> = ({ text, scriptScale = 1.15 }) => (
  <>
    {text.split(/(\*[^*]+\*)/g).map((part, i) =>
      part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
        <span
          key={i}
          style={{
            fontFamily: brand.fontScript,
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: `${scriptScale}em`,
            color: brand.primary,
            // Caveat italic overhangs its box and swallows the following space
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

const TEXT_SIZE = { sm: 44, md: 64, lg: 92, xl: 136 };

const TextPopup: React.FC<{ popup: Extract<Popup, { type: "text" }> }> = ({ popup }) => {
  const fontSize = TEXT_SIZE[popup.size];
  const base: React.CSSProperties = {
    fontFamily: brand.fontBold,
    fontWeight: 900,
    fontSize,
    lineHeight: 1.12,
    letterSpacing: "-0.01em",
    textAlign: "center",
    whiteSpace: "pre-line", // a newline in the text breaks the line
    maxWidth: 1300,
  };
  if (popup.look === "bare") {
    return (
      <div
        style={{
          ...base,
          color: "#FFFFFF",
          textShadow: "0 4px 28px rgba(0,0,0,0.75), 0 2px 6px rgba(0,0,0,0.6)",
        }}
      >
        {/* thin script needs more size to hold up against busy footage */}
        <Emphasised text={popup.text} scriptScale={1.35} />
      </div>
    );
  }
  if (popup.look === "pill") {
    return (
      <div
        style={{
          ...base,
          color: "#FFFFFF",
          background: brand.badgeGradient,
          borderRadius: 999,
          padding: `${fontSize * 0.3}px ${fontSize * 0.7}px`,
          boxShadow: "0 14px 40px rgba(0,0,0,0.28)",
        }}
      >
        {popup.text.replace(/\*/g, "")}
      </div>
    );
  }
  return (
    <div
      style={{
        ...base,
        color: brand.textPrimary,
        background: brand.cardBg,
        border: brand.cardBorder,
        borderRadius: brand.borderRadius * 1.5,
        padding: `${fontSize * 0.42}px ${fontSize * 0.75}px`,
        boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
      }}
    >
      <Emphasised text={popup.text} />
    </div>
  );
};

const ImagePopup: React.FC<{ popup: Extract<Popup, { type: "image" }> }> = ({ popup }) => {
  const img = <Img src={staticFile(popup.src)} style={{ width: popup.width, height: "auto", display: "block", margin: "0 auto" }} />;
  const label = popup.label ? (
    <div
      style={{
        marginTop: 22,
        fontFamily: brand.fontSans,
        fontWeight: 700,
        fontSize: 34,
        textAlign: "center",
        color: popup.look === "card" ? brand.textPrimary : "#FFFFFF",
        textShadow: popup.look === "card" ? undefined : "0 2px 12px rgba(0,0,0,0.7)",
      }}
    >
      {popup.label}
    </div>
  ) : null;
  if (popup.look === "bare") {
    return (
      <div style={{ filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.4))" }}>
        {img}
        {label}
      </div>
    );
  }
  if (popup.look === "glass") {
    return (
      <div
        style={{
          ...glassCard,
          // darker tint than a scene card: there is no dimmed sheet behind a popup
          background: "linear-gradient(135deg, rgba(40,30,26,0.42), rgba(20,18,22,0.30))",
          backdropFilter: "blur(22px) saturate(1.2)",
          borderRadius: brand.borderRadius * 1.6,
          padding: 40,
        }}
      >
        {img}
        {label}
      </div>
    );
  }
  return (
    <div
      style={{
        background: brand.cardBg,
        border: brand.cardBorder,
        borderRadius: brand.borderRadius * 1.6,
        padding: 40,
        boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
      }}
    >
      {img}
      {label}
    </div>
  );
};

const LowerThird: React.FC<{ popup: Extract<Popup, { type: "lower-third" }> }> = ({ popup }) => (
  <div
    style={{
      display: "flex",
      alignItems: "stretch",
      background: brand.cardBg,
      borderRadius: brand.borderRadius,
      overflow: "hidden",
      boxShadow: "0 14px 40px rgba(0,0,0,0.3)",
    }}
  >
    <div style={{ width: 14, background: brand.badgeGradient }} />
    <div style={{ padding: "24px 44px 26px 32px" }}>
      <div style={{ fontFamily: brand.fontBold, fontWeight: 900, fontSize: 50, color: brand.textPrimary, lineHeight: 1.1 }}>
        {popup.title}
      </div>
      {popup.subtitle ? (
        <div style={{ fontFamily: brand.fontSans, fontWeight: 600, fontSize: 30, color: brand.primary, marginTop: 6 }}>
          {popup.subtitle}
        </div>
      ) : null}
    </div>
  </div>
);

// Enter (pop / slide / fade) and a quick exit, shared by every anchored popup.
const Anchored: React.FC<{ popup: Popup; frames: number; children: React.ReactNode }> = ({ popup, frames, children }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const exit = interpolate(frame, [frames - EXIT_FRAMES, frames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeIn = interpolate(frame, [0, 7], [0, 1], { extrapolateRight: "clamp" });

  let transform = "";
  if (popup.enter === "pop") {
    const s = spring({ frame, fps, config: { damping: 11, stiffness: 170, mass: 0.8 } });
    transform = `scale(${interpolate(s, [0, 1], [0.6, 1]) * interpolate(exit, [0, 1], [0.92, 1])})`;
  } else if (popup.enter === "slide") {
    const s = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
    const [dx, dy] = slideFrom(popup.position);
    transform = `translate(${dx * (1 - s) * 140}px, ${dy * (1 - s) * 140}px)`;
  }

  return (
    <AbsoluteFill>
      <div
        style={{
          width: DESIGN_WIDTH,
          height: (DESIGN_WIDTH * 9) / 16,
          transform: `scale(${width / DESIGN_WIDTH})`,
          transformOrigin: "top left",
          display: "flex",
          padding: MARGIN,
          ...ANCHOR_STYLE[popup.position],
        }}
      >
        <div
          style={{
            transform: `translate(${popup.offset?.[0] ?? 0}px, ${popup.offset?.[1] ?? 0}px) rotate(${popup.rotate ?? 0}deg)`,
          }}
        >
          <div style={{ opacity: fadeIn * exit, transform }}>{children}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Full-frame cutaways (scene / clip) fade over the footage instead of popping.
const FullFrame: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const opacity =
    interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) *
    interpolate(frame, [frames - EXIT_FRAMES, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Popups: React.FC<{ popups: Popup[] }> = ({ popups }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {popups.map((popup, i) => {
        const from = Math.round(popup.at * fps);
        const frames = Math.max(Math.round(popup.duration * fps), EXIT_FRAMES + 2);
        let body: React.ReactNode;
        if (popup.type === "scene") {
          const Scene = SCENES[popup.component];
          body = (
            <FullFrame frames={frames}>
              <Scene {...popup.props} />
            </FullFrame>
          );
        } else if (popup.type === "clip") {
          body = (
            <FullFrame frames={frames}>
              <OffthreadVideo src={staticFile(popup.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </FullFrame>
          );
        } else {
          body = (
            <Anchored popup={popup} frames={frames}>
              {popup.type === "text" ? (
                <TextPopup popup={popup} />
              ) : popup.type === "image" ? (
                <ImagePopup popup={popup} />
              ) : (
                <LowerThird popup={popup} />
              )}
            </Anchored>
          );
        }
        return (
          <Sequence key={i} from={from} durationInFrames={frames} layout="none">
            {body}
          </Sequence>
        );
      })}
    </>
  );
};
