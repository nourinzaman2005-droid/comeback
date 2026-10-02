"use client";

import { useEffect, useState } from "react";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* Counts up to a number once, for stat tiles. Respects reduced motion. */
export function CountUp({
  value,
  duration = 700,
}: {
  value: number;
  duration?: number;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion() || value === 0) {
      const frame = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <>{shown}</>;
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(radians), cy + r * Math.sin(radians)];
}

function arc(cx: number, cy: number, r: number, start: number, end: number) {
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

/*
 * Six-segment return ring. Completed stages fill, the current stage glows,
 * and segments draw in one after another on mount.
 */
export function ReturnRing({
  current,
  total = 6,
  size = 168,
  label,
}: {
  current: number;
  total?: number;
  size?: number;
  label: string;
}) {
  const center = 100;
  const radius = 84;
  const gap = 7;
  const span = 360 / total;
  return (
    <svg
      className="return-ring"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id="ring-done" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a993ff" />
          <stop offset="100%" stopColor="#7c5cff" />
        </linearGradient>
        <linearGradient id="ring-current" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff8db1" />
          <stop offset="100%" stopColor="#e5487a" />
        </linearGradient>
      </defs>
      {Array.from({ length: total }, (_, index) => {
        const start = index * span + gap / 2;
        const end = (index + 1) * span - gap / 2;
        const state =
          index < current ? "done" : index === current ? "current" : "next";
        return (
          <g key={index}>
            <path
              d={arc(center, center, radius, start, end)}
              className="ring-track"
            />
            {state !== "next" && (
              <path
                d={arc(center, center, radius, start, end)}
                className={`ring-segment ring-${state}`}
                pathLength={1}
                style={{ animationDelay: `${120 + index * 110}ms` }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
