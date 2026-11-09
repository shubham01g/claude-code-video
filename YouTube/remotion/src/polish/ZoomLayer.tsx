import React from "react";
import { AbsoluteFill, Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import type { PlayerFrame, Zoom } from "./types";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const easeHold = Easing.inOut(Easing.cubic);
const easeDrift = Easing.inOut(Easing.sin);

// Scale + focus point at time t. Outside every zoom the frame is untouched (scale 1).
export function zoomAt(t: number, zooms: Zoom[]): { scale: number; focus: [number, number] } {
  for (const z of zooms) {
    if (t < z.start || t >= z.end) continue;
    const span = z.end - z.start;
    const out = Math.min(z.out, span);
    const drift = z.style === "drift";
    const inDur = drift ? Math.max(span - out, 0.001) : Math.max(Math.min(z.in, span - out), 0.001);
    const up = (drift ? easeDrift : easeHold)(clamp01((t - z.start) / inDur));
    const down = out > 0 ? easeHold(clamp01((z.end - t) / out)) : 1;
    const reached = z.from + (z.to - z.from) * up;
    return { scale: 1 + (reached - 1) * down, focus: z.focus };
  }
  return { scale: 1, focus: [0.5, 0.5] };
}

// Player frame geometry at 1920 design width: the footage shrinks to PLAYER_SCALE
// and sits PLAYER_TOP from the top, leaving room for the timeline and captions below.
const DESIGN_WIDTH = 1920;
const PLAYER_SCALE = 0.68;
const PLAYER_TOP = 50;
const PLAYER_RADIUS = 26;
const YT_RED = "#FF0000";

// How far the footage has shrunk into the player (0 = full frame, 1 = fully framed),
// and how far the playhead has scrubbed along the timeline.
function playerAt(t: number, players: PlayerFrame[]): { p: number; scrub: number; player: PlayerFrame } | null {
  for (const pl of players) {
    if (t < pl.start || t >= pl.end) continue;
    const p = easeHold(clamp01((t - pl.start) / pl.in)) * easeHold(clamp01((pl.end - t) / pl.out));
    const scrub = easeDrift(clamp01((t - pl.start - pl.in * 0.6) / Math.max(pl.end - pl.out - pl.start - pl.in * 0.6, 0.001)));
    return { p, scrub, player: pl };
  }
  return null;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// YouTube-style timeline under the framed footage: chaptered bar, playhead, timestamp.
const PlayerChrome: React.FC<{ opacity: number; scrub: number; player: PlayerFrame }> = ({ opacity, scrub, player }) => {
  const { width } = useVideoConfig();
  const boxWidth = DESIGN_WIDTH * PLAYER_SCALE;
  const left = (DESIGN_WIDTH - boxWidth) / 2;
  const barTop = PLAYER_TOP + (DESIGN_WIDTH * 9 * PLAYER_SCALE) / 16 + 24;
  const gap = 5;
  const chapterWidth = (boxWidth - gap * (player.chapters - 1)) / player.chapters;
  const played = scrub * boxWidth;

  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: "absolute",
          width: DESIGN_WIDTH,
          height: (DESIGN_WIDTH * 9) / 16,
          transform: `scale(${width / DESIGN_WIDTH})`,
          transformOrigin: "top left",
        }}
      >
        <div style={{ position: "absolute", left, top: barTop, width: boxWidth, height: 8 }}>
          {Array.from({ length: player.chapters }, (_, i) => {
            const x = i * (chapterWidth + gap);
            const fill = clamp01((played - x) / chapterWidth);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  width: chapterWidth,
                  height: 8,
                  borderRadius: 4,
                  background: "rgba(28,28,30,0.16)",
                  overflow: "hidden",
                }}
              >
                <div style={{ width: `${fill * 100}%`, height: "100%", background: YT_RED }} />
              </div>
            );
          })}
          <div
            style={{
              position: "absolute",
              left: played - 11,
              top: -7,
              width: 22,
              height: 22,
              borderRadius: 11,
              background: YT_RED,
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            left,
            top: barTop + 24,
            width: boxWidth,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: brand.fontSans,
            fontWeight: 700,
            fontSize: 28,
            color: brand.textPrimary,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 0,
                height: 0,
                borderTop: "11px solid transparent",
                borderBottom: "11px solid transparent",
                borderLeft: `18px solid ${brand.textPrimary}`,
              }}
            />
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {clock(scrub * player.length)} / {clock(player.length)}
            </span>
          </div>
          <span style={{ color: brand.textMuted, fontWeight: 600 }}>{player.chapters} chapters · 1080p</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ZoomLayer: React.FC<{ video: string; zooms: Zoom[]; players: PlayerFrame[] }> = ({ video, zooms, players }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  const { scale, focus } = zoomAt(t, zooms);
  const framed = playerAt(t, players);
  const p = framed?.p ?? 0;
  const boxScale = interpolate(p, [0, 1], [1, PLAYER_SCALE]);
  const unit = width / DESIGN_WIDTH;

  return (
    <AbsoluteFill
      style={{ overflow: "hidden", background: framed ? `${brand.backgroundGradient}, ${brand.background}` : "#000" }}
    >
      <AbsoluteFill
        style={{
          overflow: "hidden",
          transform: `translateY(${p * PLAYER_TOP * unit}px) scale(${boxScale})`,
          transformOrigin: "50% 0%",
          // radius is divided by the scale so it reads as PLAYER_RADIUS on screen
          borderRadius: (p * PLAYER_RADIUS * unit) / boxScale,
          boxShadow: p > 0 ? `0 ${30 * p}px ${80 * p}px rgba(0,0,0,${0.28 * p})` : undefined,
        }}
      >
        <OffthreadVideo
          src={staticFile(video)}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
            transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`,
          }}
        />
      </AbsoluteFill>
      {framed ? <PlayerChrome opacity={p} scrub={framed.scrub} player={framed.player} /> : null}
    </AbsoluteFill>
  );
};
