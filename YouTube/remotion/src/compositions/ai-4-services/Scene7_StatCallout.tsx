import React from "react";
import { StatCallout } from "../../components";

// Scene 7 — MVP Timeline Stat (0:38–0:41)
// "give them their first MVP in just fourteen days"
// Hero number = 14 with "days" suffix
export const Scene7_StatCallout: React.FC = () => (
  <StatCallout
    overline="YOUR FIRST MVP"
    topLine="We deliver your *first* product in"
    value="14 Days"
    bottomLine="So without *wasting* any time — *let's dive in*"
    strikethrough={false}
  />
);
