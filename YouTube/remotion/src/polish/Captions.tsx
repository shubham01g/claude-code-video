import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";
import type { CaptionRange, Word } from "./types";

const DESIGN_WIDTH = 1920;
const MAX_CHARS = 30; // a page never gets wider than this, whatever maxWords says
const GAP_BREAK = 0.6; // a pause this long always starts a new page
const LINGER = 0.35; // how long the last page of a sentence stays after its final word

type Page = { words: Word[]; start: number; end: number };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function buildPages(
  words: Word[],
  range: Pick<CaptionRange, "start" | "end" | "maxWords">,
  maxChars = MAX_CHARS,
): Page[] {
  const inRange = words.filter((w) => w.start >= range.start - 0.05 && w.end <= range.end + 0.05);
  const pages: Page[] = [];
  let current: Word[] = [];
  const flush = () => {
    if (current.length) pages.push({ words: current, start: current[0].start, end: current[current.length - 1].end });
    current = [];
  };
  for (const w of inRange) {
    const prev = current[current.length - 1];
    const chars = current.reduce((n, c) => n + c.text.length + 1, 0) + w.text.length;
    if (prev && (w.start - prev.end > GAP_BREAK || current.length >= range.maxWords || chars > maxChars)) flush();
    current.push(w);
    if (/[.!?]$/.test(w.text)) flush();
  }
  flush();
  // Hold each page until the next one starts so captions don't flicker between words.
  return pages.map((p, i) => {
    const next = pages[i + 1];
    const end = next && next.start - p.end < GAP_BREAK ? next.start : Math.min(p.end + LINGER, range.end);
    return { ...p, end };
  });
}

const POSITION: Record<CaptionRange["position"], React.CSSProperties> = {
  bottom: { alignItems: "flex-end", paddingBottom: 120 },
  center: { alignItems: "center" },
  top: { alignItems: "flex-start", paddingTop: 110 },
};

// Dark outline built from stacked shadows — reads on any footage, light or dark.
const OUTLINE = [
  "0 0 6px rgba(0,0,0,0.9)",
  "3px 3px 0 rgba(0,0,0,0.85)",
  "-3px 3px 0 rgba(0,0,0,0.85)",
  "3px -3px 0 rgba(0,0,0,0.85)",
  "-3px -3px 0 rgba(0,0,0,0.85)",
  "0 8px 26px rgba(0,0,0,0.55)",
].join(", ");

export const Captions: React.FC<{ ranges: CaptionRange[]; words: Word[]; emphasis: string[] }> = ({
  ranges,
  words,
  emphasis,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;

  const paged = useMemo(() => ranges.map((r) => ({ range: r, pages: buildPages(words, r) })), [ranges, words]);
  const emphasisSet = useMemo(() => new Set(emphasis.map(norm)), [emphasis]);

  for (const { range, pages } of paged) {
    const page = pages.find((p) => t >= p.start && t < p.end);
    if (!page) continue;
    const sincePage = (t - page.start) * fps;
    const pop = interpolate(sincePage, [0, 4], [0.94, 1], { extrapolateRight: "clamp" });
    const opacity = interpolate(sincePage, [0, 3], [0, 1], { extrapolateRight: "clamp" });

    return (
      <AbsoluteFill>
        <div
          style={{
            width: DESIGN_WIDTH,
            height: (DESIGN_WIDTH * 9) / 16,
            transform: `scale(${width / DESIGN_WIDTH})`,
            transformOrigin: "top left",
            display: "flex",
            justifyContent: "center",
            ...POSITION[range.position],
          }}
        >
          <div
            style={{
              opacity,
              transform: `scale(${pop})`,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "baseline",
              gap: "0 0.28em",
              maxWidth: 1400,
              fontSize: 68,
              lineHeight: 1.15,
            }}
          >
            {page.words.map((w, i) => {
              const isEmphasis = emphasisSet.has(norm(w.text));
              const isSpoken = range.highlight && t >= w.start && t < (page.words[i + 1]?.start ?? page.end);
              return (
                <span
                  key={i}
                  style={{
                    fontFamily: isEmphasis ? brand.fontScript : brand.fontBold,
                    fontStyle: isEmphasis ? "italic" : "normal",
                    fontWeight: isEmphasis ? 700 : 900,
                    fontSize: isEmphasis ? "1.22em" : "1em",
                    color: isEmphasis || isSpoken ? brand.primary : "#FFFFFF",
                    textShadow: OUTLINE,
                    textTransform: range.uppercase && !isEmphasis ? "uppercase" : "none",
                  }}
                >
                  {w.text}
                </span>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    );
  }
  return null;
};
