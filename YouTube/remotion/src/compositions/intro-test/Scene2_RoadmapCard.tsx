import React from "react";
import { RoadmapCard } from "../../components";

export const Scene2_RoadmapCard: React.FC = () => (
  <RoadmapCard
    overline="HOW YOU CAN DO THE SAME"
    activeStep={1}
    steps={[
      {
        number: 1,
        title: "Build The Skill",
        subtitle: "AI apps + services",
      },
      {
        number: 2,
        title: "Stack Clients",
        subtitle: "Fiverr + cold outreach",
      },
      {
        number: 3,
        title: "$10K / Month",
        subtitle: "Referrals fill the roster",
      },
    ]}
  />
);
