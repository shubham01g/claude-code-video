import React from "react";
import { RoadmapCard } from "../../components";

// Scene 6 — AriseTransform Intro (0:30–0:37)
// "I'm Shubham, founder of AriseTransform, where we help businesses
//  to create custom web apps and mobile apps and give them their first MVP"
export const Scene6_RoadmapCard: React.FC = () => (
  <RoadmapCard
    overline="ARISETRANSFORM · WHAT WE DO"
    activeStep={3}
    steps={[
      {
        number: 1,
        title: "Custom Web Apps",
        subtitle: "Built for your business",
      },
      {
        number: 2,
        title: "Mobile Apps",
        subtitle: "iOS & Android",
      },
      {
        number: 3,
        title: "First MVP",
        subtitle: "In just 14 days",
      },
    ]}
  />
);
