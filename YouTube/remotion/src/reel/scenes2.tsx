import React from "react";
import { Easing, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { ThemeCtx } from "./theme";

// v2 reel graphics — the vocabulary of the reference reels (style-bible.md §5):
// headline hook, terminal typing, numbered app card, stacking pills, screenshot with an
// outline box / BEFORE-AFTER tag / red X, chat window, pipeline steps, full-bleed media.
// Every time prop is seconds from the start of the scene. Sizes adapt to the layout:
// split panel ≈ 950×590, full frame ≈ 950×1240.

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SERIF = "'Playfair Display', Georgia, serif";
const MONO = "'JetBrains Mono', Consolas, monospace";
const GOOD = "#22C55E";
const BAD = "#EF4444";

const useScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const th = React.useContext(ThemeCtx);
  return { frame, fps, t: frame / fps, th, k: th.full ? 1.25 : 1 };
};
const enter = (frame: number, fps: number, at: number, damping = 13, stiffness = 180) =>
  spring({ frame: frame - Math.round(at * fps), fps, config: { damping, stiffness } });
const rise = (s: number, px = 28): React.CSSProperties => ({
  opacity: interpolate(s, [0, 0.35], [0, 1], clamp),
  transform: `translateY(${(1 - s) * px}px) scale(${interpolate(s, [0, 1], [0.96, 1])})`,
});

// "{phrase}" → the highlighted part
const splitHighlight = (text: string) => text.split(/(\{[^}]+\})/g).filter(Boolean).map((p) =>
  p.startsWith("{") ? { text: p.slice(1, -1), hi: true } : { text: p, hi: false });

const Overline: React.FC<{ label: string; at?: number }> = ({ label, at = 0 }) => {
  const { frame, fps, th, k } = useScene();
  const s = enter(frame, fps, at);
  return (
    <div style={{ ...rise(s, 14), fontFamily: SERIF, fontStyle: "italic", fontWeight: 800, fontSize: 46 * k, letterSpacing: "0.02em",
                  textTransform: "uppercase", color: th.dark ? "#FDBA74" : brand.secondary, opacity: 0.9, marginBottom: 18, textAlign: "center" }}>
      {label}
    </div>
  );
};

const WindowChrome: React.FC<{ title?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, children, style }) => (
  <div style={{ width: "100%", background: "#141312", borderRadius: 26, border: "1.5px solid rgba(255,255,255,0.09)",
                boxShadow: "0 24px 70px rgba(0,0,0,0.45)", overflow: "hidden", ...style }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <span key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}
      {title ? <span style={{ marginLeft: 14, fontFamily: MONO, fontSize: 22, color: "rgba(255,255,255,0.45)" }}>{title}</span> : null}
    </div>
    {children}
  </div>
);

// ── ReelHeadline — the hook title (key phrase in an orange box) over an optional visual ──
export const ReelHeadline: React.FC<{
  text: string; // "People are hacking {Claude Code}"
  at?: number;
  wordGap?: number; // seconds between words appearing (0.12)
  image?: string; // asset under the title (screenshot, logo)
  imageAt?: number;
  sub?: string; // small line under the title when there's no image
}> = ({ text, at = 0, wordGap = 0.12, image, imageAt = 0.3, sub }) => {
  const { frame, fps, th, k } = useScene();
  const parts = splitHighlight(text);
  let n = 0;
  const imgIn = enter(frame, fps, imageAt, 14, 150);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: image ? "flex-start" : "center", gap: 26 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "8px 18px", textAlign: "center" }}>
        {parts.flatMap((p, pi) => {
          if (p.hi) {
            const s = enter(frame, fps, at + n++ * wordGap, 10, 200);
            return [
              <span key={pi} style={{ display: "inline-block", background: brand.primary, color: "#FFFFFF", borderRadius: 14, padding: "2px 22px 8px",
                                      fontFamily: SERIF, fontStyle: "italic", fontWeight: 800, fontSize: 84 * k, lineHeight: 1.12,
                                      opacity: interpolate(s, [0, 0.3], [0, 1], clamp), transform: `scale(${interpolate(s, [0, 1], [0.7, 1])}) rotate(-1.5deg)` }}>
                {p.text}
              </span>,
            ];
          }
          return p.text.trim().split(/\s+/).filter(Boolean).map((w, wi) => {
            const s = enter(frame, fps, at + n++ * wordGap, 12, 190);
            return (
              <span key={`${pi}-${wi}`} style={{ display: "inline-block", fontFamily: "Montserrat, Inter, sans-serif", fontWeight: 800, fontSize: 70 * k,
                                                 letterSpacing: "-0.02em", lineHeight: 1.1, color: th.text, ...rise(s, 22) }}>
                {w}
              </span>
            );
          });
        })}
      </div>
      {image ? (
        <div style={{ ...rise(imgIn, 40), flex: 1, minHeight: 0, width: "100%", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
          <Img src={staticFile(image)} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 22, boxShadow: "0 22px 60px rgba(0,0,0,0.35)" }} />
        </div>
      ) : sub ? (
        <div style={{ ...rise(imgIn), fontSize: 40 * k, fontWeight: 600, color: th.muted, textAlign: "center" }}>{sub}</div>
      ) : null}
    </div>
  );
};

// ── ReelTerminal — a code/terminal window whose lines type in on cue ──────────────────
type TermLine = { text: string; at: number; kind?: "cmd" | "out" | "ok" | "warn" | "dim" | "hi" };
export const ReelTerminal: React.FC<{ title?: string; lines: TermLine[]; cps?: number; overline?: string }> = ({ title, lines, cps = 38, overline }) => {
  const { frame, fps, t, k } = useScene();
  const winIn = enter(frame, fps, 0, 14, 160);
  const color = { cmd: "#F6F1EA", out: "rgba(246,241,234,0.78)", ok: "#4ADE80", warn: "#FDBA74", dim: "rgba(246,241,234,0.42)", hi: "#FFFFFF" };
  return (
    <>
      {overline ? <Overline label={overline} /> : null}
      <div style={{ ...rise(winIn, 40), width: "100%" }}>
        <WindowChrome title={title}>
          <div style={{ padding: "22px 28px 28px", display: "flex", flexDirection: "column", gap: 10 * k }}>
            {lines.map((l, i) => {
              if (t < l.at) return null;
              const kind = l.kind ?? "out";
              const typed = kind === "cmd" ? l.text.slice(0, Math.max(0, Math.floor((t - l.at) * cps))) : l.text;
              const s = enter(frame, fps, l.at, 16, 220);
              const typing = kind === "cmd" && typed.length < l.text.length;
              return (
                <div key={i} style={{ fontFamily: MONO, fontSize: 31 * k, lineHeight: 1.35, color: color[kind], whiteSpace: "pre-wrap", wordBreak: "break-word",
                                      opacity: kind === "cmd" ? 1 : interpolate(s, [0, 0.4], [0, 1], clamp),
                                      background: kind === "hi" ? "rgba(249,115,22,0.28)" : undefined, borderRadius: 6, padding: kind === "hi" ? "0 8px" : 0 }}>
                  {kind === "cmd" ? <span style={{ color: brand.primary }}>{"> "}</span> : null}
                  {typed}
                  {typing ? <span style={{ display: "inline-block", width: 14, height: 30 * k, background: brand.primary, marginLeft: 4, verticalAlign: "middle" }} /> : null}
                </div>
              );
            })}
          </div>
        </WindowChrome>
      </div>
    </>
  );
};

// ── ReelAppCard — numbered beat: "THE FIRST" + big rounded icon + the name ─────────────
export const ReelAppCard: React.FC<{ overline?: string; icon?: string; image?: string; name: string; nameAt?: number; sub?: string }> = ({
  overline, icon, image, name, nameAt = 0.45, sub,
}) => {
  const { frame, fps, th, k } = useScene();
  const cardIn = enter(frame, fps, 0.05, 11, 170);
  const nameIn = enter(frame, fps, nameAt, 12, 190);
  const size = 300 * k;
  return (
    <>
      {overline ? <Overline label={overline} /> : null}
      <div style={{ width: size, height: size, borderRadius: size * 0.24, background: "#FFFFFF", boxShadow: "0 26px 70px rgba(0,0,0,0.25), inset 0 -6px 0 rgba(0,0,0,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "center", opacity: interpolate(cardIn, [0, 0.3], [0, 1], clamp),
                    transform: `scale(${interpolate(cardIn, [0, 1], [0.6, 1])}) rotate(${(1 - cardIn) * -8}deg)` }}>
        {image ? (
          <Img src={staticFile(image)} style={{ width: "72%", height: "72%", objectFit: "contain" }} />
        ) : (
          <div style={{ width: "66%", height: "66%", borderRadius: size * 0.17, background: brand.badgeGradient, display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 130 * k, boxShadow: "inset 0 -8px 0 rgba(0,0,0,0.08)" }}>{icon}</div>
        )}
      </div>
      <div style={{ ...rise(nameIn, 24), marginTop: 26, fontFamily: SERIF, fontStyle: "italic", fontWeight: 900, fontSize: 92 * k, lineHeight: 1,
                    textTransform: "uppercase", letterSpacing: "-0.01em", color: th.text, textAlign: "center" }}>{name}</div>
      {sub ? <div style={{ ...rise(nameIn), marginTop: 14, fontSize: 36 * k, fontWeight: 600, color: th.muted, textAlign: "center" }}>{sub}</div> : null}
    </>
  );
};

// ── ReelPills — rounded pills stacking in one per spoken item ──────────────────────────
export const ReelPills: React.FC<{ overline?: string; items: { text: string; at: number; icon?: string; tone?: "good" | "bad" }[] }> = ({ overline, items }) => {
  const { frame, fps, t, th, k } = useScene();
  const latest = items.reduce((idx, it, i) => (t >= it.at ? i : idx), -1);
  return (
    <>
      {overline ? <Overline label={overline} /> : null}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 18 * k, alignItems: "center" }}>
        {items.map((it, i) => {
          const s = enter(frame, fps, it.at, 12, 200);
          const tone = it.tone === "good" ? GOOD : it.tone === "bad" ? BAD : brand.primary;
          return (
            <div key={i} style={{ ...th.card, ...rise(s, 36), width: "92%", borderRadius: 999, padding: `${22 * k}px ${40 * k}px`, display: "flex", alignItems: "center",
                                  gap: 22, fontSize: 44 * k, fontWeight: 700, letterSpacing: "-0.01em", color: th.text,
                                  outline: i === latest ? `4px solid ${tone}` : undefined, outlineOffset: -2 }}>
              {it.icon ? <span style={{ fontSize: 46 * k }}>{it.icon}</span> : null}
              <span style={{ flex: 1, textAlign: it.icon ? "left" : "center" }}>{it.text}</span>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ── ReelScreenshot — a real screenshot with an outline box, a BEFORE/AFTER tag, a red X ─
export const ReelScreenshot: React.FC<{
  src: string; tag?: { text: string; tone?: "good" | "bad"; at?: number };
  box?: { x: number; y: number; w: number; h: number; at: number }; // fractions of the image
  stamp?: { at: number }; zoom?: { to: number; at: number; dur?: number; focus?: [number, number] }; caption?: string;
}> = ({ src, tag, box, stamp, zoom, caption }) => {
  const { frame, fps, t, th, k } = useScene();
  const imgIn = enter(frame, fps, 0, 14, 160);
  const boxIn = box ? interpolate(t, [box.at, box.at + 0.45], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 0;
  const stampIn = stamp ? enter(frame, fps, stamp.at, 9, 230) : 0;
  const z = zoom ? interpolate(t, [zoom.at, zoom.at + (zoom.dur ?? 0.8)], [1, zoom.to], { ...clamp, easing: Easing.inOut(Easing.cubic) }) : 1;
  const f = zoom?.focus ?? [box ? box.x + box.w / 2 : 0.5, box ? box.y + box.h / 2 : 0.5];
  const tagIn = tag ? enter(frame, fps, tag.at ?? 0.1, 10, 210) : 0;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
      {tag ? (
        <div style={{ opacity: interpolate(tagIn, [0, 0.3], [0, 1], clamp), transform: `scale(${interpolate(tagIn, [0, 1], [0.6, 1])})`,
                      background: tag.tone === "good" ? GOOD : BAD, color: "#FFFFFF", fontFamily: "Montserrat, Inter, sans-serif", fontWeight: 900,
                      fontSize: 38 * k, letterSpacing: "0.06em", padding: "4px 18px", borderRadius: 8 }}>{tag.text}</div>
      ) : null}
      <div style={{ ...rise(imgIn, 40), position: "relative", flex: 1, minHeight: 0, width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", maxWidth: "100%", maxHeight: "100%", borderRadius: 22, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,0.35)" }}>
          <div style={{ transform: `scale(${z})`, transformOrigin: `${f[0] * 100}% ${f[1] * 100}%` }}>
            <Img src={staticFile(src)} style={{ display: "block", maxWidth: "100%", maxHeight: th.full ? 1150 : 560, objectFit: "contain" }} />
            {box ? (
              <div style={{ position: "absolute", left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%`,
                            border: `6px solid ${brand.primary}`, borderRadius: 14, opacity: boxIn > 0 ? 1 : 0,
                            clipPath: `inset(0 ${(1 - boxIn) * 100}% 0 0)`, boxShadow: "0 0 30px rgba(249,115,22,0.45)" }} />
            ) : null}
          </div>
          {stamp ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                          opacity: interpolate(stampIn, [0, 0.25], [0, 1], clamp), transform: `scale(${interpolate(stampIn, [0, 1], [2.2, 1])})` }}>
              <svg width={260} height={260} viewBox="0 0 24 24" fill="none" stroke={BAD} strokeWidth={3.6} strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </div>
          ) : null}
        </div>
      </div>
      {caption ? <div style={{ fontSize: 38 * k, fontWeight: 700, color: th.muted, textAlign: "center" }}>{caption}</div> : null}
    </div>
  );
};

// ── ReelChat — a chat window: my message types in, the reply streams after ────────────
export const ReelChat: React.FC<{ title?: string; messages: { from: "me" | "ai"; text: string; at: number }[]; cps?: number }> = ({ title = "Claude", messages, cps = 32 }) => {
  const { frame, fps, t, th, k } = useScene();
  const winIn = enter(frame, fps, 0, 14, 160);
  return (
    <div style={{ ...rise(winIn, 40), ...th.card, width: "100%", borderRadius: 30, padding: `${26 * k}px ${28 * k}px`, display: "flex", flexDirection: "column", gap: 16 * k }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontWeight: 800, fontSize: 34 * k, color: th.text }}>
        <span style={{ fontSize: 38 * k, color: brand.primary }}>✳</span>{title}
      </div>
      {messages.map((m, i) => {
        if (t < m.at) return null;
        const n = Math.max(1, Math.floor((t - m.at) * (m.from === "me" ? cps : cps * 2.2)));
        const s = enter(frame, fps, m.at, 15, 220);
        const me = m.from === "me";
        return (
          <div key={i} style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "86%", ...rise(s, 16), borderRadius: 24, padding: `${14 * k}px ${22 * k}px`,
                                background: me ? brand.primary : th.track, color: me ? "#FFFFFF" : th.text, fontSize: 34 * k, lineHeight: 1.32, fontWeight: me ? 600 : 500 }}>
            {m.text.slice(0, n)}
          </div>
        );
      })}
    </div>
  );
};

// ── ReelSteps — a pipeline: nodes light up one by one as he names them ─────────────────
export const ReelSteps: React.FC<{ overline?: string; steps: { label: string; sub?: string; icon?: string; at: number }[] }> = ({ overline, steps }) => {
  const { frame, fps, t, th, k } = useScene();
  const row = 92 * k;
  return (
    <>
      {overline ? <Overline label={overline} /> : null}
      <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", gap: 14 * k }}>
        {steps.map((st, i) => {
          const s = enter(frame, fps, st.at, 12, 200);
          const lit = t >= st.at;
          return (
            <div key={i} style={{ ...rise(s, 30), display: "flex", alignItems: "center", gap: 24, position: "relative" }}>
              {i < steps.length - 1 ? (
                <div style={{ position: "absolute", left: row / 2 - 3, top: row, width: 6, height: 14 * k + 2,
                              background: t >= steps[i + 1].at ? brand.primary : th.track }} />
              ) : null}
              <div style={{ width: row, height: row, borderRadius: row / 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 44 * k, background: lit ? brand.badgeGradient : th.track, boxShadow: lit ? "0 0 30px rgba(249,115,22,0.55)" : undefined, color: "#FFF", fontWeight: 900 }}>
                {st.icon ?? i + 1}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 46 * k, fontWeight: 800, letterSpacing: "-0.015em", color: th.text, lineHeight: 1.1 }}>{st.label}</div>
                {st.sub ? <div style={{ fontSize: 30 * k, fontWeight: 500, color: th.muted, marginTop: 4 }}>{st.sub}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ── ReelMedia — B-roll / screen recording / image, full-bleed in the full layout ──────
export const ReelMedia: React.FC<{ src: string; startFrom?: number; fit?: "cover" | "contain"; bleed?: boolean; label?: string }> = ({
  src, startFrom = 0, fit = "cover", bleed = true, label,
}) => {
  const { frame, fps, k } = useScene();
  const s = enter(frame, fps, 0, 18, 140);
  const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(src);
  const box: React.CSSProperties = bleed
    ? { position: "absolute", left: -64, right: -64, top: -150, bottom: -530 }
    : { position: "relative", width: "100%", height: "100%", borderRadius: 24, overflow: "hidden" };
  const media: React.CSSProperties = { width: "100%", height: "100%", objectFit: fit, transform: `scale(${interpolate(s, [0, 1], [1.08, 1.0])})` };
  return (
    <div style={box}>
      {isVideo ? <OffthreadVideo src={staticFile(src)} startFrom={Math.round(startFrom * fps)} muted style={media} /> : <Img src={staticFile(src)} style={media} />}
      {label ? (
        <div style={{ position: "absolute", top: 190, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <span style={{ background: "rgba(18,17,16,0.86)", color: "#FFF", fontFamily: "Montserrat, Inter, sans-serif", fontWeight: 900, fontSize: 36 * k,
                         letterSpacing: "0.04em", padding: "4px 16px", borderRadius: 8, textTransform: "uppercase" }}>{label}</span>
        </div>
      ) : null}
    </div>
  );
};

export const REEL_SCENES_V2 = { ReelHeadline, ReelTerminal, ReelAppCard, ReelPills, ReelScreenshot, ReelChat, ReelSteps, ReelMedia };
