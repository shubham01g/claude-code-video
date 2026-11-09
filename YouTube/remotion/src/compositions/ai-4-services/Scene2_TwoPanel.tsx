import React from "react";
import { TwoPanel } from "../../components";

// Scene 2 — Choosing the Right Service (0:05–0:09)
// "you can do it too by choosing the right AI service that you can sell
//  to the potential clients and in the market that still have demand"
export const Scene2_TwoPanel: React.FC = () => (
  <TwoPanel
    overline="THE KEY · TO EARNING"
    leftLabel="WHAT YOU CHOOSE"
    leftContent="The Right AI Service"
    rightLabel="WHERE YOU SELL"
    rightContent="Markets With Real Demand"
    caption="Choose smart → earn more"
    connector="arrow"
  />
);
