import React from "react";
import { StatCallout } from "../../components";

// "sixty" renders in Caveat italic orange — visible font contrast
export const Scene1_StatCallout: React.FC = () => (
  <StatCallout
    overline="THE LAST 60 DAYS"
    topLine="What I made in *sixty* days"
    value="$2,986"
    bottomLine="selling AI apps and services"
    strikethrough={false}
  />
);
