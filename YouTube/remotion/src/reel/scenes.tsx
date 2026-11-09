import React from "react";
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import { Emphasis } from "../components/glass";

import { ThemeCtx, useTheme } from "./theme";
import { REEL_SCENES_V2 } from "./scenes2";
export { THEMES, ThemeCtx } from "./theme";

// Motion graphics for the top panel of a vertical reel (/reel-edit). Each one fills
// the ~950×640 graphics panel. Every time prop is seconds from the start of the scene,
// so set it to the spoken word the element illustrates.

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const GOOD = "#22C55E";
const BAD = "#EF4444";
const PEACH = "#FDBA74";

const useClock = () => {
  const frame = useCurrentFrame();
  const th = React.useContext(ThemeCtx);
  const { fps } = useVideoConfig();
  return { frame, fps, t: frame / fps, th };
};

// 0→1 spring that starts `at` seconds into the scene.
const enter = (frame: number, fps: number, at: number, damping = 12, stiffness = 170) =>
  spring({ frame: frame - Math.round(at * fps), fps, config: { damping, stiffness } });

const rise = (s: number, px = 30): React.CSSProperties => ({
  opacity: interpolate(s, [0, 0.4], [0, 1], clamp),
  transform: `translateY(${(1 - s) * px}px)`,
});

const Overline: React.FC<{ label: string }> = ({ label }) => {
  const th = useTheme();
  return (
  <div
    style={{
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: th.dark ? PEACH : brand.secondary,
      marginBottom: 22,
      textAlign: "center",
    }}
  >
    {label}
  </div>
  );
};

// ── ReelStat — one hero number counting up, a label, and an optional chip ──────────
export const ReelStat: React.FC<{
  overline?: string;
  value: string; // "600+", "$2,000", "14" — the digits count up
  label: string;
  countAt?: number;
  countFor?: number;
  labelAt?: number;
  chip?: { text: string; at: number }; // *word* → Caveat orange
}> = ({ overline, value, label, countAt = 0.2, countFor = 1.6, labelAt = 0.6, chip }) => {
  const { frame, fps, t, th } = useClock();
  const m = value.match(/^(\D*)([\d,]+)(.*)$/);
  const target = m ? Number(m[2].replace(/,/g, "")) : 0;
  const p = interpolate(t, [countAt, countAt + countFor], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const shown = m ? `${m[1]}${Math.round(target * p).toLocaleString("en-US")}${p >= 1 ? m[3] : ""}` : value;
  const landed = enter(frame, fps, countAt + countFor, 8, 200);
  const intro = enter(frame, fps, 0);
  const labelIn = enter(frame, fps, labelAt);
  const chipIn = chip ? enter(frame, fps, chip.at, 10, 190) : 0;

  return (
    <>
      {overline ? (
        <div style={rise(intro, 16)}>
          <Overline label={overline} />
        </div>
      ) : null}
      <div
        style={{
          ...rise(intro, 24),
          fontWeight: 900,
          fontSize: 250,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          color: brand.primary,
          fontVariantNumeric: "tabular-nums",
          textShadow: "0 10px 60px rgba(249,115,22,0.45)",
          transform: `scale(${1 + 0.07 * Math.sin(Math.min(landed, 1) * Math.PI)})`,
        }}
      >
        {shown}
      </div>
      <div style={{ ...rise(labelIn), fontWeight: 800, fontSize: 76, lineHeight: 1.15, letterSpacing: "-0.02em" }}>{label}</div>
      {chip ? (
        <div
          style={{
            ...th.card,
            marginTop: 30,
            padding: "16px 44px 20px",
            borderRadius: 60,
            fontWeight: 800,
            fontSize: 52,
            opacity: interpolate(chipIn, [0, 0.4], [0, 1], clamp),
            transform: `scale(${interpolate(chipIn, [0, 1], [0.7, 1])})`,
          }}
        >
          <Emphasis text={chip.text} scale={1.3} />
        </div>
      ) : null}
    </>
  );
};

// ── ReelBars — horizontal bars that grow, for "this takes X, that takes Y" ─────────
export const ReelBars: React.FC<{
  overline?: string;
  bars: { label: string; value: string; size: number; at: number; growFor?: number; highlight?: boolean }[];
}> = ({ overline, bars }) => {
  const { frame, fps, t, th } = useClock();
  return (
    <>
      {overline ? <Overline label={overline} /> : null}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 46, marginTop: 10 }}>
        {bars.map((bar, i) => {
          const growFor = bar.growFor ?? 0.6;
          const rowIn = enter(frame, fps, bar.at);
          const grow = interpolate(t, [bar.at + 0.1, bar.at + 0.1 + growFor], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
          const valueIn = enter(frame, fps, bar.at + 0.1 + growFor - 0.15, 9, 200);
          return (
            <div key={i} style={rise(rowIn)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 46, color: bar.highlight ? th.text : th.muted }}>{bar.label}</span>
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: 64,
                    letterSpacing: "-0.02em",
                    color: bar.highlight ? brand.primary : th.text,
                    opacity: interpolate(valueIn, [0, 0.4], [0, 1], clamp),
                    transform: `scale(${interpolate(valueIn, [0, 1], [0.6, 1])})`,
                    transformOrigin: "100% 60%",
                  }}
                >
                  {bar.value}
                </span>
              </div>
              <div style={{ height: 62, borderRadius: 22, background: th.track, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.max(bar.size, 0.03) * grow * 100}%`,
                    height: "100%",
                    borderRadius: 22,
                    background: bar.highlight ? brand.badgeGradient : "rgba(255,255,255,0.72)",
                    boxShadow: bar.highlight ? "0 0 36px rgba(249,115,22,0.6)" : undefined,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ── ReelFlatline — a dashboard card whose chart never leaves zero, then a stamp ────
export const ReelFlatline: React.FC<{
  overline?: string;
  metric: string; // "Signups"
  value?: string; // big number on the card, default "0"
  stamp: string; // slams on at stampAt
  stampAt: number;
  drawFor?: number;
}> = ({ overline, metric, value = "0", stamp, stampAt, drawFor = 1.4 }) => {
  const { frame, fps, t, th } = useClock();
  const cardIn = enter(frame, fps, 0, 13, 150);
  const draw = interpolate(t, [0.2, 0.2 + drawFor], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const stampIn = enter(frame, fps, stampAt, 11, 220);
  const W = 840;
  const H = 190;
  const baseline = H - 22;
  return (
    <>
      {overline ? <Overline label={overline} /> : null}
      <div
        style={{
          ...th.card,
          ...rise(cardIn, 40),
          width: "100%",
          borderRadius: 40,
          padding: "34px 54px 40px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 36, color: th.muted }}>{metric}</div>
            <div style={{ fontWeight: 900, fontSize: 120, lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 30, color: BAD, paddingBottom: 14 }}>▼ flat</div>
        </div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", marginTop: 14 }}>
          {[0, 1, 2].map((i) => (
            <line key={i} x1={0} x2={W} y1={20 + i * 62} y2={20 + i * 62} stroke={th.track} strokeWidth={2} strokeDasharray="6 12" />
          ))}
          <line x1={0} x2={W * draw} y1={baseline} y2={baseline} stroke={BAD} strokeWidth={8} strokeLinecap="round" />
          <circle cx={W * draw} cy={baseline} r={13 + 4 * Math.sin(frame / 4)} fill={BAD} opacity={0.3} />
          <circle cx={W * draw} cy={baseline} r={9} fill={BAD} />
        </svg>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "44%",
            display: "flex",
            justifyContent: "center",
            opacity: interpolate(stampIn, [0, 0.3], [0, 1], clamp),
            transform: `rotate(-7deg) scale(${interpolate(stampIn, [0, 1], [2.3, 1])})`,
          }}
        >
          <div
            style={{
              border: `7px solid ${BAD}`,
              borderRadius: 22,
              padding: "10px 36px",
              background: "rgba(24,10,10,0.72)",
              color: BAD,
              fontWeight: 900,
              fontSize: 68,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {stamp}
          </div>
        </div>
      </div>
    </>
  );
};

// ── ReelChecklist — rows that get ticked or crossed as he says them ────────────────
const Mark: React.FC<{ done: boolean }> = ({ done }) => (
  <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
    {done ? <polyline points="20 6 9 17 4 12" /> : <path d="M18 6 6 18M6 6l12 12" />}
  </svg>
);

export const ReelChecklist: React.FC<{
  overline?: string;
  rows: { icon?: string; text: string; done: boolean; at: number; markAt?: number }[];
}> = ({ overline, rows }) => {
  const { frame, fps, th } = useClock();
  return (
    <>
      {overline ? <Overline label={overline} /> : null}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 28 }}>
        {rows.map((row, i) => {
          const rowIn = enter(frame, fps, row.at);
          const markIn = enter(frame, fps, row.markAt ?? row.at + 0.5, 8, 220);
          const tone = row.done ? GOOD : BAD;
          return (
            <div
              key={i}
              style={{
                ...th.card,
                ...rise(rowIn, 44),
                borderRadius: 36,
                padding: "30px 38px",
                display: "flex",
                alignItems: "center",
                gap: 30,
                borderColor: markIn > 0.5 ? tone : th.track,
              }}
            >
              {row.icon ? <span style={{ fontSize: 84, lineHeight: 1 }}>{row.icon}</span> : null}
              <span style={{ flex: 1, fontWeight: 800, fontSize: 60, letterSpacing: "-0.02em" }}>{row.text}</span>
              <span
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  background: tone,
                  boxShadow: `0 0 34px ${tone}99`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  opacity: interpolate(markIn, [0, 0.3], [0, 1], clamp),
                  transform: `scale(${markIn})`,
                }}
              >
                <Mark done={row.done} />
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ── ReelTitle — big kinetic lines, each landing on its spoken word ─────────────────
export const ReelTitle: React.FC<{
  overline?: string;
  lines: { text: string; at: number }[]; // *word* → Caveat orange
}> = ({ overline, lines }) => {
  const { frame, fps } = useClock();
  return (
    <>
      {overline ? <Overline label={overline} /> : null}
      {lines.map((line, i) => {
        const parts = line.text.match(/\*[^*]+\*|\S+/g) ?? [];
        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "baseline",
              gap: "0 0.24em",
              fontWeight: 900,
              fontSize: 118,
              lineHeight: 1.08,
              letterSpacing: "-0.035em",
              textShadow: "0 6px 34px rgba(0,0,0,0.4)",
            }}
          >
            {parts.map((part, j) => {
              const s = enter(frame, fps, line.at + j * 0.1, 10, 200);
              return (
                <span
                  key={j}
                  style={{
                    display: "inline-block",
                    opacity: interpolate(s, [0, 0.35], [0, 1], clamp),
                    transform: `translateY(${(1 - s) * 44}px) scale(${interpolate(s, [0, 1], [0.8, 1])})`,
                  }}
                >
                  <Emphasis text={part} scale={1.24} />
                </span>
              );
            })}
          </div>
        );
      })}
    </>
  );
};

// ── ReelComment — "comment KEYWORD" call to action: the word types into a comment box ─
export const ReelComment: React.FC<{
  overline?: string;
  keyword: string;
  typeAt: number;
  promise?: string; // *word* → Caveat orange
  promiseAt?: number;
}> = ({ overline = "Comment", keyword, typeAt, promise, promiseAt = 1.2 }) => {
  const { frame, fps, t, th } = useClock();
  const boxIn = enter(frame, fps, 0, 12, 160);
  const typed = Math.max(0, Math.min(keyword.length, Math.floor((t - typeAt) / 0.14) + 1));
  const sentAt = typeAt + keyword.length * 0.14 + 0.15;
  const sent = enter(frame, fps, sentAt, 7, 220);
  const promiseIn = enter(frame, fps, promiseAt);
  const caret = Math.floor(frame / 8) % 2 === 0;
  return (
    <>
      <Overline label={overline} />
      <div
        style={{
          ...th.card,
          ...rise(boxIn, 40),
          width: "100%",
          height: 168,
          borderRadius: 84,
          padding: "0 26px 0 30px",
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <div style={{ width: 104, height: 104, borderRadius: 52, background: "linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.2))", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          {typed === 0 ? (
            <span style={{ fontWeight: 500, fontSize: 46, color: th.muted }}>Add a comment…</span>
          ) : (
            <span style={{ fontWeight: 900, fontSize: 104, lineHeight: 1, letterSpacing: "0.02em" }}>{keyword.slice(0, typed)}</span>
          )}
          <span style={{ width: 6, height: 88, marginLeft: 8, borderRadius: 3, background: brand.primary, opacity: caret && t < sentAt + 1 ? 1 : 0 }} />
        </div>
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: 58,
            background: typed >= keyword.length ? brand.badgeGradient : th.track,
            boxShadow: typed >= keyword.length ? "0 0 44px rgba(249,115,22,0.7)" : undefined,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transform: `scale(${1 + 0.16 * Math.sin(Math.min(sent, 1) * Math.PI)})`,
          }}
        >
          <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </div>
      </div>
      {promise ? (
        <div style={{ ...rise(promiseIn), marginTop: 44, fontWeight: 800, fontSize: 60, lineHeight: 1.2, letterSpacing: "-0.02em", textAlign: "center" }}>
          <Emphasis text={promise} scale={1.3} />
        </div>
      ) : null}
    </>
  );
};

// ── ReelImages — one to three image cards fanned out, the first one in front ───────
export const ReelImages: React.FC<{
  overline?: string;
  images: { src: string; at?: number }[]; // src = asset file name; first image is the front card
  caption?: string; // *word* → Caveat orange
  captionAt?: number;
}> = ({ overline, images, caption, captionAt = 0.5 }) => {
  const { frame, fps } = useClock();
  const captionIn = enter(frame, fps, captionAt);
  // front card in the middle, the others tucked behind to the left and right
  const slots = [
    { x: 0, rot: 0, scale: 1, z: 3 },
    { x: -250, rot: -7, scale: 0.8, z: 2 },
    { x: 250, rot: 7, scale: 0.8, z: 1 },
  ];
  return (
    <>
      {overline ? <Overline label={overline} /> : null}
      <div style={{ position: "relative", width: "100%", flex: 1, minHeight: 0, maxHeight: 620 }}>
        {images.slice(0, 3).map((image, i) => {
          const slot = slots[i];
          const s = enter(frame, fps, image.at ?? i * 0.25, 12, 160);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: slot.z,
                opacity: interpolate(s, [0, 0.4], [0, 1], clamp),
                transform: `translateX(${slot.x * s}px) rotate(${slot.rot * s}deg) scale(${interpolate(s, [0, 1], [0.6, slot.scale])})`,
              }}
            >
              <Img
                src={staticFile(image.src)}
                style={{
                  maxWidth: images.length > 1 ? "62%" : "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: 30,
                  boxShadow: "0 24px 70px rgba(0,0,0,0.5)",
                }}
              />
            </div>
          );
        })}
      </div>
      {caption ? (
        <div style={{ ...rise(captionIn), marginTop: 26, fontWeight: 800, fontSize: 60, letterSpacing: "-0.02em", textAlign: "center" }}>
          <Emphasis text={caption} scale={1.3} />
        </div>
      ) : null}
    </>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const REEL_SCENES: Record<string, React.FC<any>> = {
  ...REEL_SCENES_V2,
  ReelStat,
  ReelBars,
  ReelFlatline,
  ReelChecklist,
  ReelTitle,
  ReelComment,
  ReelImages,
};

