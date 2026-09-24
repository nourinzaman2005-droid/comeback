import { CameraMetrics, Landmark, POSE, TestKind } from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function angle(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const denominator = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (denominator === 0) return 0;
  const cosine = clamp((ab.x * cb.x + ab.y * cb.y) / denominator, -1, 1);
  return (Math.acos(cosine) * 180) / Math.PI;
}

export function framingQuality(landmarks: Landmark[]): CameraMetrics["framing"] {
  const required = [
    POSE.nose,
    POSE.leftShoulder,
    POSE.rightShoulder,
    POSE.leftHip,
    POSE.rightHip,
    POSE.leftKnee,
    POSE.rightKnee,
    POSE.leftAnkle,
    POSE.rightAnkle,
  ].map((index) => landmarks[index]);

  if (
    required.some(
      (point) => !point || (point.visibility !== undefined && point.visibility < 0.55),
    )
  ) {
    return "not-visible";
  }

  const xs = required.map((point) => point.x);
  const ys = required.map((point) => point.y);
  return Math.min(...xs, ...ys) < 0.025 || Math.max(...xs, ...ys) > 0.975
    ? "move-back"
    : "ready";
}

export class LandmarkSmoother {
  private previous: Landmark[] | null = null;

  constructor(private readonly alpha = 0.45) {}

  update(next: Landmark[]): Landmark[] {
    if (!this.previous || this.previous.length !== next.length) {
      this.previous = next.map((point) => ({ ...point }));
      return this.previous;
    }
    this.previous = next.map((point, index) => {
      const prior = this.previous![index];
      return {
        x: prior.x + this.alpha * (point.x - prior.x),
        y: prior.y + this.alpha * (point.y - prior.y),
        z: prior.z + this.alpha * (point.z - prior.z),
        visibility: point.visibility,
      };
    });
    return this.previous;
  }

  reset() {
    this.previous = null;
  }
}

export type SessionState = {
  count: number;
  phase: "start" | "active";
  activeSince: number | null;
  holdSeconds: number;
  baselineAnkleY: number | null;
  lastTimestamp: number | null;
};

export const initialSessionState = (): SessionState => ({
  count: 0,
  phase: "start",
  activeSince: null,
  holdSeconds: 0,
  baselineAnkleY: null,
  lastTimestamp: null,
});

function cueForFraming(framing: CameraMetrics["framing"]): string {
  if (framing === "not-visible") return "Keep your full body visible";
  if (framing === "move-back") return "Move back until your whole body fits";
  return "Position looks ready";
}

export function measureFrame(
  kind: TestKind,
  points: Landmark[],
  timestamp: number,
  state: SessionState,
  inferenceMs = 0,
): { state: SessionState; metrics: CameraMetrics } {
  const framing = framingQuality(points);
  const next = { ...state, lastTimestamp: timestamp };
  const leftKnee = angle(
    points[POSE.leftHip],
    points[POSE.leftKnee],
    points[POSE.leftAnkle],
  );
  const rightKnee = angle(
    points[POSE.rightHip],
    points[POSE.rightKnee],
    points[POSE.rightAnkle],
  );
  const leftHip = angle(
    points[POSE.leftShoulder],
    points[POSE.leftHip],
    points[POSE.leftKnee],
  );
  const hipWidth = Math.max(
    0.001,
    Math.abs(points[POSE.leftHip].x - points[POSE.rightHip].x),
  );
  const leftFppa =
    ((points[POSE.leftKnee].x - points[POSE.leftHip].x) / hipWidth) * 100;
  const asymmetry = Math.abs(leftKnee - rightKnee);
  let cue = cueForFraming(framing);

  if (framing === "ready") {
    if (kind === "squat") {
      if (next.phase === "start" && leftKnee < 125) next.phase = "active";
      if (next.phase === "active" && leftKnee > 155) {
        next.phase = "start";
        next.count += 1;
      }
      cue = next.phase === "active" ? "Return to a comfortable standing position" : "Rep counted from down and up movement";
    }

    if (kind === "bridge") {
      if (next.phase === "start" && leftHip > 155) next.phase = "active";
      if (next.phase === "active" && leftHip < 135) {
        next.phase = "start";
        next.count += 1;
      }
      cue = "Turn side-on so shoulder, hip and knee stay visible";
    }

    if (kind === "hop") {
      const ankleY = points[POSE.leftAnkle].y;
      next.baselineAnkleY ??= ankleY;
      next.baselineAnkleY = Math.max(next.baselineAnkleY, ankleY);
      const lift = next.baselineAnkleY - ankleY;
      if (next.phase === "start" && lift > 0.035) next.phase = "active";
      if (next.phase === "active" && lift < 0.015) {
        next.phase = "start";
        next.count += 1;
      }
      cue = next.phase === "active" ? "Hop observed" : "Land before the next hop";
    }

    if (kind === "balance") {
      const ankleDifference = Math.abs(
        points[POSE.leftAnkle].y - points[POSE.rightAnkle].y,
      );
      const active = ankleDifference > 0.045;
      if (active && next.activeSince === null) next.activeSince = timestamp;
      if (!active) next.activeSince = null;
      next.holdSeconds = next.activeSince
        ? Math.max(0, (timestamp - next.activeSince) / 1000)
        : 0;
      cue = active ? "Hold observed" : "Raise one foot when you feel steady";
    }
  }

  return {
    state: next,
    metrics: {
      count: next.count,
      holdSeconds: next.holdSeconds,
      framing,
      cue,
      fps: inferenceMs > 0 ? 1000 / inferenceMs : 0,
      kneeAngle: leftKnee,
      squatDepth: 180 - leftKnee,
      fppa: leftFppa,
      asymmetry,
    },
  };
}
