import { Video } from "@remotion/media";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import timeline from "../../public/rec/timeline.json";
import type { Clip, Source } from "../edit";
import { colors, FPS, fontFamily } from "../theme";

/* Recorded viewport in CSS pixels. The footage itself is 2x for sharp zooms. */
const W = timeline.viewport.width;
const H = timeline.viewport.height;

type Point = { x: number; y: number };
type TimelineEvent = {
  t: number;
  type: string;
  x?: number;
  y?: number;
  scale?: number;
  from?: Point;
  to?: Point;
  duration?: number;
};

const events: Record<Source, TimelineEvent[]> = {
  player: timeline.player.events as TimelineEvent[],
  clinician: timeline.clinician.events as TimelineEvent[],
};

const ZOOM_SECONDS = 1.0;
const GLIDE_SECONDS = 0.55;
const zoomEase = Easing.bezier(0.25, 1, 0.5, 1);
const glideEase = Easing.bezier(0.45, 0, 0.2, 1);

type Camera = { scale: number; x: number; y: number };

function lerp(a: number, b: number, p: number) {
  return a + (b - a) * p;
}

/* Camera state at a source time: each zoom event eases from wherever the
   camera was to the new target, like Screen Studio's auto zoom. */
function cameraAt(source: Source, time: number): Camera {
  let from: Camera = { scale: 1, x: W / 2, y: H / 2 };
  let target: Camera = from;
  let start = -Infinity;
  const at = (t: number) => {
    const p = zoomEase(Math.min(1, Math.max(0, (t - start) / ZOOM_SECONDS)));
    return {
      scale: lerp(from.scale, target.scale, p),
      x: lerp(from.x, target.x, p),
      y: lerp(from.y, target.y, p),
    };
  };
  for (const event of events[source]) {
    if (event.type !== "zoom" || event.t > time) continue;
    from = start === -Infinity ? target : at(event.t);
    target = { scale: event.scale ?? 1, x: event.x ?? W / 2, y: event.y ?? H / 2 };
    start = event.t;
  }
  return start === -Infinity ? target : at(time);
}

function cursorAt(source: Source, time: number): Point {
  let position: Point = { x: W * 0.62, y: H * 0.58 };
  for (const event of events[source]) {
    if (event.type !== "move" || event.t > time || !event.to) continue;
    const origin = event.from ?? position;
    const glide = Math.min(event.duration ?? GLIDE_SECONDS, GLIDE_SECONDS);
    const p = glideEase(Math.min(1, (time - event.t) / glide));
    position = { x: lerp(origin.x, event.to.x, p), y: lerp(origin.y, event.to.y, p) };
  }
  return position;
}

/* Seconds since the cursor last moved or clicked, so it can fade when idle. */
function idleFor(source: Source, time: number) {
  let last = -Infinity;
  for (const event of events[source]) {
    if (event.t > time) continue;
    if (event.type === "move")
      last = Math.max(last, event.t + Math.min(event.duration ?? 0, GLIDE_SECONDS));
    if (event.type === "click" || event.type === "typing-start") last = Math.max(last, event.t);
  }
  return time - last;
}

function lastClick(source: Source, time: number) {
  let found: TimelineEvent | null = null;
  for (const event of events[source]) {
    if (event.type === "click" && event.t <= time) found = event;
  }
  return found;
}

const Cursor: React.FC<{ point: Point; pressed: number; opacity: number }> = ({
  point,
  pressed,
  opacity,
}) => (
  <svg
    width={30}
    height={30}
    viewBox="0 0 24 24"
    style={{
      position: "absolute",
      left: point.x - 5,
      top: point.y - 3,
      scale: String(1 - pressed * 0.16),
      opacity,
      transformOrigin: "5px 3px",
      filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))",
    }}
  >
    <path
      d="M5 3l13.5 8.2-6 1.4 3.6 6.6-2.6 1.4-3.6-6.6-4.6 4.1z"
      fill="#111"
      stroke="#fff"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

/* One clip of the recording, with camera, cursor and click ripple. */
export const ScreenClip: React.FC<{ clip: Clip; index: number }> = ({ clip, index }) => {
  const frame = useCurrentFrame();
  const time = clip.from + (frame / FPS) * clip.rate;
  const camera = cameraAt(clip.source, time);
  const s = camera.scale;
  const left = Math.min(Math.max(camera.x - W / (2 * s), 0), W - W / s);
  const top = Math.min(Math.max(camera.y - H / (2 * s), 0), H - H / s);
  const point = cursorAt(clip.source, time);
  const click = lastClick(clip.source, time);
  const sinceClick = click ? time - click.t : Infinity;
  const pressed = interpolate(sinceClick, [0, 0.08, 0.3], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ripple = interpolate(sinceClick, [0, 0.55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#f5f4f9" }}>
      <div
        style={{
          position: "absolute",
          width: W,
          height: H,
          transformOrigin: "0 0",
          transform: `scale(${s}) translate(${-left}px, ${-top}px)`,
        }}
      >
        {/* Pre-cut and retimed by scripts/cut.mjs, so it plays at 1x here. */}
        <Video
          src={staticFile(`rec/clips/clip-${String(index).padStart(2, "0")}.mp4`)}
          muted
          style={{ width: W, height: H }}
        />
        {click && sinceClick < 0.55 && (
          <div
            style={{
              position: "absolute",
              left: (click.x ?? 0) - 24,
              top: (click.y ?? 0) - 24,
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: `3px solid ${colors.violet}`,
              opacity: 0.55 * (1 - ripple),
              scale: String(0.4 + ripple * 0.9),
            }}
          />
        )}
        <Cursor
          point={point}
          pressed={pressed}
          opacity={interpolate(idleFor(clip.source, time), [1.8, 2.3], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      </div>
    </AbsoluteFill>
  );
};

/* Browser-style window that frames the recording. */
export const AppWindow: React.FC<{ children: React.ReactNode; url: string }> = ({
  children,
  url,
}) => (
  <div
    style={{
      position: "absolute",
      left: (1920 - W) / 2,
      top: 34,
      width: W,
      height: H + 38,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: "#fff",
      boxShadow:
        "0 40px 90px -30px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08)",
    }}
  >
    <div
      style={{
        height: 38,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 16px",
        backgroundColor: "#ecebf2",
        borderBottom: "1px solid #dcdae6",
        fontFamily,
      }}
    >
      {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
        <span
          key={color}
          style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: color }}
        />
      ))}
      <span
        style={{
          margin: "0 auto",
          padding: "4px 18px",
          borderRadius: 8,
          backgroundColor: "#fff",
          color: "#6c6884",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {url}
      </span>
    </div>
    <div style={{ position: "relative", width: W, height: H }}>{children}</div>
  </div>
);
