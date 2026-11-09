import "./index.css";
import React from "react";
import { Composition } from "remotion";

// intro-test (previous)
import { Scene1_StatCallout } from "./compositions/intro-test/Scene1_StatCallout";
import { Scene2_RoadmapCard } from "./compositions/intro-test/Scene2_RoadmapCard";

// ai-4-services — "4 AI Services That Give You Thousands of Dollars" (Intro, 7 scenes)
import { Scene1_StatCallout as AI4S_S1 } from "./compositions/ai-4-services/Scene1_StatCallout";
import { Scene2_TwoPanel as AI4S_S2 } from "./compositions/ai-4-services/Scene2_TwoPanel";
import { Scene3_StackedCards as AI4S_S3 } from "./compositions/ai-4-services/Scene3_StackedCards";
import { Scene4_QuoteOverlay as AI4S_S4 } from "./compositions/ai-4-services/Scene4_QuoteOverlay";
import { Scene5_FloatingText as AI4S_S5 } from "./compositions/ai-4-services/Scene5_FloatingText";
import { Scene6_RoadmapCard as AI4S_S6 } from "./compositions/ai-4-services/Scene6_RoadmapCard";
import { Scene7_StatCallout as AI4S_S7 } from "./compositions/ai-4-services/Scene7_StatCallout";

// claude-code-lessons — "Everything I wish I knew" intro (3 scenes, 15s)
import { Scene1_HoursCounter as CCL_S1 } from "./compositions/claude-code-lessons/Scene1_HoursCounter";
import { Scene2_BuildHub as CCL_S2 } from "./compositions/claude-code-lessons/Scene2_BuildHub";
import { Scene3_WishIKnew as CCL_S3 } from "./compositions/claude-code-lessons/Scene3_WishIKnew";

// claude-edit-intro — "This entire video is edited by Claude" intro (3 scenes, 21s)
import { Scene1_EditedByClaude as CEI_S1 } from "./compositions/claude-edit-intro/Scene1_EditedByClaude";
import { Scene2_ClaudeAddsHub as CEI_S2 } from "./compositions/claude-edit-intro/Scene2_ClaudeAddsHub";
import { Scene3_EveryFormat as CEI_S3 } from "./compositions/claude-edit-intro/Scene3_EveryFormat";

// YouTube thumbnail — glowing comparison panels (still, props per video: /ship-video)
import { PanelThumbnail, panelThumbnailDefaults } from "./components/PanelThumbnail";

// polish pass — zooms, popups and captions over a finished cut (/youtube-edit polish)
import { MainEdit, mainEditDefaults } from "./polish/MainEdit";

// vertical reel — face in the bottom panel, motion graphics on top (/reel-edit)
import { ReelEdit, reelEditDefaults } from "./reel/ReelEdit";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="PanelThumbnail" component={PanelThumbnail} defaultProps={panelThumbnailDefaults} durationInFrames={1} fps={30} width={1280} height={720} />

      {/* ── vertical reel — fps and length come from the source video via props ── */}
      <Composition
        id="ReelEdit"
        component={ReelEdit}
        defaultProps={reelEditDefaults}
        durationInFrames={reelEditDefaults.durationInFrames}
        fps={reelEditDefaults.fps}
        width={reelEditDefaults.width}
        height={reelEditDefaults.height}
        calculateMetadata={({ props }) => ({
          durationInFrames: props.durationInFrames,
          fps: props.fps,
          width: props.width,
          height: props.height,
        })}
      />

      {/* ── polish pass — size, fps and length come from the cut video via props ── */}
      <Composition
        id="MainEdit"
        component={MainEdit}
        defaultProps={mainEditDefaults}
        durationInFrames={mainEditDefaults.durationInFrames}
        fps={mainEditDefaults.fps}
        width={mainEditDefaults.width}
        height={mainEditDefaults.height}
        calculateMetadata={({ props }) => ({
          durationInFrames: props.durationInFrames,
          fps: props.fps,
          width: props.width,
          height: props.height,
        })}
      />

      {/* ── intro-test ── */}
      <Composition
        id="IntroTest-Scene1-StatCallout"
        component={Scene1_StatCallout}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="IntroTest-Scene2-RoadmapCard"
        component={Scene2_RoadmapCard}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* ── ai-4-services — Intro (7 scenes) ── */}

      {/* Scene 1: Hook "$1,000s" StatCallout (0:01–0:05) */}
      <Composition
        id="AI4Services-Scene1-StatCallout"
        component={AI4S_S1}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Scene 2: "Right AI Service → Market With Demand" TwoPanel (0:05–0:09) */}
      <Composition
        id="AI4Services-Scene2-TwoPanel"
        component={AI4S_S2}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Scene 3: Value Proposition StackedCards (0:13–0:18) */}
      <Composition
        id="AI4Services-Scene3-StackedCards"
        component={AI4S_S3}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Scene 4: "methods that bring you clients" QuoteOverlay (0:21–0:25) */}
      <Composition
        id="AI4Services-Scene4-QuoteOverlay"
        component={AI4S_S4}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Scene 5: "Watch Till The End" FloatingText (0:27–0:29) */}
      <Composition
        id="AI4Services-Scene5-FloatingText"
        component={AI4S_S5}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Scene 6: AriseTransform Roadmap — Web→Mobile→MVP (0:30–0:37) */}
      <Composition
        id="AI4Services-Scene6-RoadmapCard"
        component={AI4S_S6}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Scene 7: "14 Days" MVP StatCallout (0:38–0:41) */}
      <Composition
        id="AI4Services-Scene7-StatCallout"
        component={AI4S_S7}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* ── claude-code-lessons — Intro (3 scenes, 0:00–0:15) ── */}

      {/* Scene 1: "thousands of hours on Claude Code" HoursCounter (0:00–0:04) */}
      <Composition
        id="ClaudeCodeLessons-Scene1-HoursCounter"
        component={CCL_S1}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Scene 2: "web apps, skills, agents, operating systems" BuildHub (0:04–0:09) */}
      <Composition
        id="ClaudeCodeLessons-Scene2-BuildHub"
        component={CCL_S2}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Scene 3: "everything I wish I knew when I started" WishIKnew (0:09–0:15) */}
      <Composition
        id="ClaudeCodeLessons-Scene3-WishIKnew"
        component={CCL_S3}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* ── claude-edit-intro — Intro (3 scenes, 0:00–0:21) ── */}

      {/* Scene 1: "This entire video is edited by Claude" EditedByClaude (0:00–0:04) */}
      <Composition id="ClaudeEditIntro-Scene1-EditedByClaude" component={CEI_S1} durationInFrames={126} fps={30} width={1920} height={1080} />

      {/* Scene 2: "motion graphics, B-rolls, text, logos, animation, captions" ClaudeAddsHub (0:04–0:14) */}
      <Composition id="ClaudeEditIntro-Scene2-ClaudeAddsHub" component={CEI_S2} durationInFrames={297} fps={30} width={1920} height={1080} />

      {/* Scene 3: "Instagram Reels, YouTube Shorts, intro videos" EveryFormat (0:14–0:21) */}
      <Composition id="ClaudeEditIntro-Scene3-EveryFormat" component={CEI_S3} durationInFrames={204} fps={30} width={1920} height={1080} />
    </>
  );
};
