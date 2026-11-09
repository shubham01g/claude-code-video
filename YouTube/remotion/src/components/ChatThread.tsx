import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { brand } from "../brand";
import { Background, Overline } from "./shared";

export interface ChatMessage {
  text: string;
  time: string;      // e.g. "Now", "5m ago", "1h ago"
  seen?: boolean;    // show "Seen" under message
}

interface Props {
  overline?: string;
  messages: ChatMessage[];
  // Bold pill caption below the card — the punchline
  caption?: string;
}

export const ChatThread: React.FC<Props> = ({
  overline = "SENT · SEEN · SILENCE",
  messages,
  caption,
}) => {
  const frame = useCurrentFrame();

  // Each bubble appears 18 frames apart to simulate real typing
  const framesPerBubble = 18;

  return (
    <Background>
      <Overline label={overline} />

      {/* Chat card */}
      <div
        style={{
          background: brand.cardBg,
          border: brand.cardBorder,
          borderRadius: brand.borderRadius,
          boxShadow: brand.cardShadow,
          padding: "28px 28px 20px",
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {/* Contact header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: `1px solid rgba(0,0,0,0.06)`,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            👤
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: brand.textPrimary }}>Prospect</div>
            <div style={{ fontSize: 11, color: brand.textMuted }}>Active recently</div>
          </div>
        </div>

        {/* Messages */}
        {messages.map((msg, i) => {
          const appearFrame = i * framesPerBubble;
          const opacity = interpolate(frame, [appearFrame, appearFrame + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const scale = interpolate(frame, [appearFrame, appearFrame + 8], [0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          const isLast = i === messages.length - 1;
          const noReply = msg.text === "" || msg.text.toLowerCase() === "no reply";

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `scale(${scale})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                marginBottom: isLast ? 0 : 4,
              }}
            >
              {!noReply ? (
                <div
                  style={{
                    background: brand.primary,
                    color: "#fff",
                    borderRadius: "18px 18px 4px 18px",
                    padding: "10px 16px",
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: brand.fontSans,
                    maxWidth: "85%",
                    lineHeight: 1.4,
                  }}
                >
                  {msg.text}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: brand.textMuted,
                    fontStyle: "italic",
                    fontFamily: brand.fontSans,
                  }}
                >
                  No reply
                </div>
              )}
              <div
                style={{
                  fontSize: 10,
                  color: brand.textMuted,
                  marginTop: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {msg.time}
                {msg.seen && (
                  <span style={{ color: "#60A5FA", fontWeight: 600 }}>· Seen</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Caption pill */}
      {caption && (
        <div
          style={{
            marginTop: 20,
            opacity: interpolate(frame, [messages.length * framesPerBubble, messages.length * framesPerBubble + brand.enterFrames], [0, 1], { extrapolateRight: "clamp" }),
            background: brand.cardBg,
            border: brand.cardBorder,
            borderRadius: 100,
            boxShadow: brand.cardShadow,
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 700,
            color: brand.textPrimary,
            fontFamily: brand.fontBold,
          }}
        >
          {caption}
        </div>
      )}
    </Background>
  );
};
