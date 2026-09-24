export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

export type TestKind = "squat" | "balance" | "hop" | "bridge";

export type CameraMetrics = {
  count: number;
  holdSeconds: number;
  framing: "ready" | "move-back" | "not-visible";
  cue: string;
  fps: number;
  kneeAngle?: number;
  squatDepth?: number;
  fppa?: number;
  asymmetry?: number;
};

export type PoseFrame = {
  landmarks: Landmark[];
  timestamp: number;
  inferenceMs: number;
};

export const POSE = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFoot: 31,
  rightFoot: 32,
} as const;
