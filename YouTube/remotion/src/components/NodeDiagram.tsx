import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { brand } from "../brand";
import { Background } from "./shared";

export interface DiagramNode {
  number: number;
  label: string;
}

interface Props {
  nodes: DiagramNode[];       // exactly 3 nodes — triangle formation
  scriptLine?: string;        // italic FONT_SCRIPT line above headline
  headline: string;           // big FONT_BOLD headline below diagram
}

// Triangle node positions (as % of container 400×280)
const NODE_POSITIONS = [
  { x: 200, y: 30 },   // top center
  { x: 60,  y: 220 },  // bottom left
  { x: 340, y: 220 },  // bottom right
];

// Edges connecting the 3 nodes
const EDGES = [
  [0, 1], // top → bottom-left
  [1, 2], // bottom-left → bottom-right
  [2, 0], // bottom-right → top
];

export const NodeDiagram: React.FC<Props> = ({ nodes, scriptLine, headline }) => {
  const frame = useCurrentFrame();

  const W = 400;
  const H = 280;

  // Node glow pulse
  const glowPulse = 0.2 + 0.1 * Math.sin((frame / 30) * Math.PI * 2);

  // Dot travels along edge 0 (top → bottom-left) continuously
  const dotProgress = ((frame % 60) / 60);
  const edgeIndex = 0;
  const fromNode = NODE_POSITIONS[EDGES[edgeIndex][0]];
  const toNode = NODE_POSITIONS[EDGES[edgeIndex][1]];
  const dotX = fromNode.x + (toNode.x - fromNode.x) * dotProgress;
  const dotY = fromNode.y + (toNode.y - fromNode.y) * dotProgress;

  const nodeOpacity = interpolate(frame, [0, brand.enterFrames], [0, 1], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [brand.enterFrames, brand.enterFrames * 2], [0, 1], { extrapolateRight: "clamp" });

  return (
    <Background>
      {/* SVG diagram */}
      <svg
        width={W}
        height={H}
        style={{ overflow: "visible", opacity: nodeOpacity }}
        viewBox={`0 0 ${W} ${H}`}
      >
        {/* Dashed edges */}
        {EDGES.map(([from, to], i) => {
          const a = NODE_POSITIONS[from];
          const b = NODE_POSITIONS[to];
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={brand.primary}
              strokeOpacity={0.25}
              strokeWidth={1.5}
              strokeDasharray="6 5"
            />
          );
        })}

        {/* Traveling dot */}
        <circle
          cx={dotX}
          cy={dotY}
          r={5}
          fill="#FFFFFF"
          style={{ filter: `drop-shadow(0 0 6px ${brand.primary})` }}
        />

        {/* Nodes */}
        {nodes.slice(0, 3).map((node, i) => {
          const pos = NODE_POSITIONS[i];
          return (
            <g key={i}>
              {/* Outer glow ring */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={32}
                fill={`rgba(249, 115, 22, ${glowPulse})`}
              />
              {/* Node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={24}
                fill={brand.primary}
                style={{ filter: `drop-shadow(0 0 12px ${brand.accentGlow})` }}
              />
              {/* Number */}
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#FFFFFF"
                fontSize={14}
                fontWeight={900}
                fontFamily="Inter, sans-serif"
              >
                {node.number}
              </text>
              {/* Node label below */}
              <text
                x={pos.x}
                y={pos.y + (i === 0 ? -44 : 44)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={brand.textPrimary}
                fontSize={12}
                fontWeight={600}
                fontFamily="Inter, sans-serif"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Text block below */}
      <div
        style={{
          marginTop: 32,
          opacity: textOpacity,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {scriptLine && (
          <div
            style={{
              fontFamily: brand.fontScript,
              fontStyle: "italic",
              fontSize: 22,
              color: brand.textMuted,
              fontWeight: 500,
            }}
          >
            {scriptLine}
          </div>
        )}
        <div
          style={{
            fontFamily: brand.fontBold,
            fontSize: 38,
            fontWeight: 900,
            color: brand.textPrimary,
            lineHeight: 1.1,
            letterSpacing: "-0.5px",
          }}
        >
          {headline}
        </div>
      </div>
    </Background>
  );
};
