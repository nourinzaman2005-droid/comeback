import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import {
  Camera,
  Clipping,
  Credit,
  Desk,
  LowerThird,
  Montage,
  Shot,
} from "../components/Cinematic";
import { WordReveal } from "../components/Motion";
import { colors, FPS, fontFamily } from "../theme";

export const HOOK_FRAMES = 24 * FPS;

const BigLine: React.FC<{ text: string; at: number; color?: string; top: number }> = ({
  text,
  at,
  color = "#fff",
  top,
}) => (
  <div
    style={{
      position: "absolute",
      left: 120,
      right: 120,
      top,
      fontFamily,
      fontSize: 104,
      fontWeight: 800,
      letterSpacing: "-0.04em",
      color,
      textShadow: "0 6px 40px rgba(0,0,0,0.7)",
    }}
  >
    <WordReveal text={text} at={at} perWord={0.12} />
  </div>
);

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 0 to 5s: who she was, archive match footage */}
      <Sequence durationInFrames={5.2 * FPS} name="Archive">
        <Montage
          shots={[
            { src: "sl-drive", frames: 2.6 * FPS, grade: "archive", zoom: [1.08, 1.18], drift: [-30, 0] },
            { src: "sl-closeup", frames: 2.6 * FPS, grade: "archive", zoom: [1.12, 1.24], drift: [20, -10] },
          ]}
        />
        <LowerThird
          at={0.4}
          until={5}
          name="Hiruka Fernando"
          detail="Sri Lanka's best batter in the late 2000s. The first Sri Lankan woman to score 1,000 ODI runs."
        />
        <Credit>Archive: Sri Lanka women, ICC Women&apos;s World Cup 2013 (ICC / Sky Sports)</Credit>
      </Sequence>

      {/* 5 to 10s: the baby, the break */}
      <Sequence from={5 * FPS} durationInFrames={5.2 * FPS} name="Baby">
        <Shot src="baby-bw" frames={5.2 * FPS} grade="mono" zoom={[1.05, 1.2]} dim={0.5} />
        <BigLine text="Then she had a baby." at={0.3} top={360} />
        <BigLine text="No plan. No support." at={2.2} top={490} color={colors.roseSoft} />
        <Credit>Stock footage: Pexels</Credit>
      </Sequence>

      {/* 10 to 15s: the captain's words, real article */}
      <Sequence from={10 * FPS} durationInFrames={5.2 * FPS} name="Article 1">
        <Desk />
        <Camera from={{ scale: 1.0, x: 0, y: 30 }} to={{ scale: 1.32, x: 160, y: -170 }} start={0.6} end={5}>
          <Clipping
            src="cricket-monthly-hiruka"
            outlet="The Cricket Monthly"
            date="8 March 2022"
            at={0.1}
            x={330}
            y={260}
            width={1260}
            rotate={-2}
          />
        </Camera>
      </Sequence>

      {/* 15 to 20s: Nain Abidi, real century footage plus her words */}
      <Sequence from={15 * FPS} durationInFrames={5.2 * FPS} name="Abidi">
        <Shot src="abidi-century" frames={5.2 * FPS} grade="archive" zoom={[1.1, 1.22]} drift={[0, -20]} dim={0.15} />
        <Clipping
          src="cricket-monthly-abidi"
          outlet="The Cricket Monthly"
          date="8 March 2022"
          at={1.0}
          x={880}
          y={150}
          width={940}
          rotate={2.5}
        />
        <LowerThird at={0.3} until={5} name="Nain Abidi" detail="Pakistan's first woman to score an ODI century" />
        <Credit>Archive: Nain Abidi&apos;s ODI century v Ireland</Credit>
      </Sequence>

      {/* 20 to 24s: the pattern, clippings pile up */}
      <Sequence from={20 * FPS} durationInFrames={4 * FPS} name="Pile">
        <Desk />
        <Camera from={{ scale: 1.08, x: 0, y: 0 }} to={{ scale: 0.98, x: 0, y: 0 }} start={0} end={4}>
          <Clipping src="cricket-monthly-hiruka" outlet="The Cricket Monthly" date="8 March 2022" at={0} x={120} y={120} width={900} rotate={-6} />
          <Clipping src="cricket-monthly-abidi" outlet="The Cricket Monthly" date="8 March 2022" at={0.15} x={900} y={170} width={880} rotate={5} />
          <Clipping src="mlp-aca" outlet="MLP Law" date="18 November 2019" at={0.7} x={430} y={380} width={1060} rotate={-1.5} dark />
        </Camera>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 70,
            textAlign: "center",
            fontFamily,
            fontSize: 30,
            fontWeight: 700,
            color: "rgba(255,255,255,0.8)",
            opacity: interpolate(frame, [21.6 * FPS, 22 * FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          The Australian Cricketers&apos; Association chief executive, 2019
        </div>
      </Sequence>

      {/* Gentle fade to black at the end of the hook */}
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          pointerEvents: "none",
          opacity: interpolate(frame, [HOOK_FRAMES - 10, HOOK_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      />
    </AbsoluteFill>
  );
};
