import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { colors, FPS, fontFamily } from "../theme";

const out = Easing.bezier(0.22, 1, 0.36, 1);

/* Fades and rises an element in at `at` seconds and out at `until`. */
export const Reveal: React.FC<{
  at: number;
  until?: number;
  rise?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, until, rise = 26, children, style }) => {
  const frame = useCurrentFrame();
  const start = at * FPS;
  const opacity =
    until === undefined
      ? interpolate(frame, [start, start + 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : interpolate(
          frame,
          [start, start + 14, until * FPS - 10, until * FPS],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
  return (
    <div
      style={{
        opacity,
        translate: `0 ${interpolate(frame, [start, start + 20], [rise, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: out,
        })}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/* Reveals a line word by word, like a spoken sentence landing. */
export const WordReveal: React.FC<{
  text: string;
  at: number;
  perWord?: number;
  style?: React.CSSProperties;
}> = ({ text, at, perWord = 0.09, style }) => {
  const frame = useCurrentFrame();
  return (
    <span style={style}>
      {text.split(" ").map((word, index) => {
        const start = (at + index * perWord) * FPS;
        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: "inline-block",
              marginRight: "0.26em",
              opacity: interpolate(frame, [start, start + 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: `0 ${interpolate(frame, [start, start + 14], [18, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: out,
              })}px`,
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
};

/* Scene wrapper with a soft fade in and out. */
export const Scene: React.FC<{
  frames: number;
  background: string;
  children: React.ReactNode;
  holdEnd?: boolean;
}> = ({ frames, background, children, holdEnd = false }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background,
        fontFamily,
        color: colors.white,
        opacity: interpolate(
          frame,
          [0, 12, frames - 12, frames],
          [0, 1, 1, holdEnd ? 1 : 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        ),
      }}
    >
      {children}
    </div>
  );
};

export const SourceLine: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      left: 120,
      bottom: 64,
      color: colors.faint,
      fontSize: 22,
      fontWeight: 600,
    }}
  >
    {children}
  </div>
);
