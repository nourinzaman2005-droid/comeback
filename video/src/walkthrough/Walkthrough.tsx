import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import { BEATS, beatFrames, clipFrames } from "../edit";
import { colors, fontFamily, FPS, nightBackground } from "../theme";
import { AppWindow, ScreenClip } from "./ScreenStudio";

const fade = (frame: number, total: number) =>
  interpolate(frame, [0, 8, total - 8, total], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/* Feature label and spoken line under the window, so the story works on mute. */
const Caption: React.FC<{ feature: string; narration: string; total: number }> = ({
  feature,
  narration,
  total,
}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 14], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 240,
        right: 240,
        bottom: 22,
        display: "flex",
        alignItems: "center",
        gap: 22,
        opacity: fade(frame, total),
        translate: `0 ${enter}px`,
        fontFamily,
      }}
    >
      <span
        style={{
          flex: "none",
          padding: "9px 18px",
          borderRadius: 999,
          backgroundColor: colors.violet,
          color: "#fff",
          fontSize: 22,
          fontWeight: 800,
          boxShadow: "0 10px 24px -10px rgba(91,63,217,0.9)",
        }}
      >
        {feature}
      </span>
      <span style={{ color: "#fff", fontSize: 25, fontWeight: 600, lineHeight: 1.3 }}>
        {narration}
      </span>
    </div>
  );
};

export const Walkthrough: React.FC = () => {
  let cursor = 0;
  let clipIndex = 0;
  return (
    <AbsoluteFill style={{ background: nightBackground }}>
      <AppWindow url="nourinzaman2005-droid.github.io/comeback">
        {BEATS.map((beat) =>
          beat.clips.map((clip, index) => {
            const from = cursor;
            const fileIndex = clipIndex++;
            cursor += clipFrames(clip);
            return (
              <Sequence
                key={`${beat.feature}-${index}`}
                from={from}
                durationInFrames={clipFrames(clip)}
                name={`${beat.feature} ${index + 1}`}
              >
                <ScreenClip clip={clip} index={fileIndex} />
              </Sequence>
            );
          }),
        )}
      </AppWindow>
      {(() => {
        let start = 0;
        return BEATS.map((beat) => {
          const from = start;
          const total = beatFrames(beat);
          start += total;
          return (
            <Sequence
              key={beat.feature}
              from={from}
              durationInFrames={total}
              name={`Caption: ${beat.feature}`}
            >
              <Caption feature={beat.feature} narration={beat.narration} total={total} />
            </Sequence>
          );
        });
      })()}
    </AbsoluteFill>
  );
};

export const WALKTHROUGH_SECONDS = (frames: number) => frames / FPS;
