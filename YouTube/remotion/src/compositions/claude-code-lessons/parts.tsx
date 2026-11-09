import React from "react";
import { brand } from "../../brand";

// Lesson accent colours — match the lesson board presentation (YouTube/HTML-Presentations/claude-code-lessons)
export const lessonColors = ["#F97316", "#22C55E", "#14B8A6", "#A855F7", "#F59E0B", "#EF4444", "#3B82F6"];

// "*word*" → Caveat italic orange, everything else Inter
export const MixedLine: React.FC<{ text: string; size?: number; opacity?: number; y?: number }> = ({
  text,
  size = 38,
  opacity = 1,
  y = 0,
}) => {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "center",
        gap: "0.25em",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      {parts.map((p, i) =>
        p.startsWith("*") ? (
          <span
            key={i}
            style={{
              fontFamily: brand.fontScript,
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: size * 1.25,
              color: brand.primary,
            }}
          >
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={i} style={{ fontFamily: brand.fontSans, fontWeight: 600, fontSize: size, color: brand.textPrimary }}>
            {p.trim()}
          </span>
        )
      )}
    </div>
  );
};
