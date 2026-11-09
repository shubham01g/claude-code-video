import React from "react";
import { StatCallout } from "../../components";

// Scene 1 — Hook Message (0:01–0:05)
// "I make thousands of dollars by selling AI services to clients"
// *thousands* renders in Caveat italic orange
export const Scene1_StatCallout: React.FC = () => (
  <StatCallout
    overline="AI SERVICES · REAL INCOME"
    topLine="I make *thousands* selling"
    value="$1,000s"
    bottomLine="with *AI services* to clients"
    strikethrough={false}
  />
);
