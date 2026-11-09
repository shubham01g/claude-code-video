import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { brand } from "../brand";
import { Background, Overline } from "./shared";

interface Props {
  overline?: string;
  // Quote text — wrap emphasis words in *asterisks* for FONT_SCRIPT orange treatment
  quote: string;
  speaker?: string;
}

export const QuoteOverlay: React.FC<Props> = ({
  overline = "THE INSIGHT",
  quote,
  speaker,
}) => {
  const frame = useCurrentFrame();

  // Split on spaces, preserving *word* markers
  const tokens = quote.split(/(\s+)/);

  // Build renderable word list
  const words: Array<{ text: string; isScript: boolean }> = [];
  let inScript = false;
  let buffer = "";
  for (const token of tokens) {
    if (token.trim() === "") {
      // space — push buffer word if any
      if (buffer) {
        words.push({ text: buffer, isScript: inScript });
        buffer = "";
      }
      continue;
    }
    for (let j = 0; j < token.length; j++) {
      if (token[j] === "*") {
        if (buffer) {
          words.push({ text: buffer, isScript: inScript });
          buffer = "";
        }
        inScript = !inScript;
      } else {
        buffer += token[j];
      }
    }
    if (buffer) {
      words.push({ text: buffer, isScript: inScript });
      buffer = "";
      inScript = false;
    }
  }
  if (buffer) words.push({ text: buffer, isScript: inScript });

  const framesPerWord = 3;

  const speakerOpacity = interpolate(
    frame,
    [words.length * framesPerWord, words.length * framesPerWord + brand.enterFrames],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <Background>
      <Overline label={overline} />

      <div
        style={{
          maxWidth: 820,
          textAlign: "center",
          fontSize: 34,
          lineHeight: 1.5,
        }}
      >
        {words.map((w, i) => {
          const wFrame = i * framesPerWord;
          const opacity = interpolate(frame, [wFrame, wFrame + 6], [0, 1], { extrapolateRight: "clamp" });
          return (
            <span
              key={i}
              style={{
                opacity,
                fontFamily: w.isScript ? brand.fontScript : brand.fontSans,
                fontStyle: w.isScript ? "italic" : "normal",
                fontSize: w.isScript ? 40 : 34,
                fontWeight: w.isScript ? 600 : 600,
                color: w.isScript ? brand.primary : brand.textPrimary,
                marginRight: "0.25em",
                display: "inline-block",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>

      {speaker && (
        <div
          style={{
            marginTop: 32,
            opacity: speakerOpacity,
            fontSize: 14,
            color: brand.textMuted,
            fontFamily: brand.fontSans,
            fontWeight: 500,
            letterSpacing: "0.06em",
          }}
        >
          — {speaker}
        </div>
      )}
    </Background>
  );
};
