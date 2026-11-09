import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { brand } from "../brand";
import { Background, Overline, IconBadge } from "./shared";

export interface PaymentRow {
  icon?: string;        // emoji or short text for badge
  label: string;        // e.g. "Editing client"
  value: string;        // e.g. "+$1,500"
  valueColor?: string;  // defaults to green for positive, orange for featured
  featured?: boolean;   // center/active row — larger, full orange badge
}

interface Props {
  overline?: string;
  rows: PaymentRow[];
}

export const StackedCards: React.FC<Props> = ({
  overline = "REAL EDITORS · REAL MONEY",
  rows,
}) => {
  const frame = useCurrentFrame();

  return (
    <Background>
      <Overline label={overline} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: "100%",
          maxWidth: 560,
        }}
      >
        {rows.map((row, i) => {
          const entryDelay = i * brand.staggerFrames;
          const f = frame - entryDelay;

          const opacity = interpolate(f, [0, brand.enterFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const y = interpolate(f, [0, brand.enterFrames], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const scale = interpolate(f, [0, brand.enterFrames], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          const valueColor = row.valueColor
            ? row.valueColor
            : row.featured
              ? brand.primary
              : "#22C55E"; // green for regular payments

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `scale(${scale}) translateY(${y}px)`,
                background: brand.cardBg,
                border: row.featured ? brand.activeBorder : brand.cardBorder,
                borderRadius: brand.borderRadius,
                boxShadow: row.featured
                  ? `${brand.cardShadow}, ${brand.activeGlow}`
                  : brand.cardShadow,
                padding: row.featured ? "18px 20px" : "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <IconBadge size={row.featured ? 42 : 34} active={row.featured}>
                {row.icon ?? "💳"}
              </IconBadge>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: brand.textMuted,
                    fontWeight: 500,
                    marginBottom: 2,
                    letterSpacing: "0.03em",
                  }}
                >
                  Payment received{row.featured ? " · just now" : ""}
                </div>
                <div
                  style={{
                    fontSize: row.featured ? 17 : 15,
                    fontWeight: 700,
                    color: brand.textPrimary,
                    fontFamily: brand.fontBold,
                  }}
                >
                  {row.label}
                </div>
              </div>

              <div
                style={{
                  fontSize: row.featured ? 22 : 18,
                  fontWeight: 800,
                  fontFamily: brand.fontBold,
                  color: valueColor,
                }}
              >
                {row.value}
              </div>
            </div>
          );
        })}
      </div>
    </Background>
  );
};
