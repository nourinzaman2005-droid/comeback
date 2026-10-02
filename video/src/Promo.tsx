import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { WALKTHROUGH_FRAMES } from "./edit";
import { Hook, HOOK_FRAMES } from "./scenes/Hook";
import { Impact, IMPACT_FRAMES } from "./scenes/Impact";
import { Team, TEAM_FRAMES } from "./scenes/Team";
import { Turn, TURN_FRAMES } from "./scenes/Turn";
import { colors } from "./theme";
import { Walkthrough } from "./walkthrough/Walkthrough";

export const PROMO_FRAMES =
  HOOK_FRAMES + TURN_FRAMES + TEAM_FRAMES + WALKTHROUGH_FRAMES + IMPACT_FRAMES;

export type PromoProps = {
  /* Set to true after saving the narration as public/voiceover.mp3. */
  withVoiceover: boolean;
};

export const Promo: React.FC<PromoProps> = ({ withVoiceover }) => {
  const scenes = [
    { name: "Hook", frames: HOOK_FRAMES, node: <Hook /> },
    { name: "Turn", frames: TURN_FRAMES, node: <Turn /> },
    { name: "Team", frames: TEAM_FRAMES, node: <Team /> },
    { name: "Walkthrough", frames: WALKTHROUGH_FRAMES, node: <Walkthrough /> },
    { name: "Impact", frames: IMPACT_FRAMES, node: <Impact /> },
  ];
  let start = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: colors.night }}>
      {scenes.map((scene) => {
        const from = start;
        start += scene.frames;
        return (
          <Sequence key={scene.name} name={scene.name} from={from} durationInFrames={scene.frames}>
            {scene.node}
          </Sequence>
        );
      })}
      {withVoiceover && <Audio src={staticFile("voiceover.mp3")} />}
    </AbsoluteFill>
  );
};
