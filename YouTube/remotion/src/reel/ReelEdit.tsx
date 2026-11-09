import React, { useMemo } from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { buildPages } from "../polish/Captions";
import { zoomAt } from "../polish/ZoomLayer";
import type { Word } from "../polish/types";
import { REEL_SCENES, THEMES, ThemeCtx } from "./scenes";
import type { ReelCaptions, ReelFaceCrop, ReelLayout, ReelProps, ReelTheme } from "./types";

// Instagram's own UI covers roughly this much of a Reel — graphics stay clear of it.
const SAFE_TOP = 150;
const SAFE_BOTTOM = 330;
const SIDE = 64;
const CAPTION_ROOM = 76; // space kept free above the seam for the caption
const FADE = 6; // v1: frames a scene takes to fade out (v2 hard-cuts between layouts, like the references)

const GLASS_BACKDROP =
  "radial-gradient(ellipse 85% 42% at 50% 24%, rgba(249,115,22,0.24), rgba(249,115,22,0) 72%), " +
  "linear-gradient(165deg, rgba(18,16,20,0.84), rgba(58,28,10,0.76))";
const BACKGROUNDS: Record<Exclude<ReelTheme, "glass">, string> = {
  cream: "radial-gradient(ellipse 90% 55% at 80% 8%, rgba(249,115,22,0.16) 0%, rgba(253,245,238,0) 60%), #FDF5EE",
  dark: "radial-gradient(ellipse 90% 50% at 50% 18%, rgba(249,115,22,0.16) 0%, rgba(20,18,17,0) 62%), #121110",
};

// ── face video ────────────────────────────────────────────────────────────────────
const Face: React.FC<{
  video: string; aspect: number; crop: ReelFaceCrop; boxW: number; boxH: number;
  scale: number; focus: [number, number];
}> = ({ video, aspect, crop, boxW, boxH, scale, focus }) => {
  const videoH = Math.max(boxH, boxW / aspect) * crop.scale;
  const videoW = videoH * aspect;
  const left = Math.min(0, Math.max(boxW - videoW, boxW / 2 - crop.x * videoW));
  const top = -(videoH - boxH) * crop.y;
  return (
    <OffthreadVideo
      src={staticFile(video)}
      muted
      style={{
        position: "absolute", left, top, width: videoW, height: videoH, maxWidth: "none",
        transform: `scale(${scale})`, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`,
      }}
    />
  );
};

// ── captions ──────────────────────────────────────────────────────────────────────
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%$+]/g, "");
const OUTLINE = "0 0 8px rgba(0,0,0,0.85), 0 3px 0 rgba(0,0,0,0.55), 0 6px 22px rgba(0,0,0,0.5)";

const CaptionLine: React.FC<{ words: Word[]; config: ReelCaptions; light: boolean }> = ({ words, config, light }) => {
  const keys = new Set(config.keywords);
  const s = config.style;
  const base: React.CSSProperties =
    s === "bold"
      ? { fontFamily: "Montserrat, Inter, sans-serif", fontWeight: 900, fontSize: 64, letterSpacing: "0.005em", textTransform: "uppercase",
          color: "#FFFFFF", background: "rgba(18,17,16,0.86)", borderRadius: 14, padding: "6px 20px 8px", lineHeight: 1.1 }
      : s === "editorial"
      ? { fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontWeight: 900, fontSize: 88, textTransform: "uppercase",
          letterSpacing: "-0.01em", color: "#FFFFFF", textShadow: OUTLINE, lineHeight: 1 }
      : s === "clean"
      ? { fontFamily: brand.fontBold, fontWeight: 800, fontSize: 70, letterSpacing: "-0.015em", color: "#FFFFFF", textShadow: OUTLINE, lineHeight: 1.1 }
      : { fontFamily: brand.fontBold, fontWeight: 800, fontSize: 74, letterSpacing: "-0.01em", color: "#FFFFFF", lineHeight: 1.15,
          background: "rgba(34,34,38,0.82)", borderRadius: 22, padding: "6px 30px 12px", textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          textTransform: config.uppercase ? "uppercase" : "none" };
  // on a light full-frame graphic the outlined styles switch to dark ink (the boxed styles carry their own background)
  const ink: React.CSSProperties = light && (s === "clean" || s === "editorial") ? { color: "#1C1C1E", textShadow: "none" } : {};
  return (
    <div style={{ ...base, ...ink, whiteSpace: "nowrap" }}>
      {words.map((w, i) => {
        const hit = keys.has(norm(w.text));
        const kw: React.CSSProperties = !hit ? {} :
          s === "clean" ? { fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontWeight: 800, color: brand.primary, fontSize: "1.08em" }
          : { color: brand.primary };
        return <span key={i} style={kw}>{i ? " " : ""}{w.text}</span>;
      })}
    </div>
  );
};

const StyledCaptions: React.FC<{ config: ReelCaptions; words: Word[]; y: number; light: boolean }> = ({ config, words, y, light }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const pages = useMemo(
    () => buildPages(words, { start: 0, end: durationInFrames / fps, maxWords: config.maxWords }, config.maxChars),
    [words, config, durationInFrames, fps],
  );
  const page = pages.find((p) => t >= p.start && t < p.end);
  if (!page) return null;
  const since = (t - page.start) * fps;
  const accentSet = new Set(config.accent);
  const main = page.words.filter((w) => !accentSet.has(norm(w.text)));
  const accent = page.words.filter((w) => accentSet.has(norm(w.text)));
  const pop = interpolate(since, [0, 3], [0.88, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, height: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `scale(${pop})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        {main.length ? <CaptionLine words={main} config={config} light={light} /> : null}
        {accent.length ? (
          <div style={{ fontFamily: brand.fontScript, fontWeight: 700, fontSize: config.style === "bold" ? 82 : 92, lineHeight: 0.95,
                        color: brand.primary, textShadow: OUTLINE, whiteSpace: "nowrap" }}>
            {accent.map((w) => w.text.replace(/[.,!?]$/, "")).join(" ").toLowerCase()}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ── scene shell ───────────────────────────────────────────────────────────────────
const SceneShell: React.FC<{ exit: boolean; theme: ReelTheme; full: boolean; children: React.ReactNode }> = ({ exit, theme, full, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const out = exit
    ? interpolate(frame, [durationInFrames - FADE - 1, durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;
  return (
    <ThemeCtx.Provider value={{ ...THEMES[theme], full }}>
      <div
        style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          opacity: out, transform: `translateY(${(1 - out) * -18}px)`, fontFamily: brand.fontSans, color: THEMES[theme].text,
        }}
      >
        {children}
      </div>
    </ThemeCtx.Provider>
  );
};

// Vertical reel from a horizontal take. v1: split layout the whole way (graphics top, face bottom).
// v2: every scene picks split / full / face, and any gap between scenes is a full-face punch-in.
export const ReelEdit: React.FC<ReelProps> = (props) => {
  const { video, sourceAspect, version, split, face, faceFull, zooms, scenes, captions, words } = props;
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const v2 = version === 2;

  const top = Math.round(height * split);
  const { scale, focus } = zoomAt(t, zooms);

  const placed = scenes.map((scene) => ({
    ...scene, from: Math.round(scene.at * fps), frames: Math.max(1, Math.round(scene.duration * fps)),
  }));
  const active = placed.find((s) => frame >= s.from && frame < s.from + s.frames);
  const layout: ReelLayout = active ? active.layout : v2 ? "face" : "split";
  const theme: ReelTheme = active?.theme ?? "glass";

  // v1 only: full-frame scenes cross-fade over the face
  const cover = v2 ? 0 : Math.max(0, ...placed.filter((s) => s.layout === "full").map((s) =>
    interpolate(frame, [s.from, s.from + FADE, s.from + s.frames - FADE - 1, s.from + s.frames - 1], [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));

  const renderScenes = (which: "split" | "full") =>
    placed
      .filter((s) => (which === "full" ? s.layout === "full" : s.layout === "split") && s.component)
      .map((s, i) => {
        const Scene = REEL_SCENES[s.component as string];
        if (!Scene) return null;
        return (
          <Sequence key={`${which}${i}`} from={s.from} durationInFrames={s.frames} layout="none">
            <SceneShell exit={!v2 && s.from + s.frames < durationInFrames} theme={s.theme} full={s.layout === "full"}>
              <Scene {...s.props} />
            </SceneShell>
          </Sequence>
        );
      });

  const background =
    theme === "glass" ? (
      <>
        {video ? (
          <AbsoluteFill style={{ filter: "blur(46px) saturate(1.2)", transform: "scale(1.25)" }}>
            <OffthreadVideo src={staticFile(video)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </AbsoluteFill>
        ) : null}
        <AbsoluteFill style={{ background: GLASS_BACKDROP }} />
      </>
    ) : (
      <AbsoluteFill style={{ background: BACKGROUNDS[theme] }} />
    );

  const captionY = layout === "split" ? top : layout === "face" ? Math.round(height * 0.66) : height - SAFE_BOTTOM - 110;

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {layout === "face" && video ? (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Face video={video} aspect={sourceAspect} crop={faceFull} boxW={width} boxH={height} scale={scale} focus={focus} />
        </AbsoluteFill>
      ) : (
        background
      )}

      {/* split: graphics panel on top, medium face crop below */}
      {layout === "split" || !v2 ? (
        <>
          <div style={{ position: "absolute", left: SIDE, right: SIDE, top: SAFE_TOP, height: top - SAFE_TOP - CAPTION_ROOM }}>
            {renderScenes("split")}
          </div>
          {layout !== "face" ? (
            <div style={{ position: "absolute", left: 0, top, width, height: height - top, overflow: "hidden", background: "#000" }}>
              {video ? <Face video={video} aspect={sourceAspect} crop={face} boxW={width} boxH={height - top} scale={scale} focus={focus} /> : null}
            </div>
          ) : null}
        </>
      ) : null}

      {/* full: the graphic takes the frame */}
      {v2 ? (
        layout === "full" ? (
          <div style={{ position: "absolute", left: SIDE, right: SIDE, top: SAFE_TOP, bottom: SAFE_BOTTOM + 200 }}>{renderScenes("full")}</div>
        ) : null
      ) : (
        <>
          {cover > 0 ? <AbsoluteFill style={{ opacity: cover, background: `${GLASS_BACKDROP}, #141216` }} /> : null}
          <div style={{ position: "absolute", left: SIDE, right: SIDE, top: SAFE_TOP, bottom: SAFE_BOTTOM }}>{renderScenes("full")}</div>
        </>
      )}

      {captions ? <StyledCaptions config={captions} words={words} y={captionY} light={layout === "full" && theme === "cream"} /> : null}
    </AbsoluteFill>
  );
};

export const reelEditDefaults: ReelProps = {
  video: "",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 150,
  sourceAspect: 16 / 9,
  version: 2,
  split: 0.43,
  face: { x: 0.5, y: 0, scale: 1 },
  faceFull: { x: 0.5, y: 0, scale: 1.05 },
  zooms: [],
  scenes: [],
  captions: { style: "bold", maxWords: 3, maxChars: 18, uppercase: true, keywords: [], accent: [] },
  words: [],
};
