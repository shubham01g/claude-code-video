import React from "react";
import { StackedCards } from "../../components";

// Scene 3 — Value Proposition (0:13–0:18)
// "four different type of services that have the highest earning potential"
// Showcases all 3 things the viewer will learn
export const Scene3_StackedCards: React.FC = () => (
  <StackedCards
    overline="WHAT YOU'LL LEARN · IN THIS VIDEO"
    rows={[
      {
        icon: "🚀",
        label: "4 AI Services",
        value: "High Earning",
        featured: true,
      },
      {
        icon: "🎯",
        label: "4 Client Methods",
        value: "Get Clients",
        featured: false,
      },
      {
        icon: "🎁",
        label: "1 Bonus Method",
        value: "Free",
        featured: false,
      },
    ]}
  />
);
