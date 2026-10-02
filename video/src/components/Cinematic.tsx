import { Video } from "@remotion/media";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { colors, FPS, fontFamily } from "../theme";

const out = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* Animated film grain. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.16 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.75 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

export type Grade = "archive" | "mono" | "warm" | "natural";

const GRADES: Record<Grade, string> = {
  archive: "sepia(0.35) saturate(0.75) contrast(1.08) brightness(0.92)",
  mono: "grayscale(1) contrast(1.15) brightness(0.9)",
  warm: "saturate(1.08) contrast(1.05) brightness(0.95) sepia(0.12)",
  natural: "saturate(1.05) contrast(1.04)",
};

/* A footage shot with a slow push-in, grade, grain and vignette. */
export const Shot: React.FC<{
  src: string;
  frames: number;
  grade?: Grade;
  zoom?: [number, number];
  drift?: [number, number];
  dim?: number;
  playbackRate?: number;
}> = ({ src, frames, grade = "natural", zoom = [1.04, 1.16], drift = [0, 0], dim = 0, playbackRate = 1 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, frames], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <AbsoluteFill
        style={{
          scale: String(zoom[0] + (zoom[1] - zoom[0]) * p),
          translate: `${drift[0] * p}px ${drift[1] * p}px`,
          filter: GRADES[grade],
        }}
      >
        <Video
          src={staticFile(`footage/${src}.mp4`)}
          muted
          playbackRate={playbackRate}
          objectFit="cover"
          style={{ width: "100%", height: "100%" }}
        />
      </AbsoluteFill>
      {dim > 0 && <AbsoluteFill style={{ backgroundColor: `rgba(8,6,20,${dim})` }} />}
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};

/* Cross-dissolving sequence of shots. */
export const Montage: React.FC<{
  shots: { src: string; frames: number; grade?: Grade; zoom?: [number, number]; drift?: [number, number]; dim?: number }[];
  fade?: number;
}> = ({ shots, fade = 10 }) => {
  let start = 0;
  return (
    <AbsoluteFill>
      {shots.map((shot, index) => {
        const from = start;
        start += shot.frames;
        return (
          <Sequence key={`${shot.src}-${index}`} from={Math.max(0, from - (index ? fade : 0))} durationInFrames={shot.frames + (index ? fade : 0)} name={shot.src}>
            <FadeIn frames={index ? fade : 0}>
              <Shot {...shot} frames={shot.frames + fade} />
            </FadeIn>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const FadeIn: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: frames ? interpolate(frame, [0, frames], [0, 1], clamp) : 1 }}>
      {children}
    </AbsoluteFill>
  );
};

/* Name strap at the bottom left, like a documentary. */
export const LowerThird: React.FC<{ at: number; until: number; name: string; detail: string }> = ({
  at,
  until,
  name,
  detail,
}) => {
  const frame = useCurrentFrame();
  const s = at * FPS;
  const e = until * FPS;
  const bar = interpolate(frame, [s, s + 14], [0, 1], { ...clamp, easing: out });
  return (
    <div
      style={{
        position: "absolute",
        left: 110,
        bottom: 150,
        fontFamily,
        color: "#fff",
        opacity: interpolate(frame, [s, s + 8, e - 10, e], [0, 1, 1, 0], clamp),
      }}
    >
      <div style={{ width: 90 * bar, height: 6, borderRadius: 3, backgroundColor: colors.rose, marginBottom: 18 }} />
      <div
        style={{
          fontSize: 76,
          fontWeight: 800,
          letterSpacing: "-0.035em",
          lineHeight: 1,
          textShadow: "0 4px 30px rgba(0,0,0,0.6)",
          translate: `${interpolate(frame, [s, s + 18], [-30, 0], { ...clamp, easing: out })}px 0`,
        }}
      >
        {name}
      </div>
      <div
        style={{
          marginTop: 14,
          maxWidth: 1000,
          fontSize: 34,
          fontWeight: 600,
          lineHeight: 1.3,
          color: "rgba(255,255,255,0.86)",
          textShadow: "0 2px 20px rgba(0,0,0,0.7)",
          opacity: interpolate(frame, [s + 8, s + 20], [0, 1], clamp),
        }}
      >
        {detail}
      </div>
    </div>
  );
};

/* Small source credit, bottom right. */
export const Credit: React.FC<{ children: React.ReactNode; at?: number; until?: number }> = ({
  children,
  at = 0,
  until = 9999,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        right: 48,
        bottom: 38,
        maxWidth: 900,
        textAlign: "right",
        fontFamily,
        fontSize: 19,
        fontWeight: 600,
        color: "rgba(255,255,255,0.62)",
        textShadow: "0 1px 8px rgba(0,0,0,0.8)",
        opacity: interpolate(frame, [at * FPS, at * FPS + 10, until * FPS - 10, until * FPS], [0, 1, 1, 0], clamp),
      }}
    >
      {children}
    </div>
  );
};

/* A real article clipping that drops onto the desk with a little spin. */
export const Clipping: React.FC<{
  src: string;
  outlet: string;
  date: string;
  at: number;
  x: number;
  y: number;
  width: number;
  rotate: number;
  dark?: boolean;
}> = ({ src, outlet, date, at, x, y, width, rotate, dark = false }) => {
  const frame = useCurrentFrame();
  const s = at * FPS;
  const drop = interpolate(frame, [s, s + 16], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 1.3, 0.4, 1) });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        padding: 26,
        borderRadius: 6,
        backgroundColor: dark ? "#273c42" : "#fbfaf6",
        boxShadow: "0 30px 70px -20px rgba(0,0,0,0.75), 0 2px 6px rgba(0,0,0,0.3)",
        opacity: interpolate(frame, [s, s + 6], [0, 1], clamp),
        scale: String(1.35 - 0.35 * drop),
        rotate: `${rotate + (1 - drop) * 8}deg`,
        translate: `0 ${(1 - drop) * -60}px`,
        fontFamily,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          paddingBottom: 12,
          marginBottom: 6,
          borderBottom: `2px solid ${dark ? "rgba(255,255,255,0.25)" : "#1b1b1b"}`,
          color: dark ? "#fff" : "#1b1b1b",
        }}
      >
        <span style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 700, fontStyle: "italic" }}>{outlet}</span>
        <span style={{ fontSize: 18, fontWeight: 700, opacity: 0.7 }}>{date}</span>
      </div>
      <Img src={staticFile(`clips-news/${src}.png`)} style={{ width: "100%", display: "block" }} />
    </div>
  );
};

/* Dark wooden-desk style surface for clippings. */
export const Desk: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(70% 60% at 50% 40%, #2a2338 0%, #120f1c 70%, #07060c 100%)",
    }}
  >
    <Grain opacity={0.22} />
  </AbsoluteFill>
);

/* Slow camera move across a whole layer (clippings, covers). */
export const Camera: React.FC<{
  from: { scale: number; x: number; y: number };
  to: { scale: number; x: number; y: number };
  start: number;
  end: number;
  children: React.ReactNode;
}> = ({ from, to, start, end, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start * FPS, end * FPS], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill
      style={{
        transformOrigin: "50% 50%",
        scale: String(from.scale + (to.scale - from.scale) * p),
        translate: `${from.x + (to.x - from.x) * p}px ${from.y + (to.y - from.y) * p}px`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
