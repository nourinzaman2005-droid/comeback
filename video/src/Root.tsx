import React from "react";
import { Composition, Folder } from "remotion";
import { WALKTHROUGH_FRAMES } from "./edit";
import { Promo, PROMO_FRAMES } from "./Promo";
import { Hook, HOOK_FRAMES } from "./scenes/Hook";
import { Impact, IMPACT_FRAMES } from "./scenes/Impact";
import { Team, TEAM_FRAMES } from "./scenes/Team";
import { Turn, TURN_FRAMES } from "./scenes/Turn";
import { FPS } from "./theme";
import { Walkthrough } from "./walkthrough/Walkthrough";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ComeBackPromo"
        component={Promo}
        durationInFrames={PROMO_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ withVoiceover: false }}
      />
      <Folder name="Scenes">
        <Composition id="Hook" component={Hook} durationInFrames={HOOK_FRAMES} fps={FPS} width={1920} height={1080} />
        <Composition id="Turn" component={Turn} durationInFrames={TURN_FRAMES} fps={FPS} width={1920} height={1080} />
        <Composition id="Team" component={Team} durationInFrames={TEAM_FRAMES} fps={FPS} width={1920} height={1080} />
        <Composition
          id="Walkthrough"
          component={Walkthrough}
          durationInFrames={WALKTHROUGH_FRAMES}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition id="Impact" component={Impact} durationInFrames={IMPACT_FRAMES} fps={FPS} width={1920} height={1080} />
      </Folder>
    </>
  );
};
