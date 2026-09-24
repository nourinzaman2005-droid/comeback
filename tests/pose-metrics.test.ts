import { describe, expect, it } from "vitest";
import {
  angle,
  framingQuality,
  initialSessionState,
  LandmarkSmoother,
  measureFrame,
} from "../lib/pose/metrics";
import { Landmark, POSE } from "../lib/pose/types";

function pose(): Landmark[] {
  const points = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.99,
  }));
  points[POSE.nose] = { x: 0.5, y: 0.1, z: 0, visibility: 0.99 };
  points[POSE.leftShoulder] = { x: 0.4, y: 0.3, z: 0, visibility: 0.99 };
  points[POSE.rightShoulder] = { x: 0.6, y: 0.3, z: 0, visibility: 0.99 };
  points[POSE.leftHip] = { x: 0.45, y: 0.5, z: 0, visibility: 0.99 };
  points[POSE.rightHip] = { x: 0.55, y: 0.5, z: 0, visibility: 0.99 };
  points[POSE.leftKnee] = { x: 0.45, y: 0.7, z: 0, visibility: 0.99 };
  points[POSE.rightKnee] = { x: 0.55, y: 0.7, z: 0, visibility: 0.99 };
  points[POSE.leftAnkle] = { x: 0.45, y: 0.9, z: 0, visibility: 0.99 };
  points[POSE.rightAnkle] = { x: 0.55, y: 0.9, z: 0, visibility: 0.99 };
  return points;
}

describe("pose observations", () => {
  it("calculates a two-dimensional joint angle", () => {
    expect(
      angle(
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
      ),
    ).toBeCloseTo(90);
  });

  it("requires visible landmarks with space around the body", () => {
    const ready = pose();
    expect(framingQuality(ready)).toBe("ready");
    ready[POSE.nose].visibility = 0.2;
    expect(framingQuality(ready)).toBe("not-visible");
    ready[POSE.nose] = { x: 0.01, y: 0.1, z: 0, visibility: 0.99 };
    expect(framingQuality(ready)).toBe("move-back");
  });

  it("smooths landmark movement and can reset", () => {
    const smoother = new LandmarkSmoother(0.5);
    expect(smoother.update([{ x: 0, y: 0, z: 0 }])[0].x).toBe(0);
    expect(smoother.update([{ x: 1, y: 1, z: 1 }])[0].x).toBe(0.5);
    smoother.reset();
    expect(smoother.update([{ x: 1, y: 1, z: 1 }])[0].x).toBe(1);
  });

  it("counts a squat only after a down and up cycle", () => {
    const down = pose();
    down[POSE.leftKnee] = { x: 0.3, y: 0.65, z: 0, visibility: 0.99 };
    const first = measureFrame("squat", down, 10, initialSessionState());
    expect(first.state.phase).toBe("active");
    const complete = measureFrame("squat", pose(), 20, first.state);
    expect(complete.metrics.count).toBe(1);
    expect(complete.metrics.kneeAngle).toBeCloseTo(180);
  });

  it("observes balance duration while one foot is raised", () => {
    const raised = pose();
    raised[POSE.leftAnkle].y = 0.8;
    const started = measureFrame("balance", raised, 1000, initialSessionState());
    const held = measureFrame("balance", raised, 3500, started.state);
    expect(held.metrics.holdSeconds).toBe(2.5);
  });

  it("counts a hop after takeoff and landing", () => {
    const initial = measureFrame("hop", pose(), 0, initialSessionState());
    const airborne = pose();
    airborne[POSE.leftAnkle].y = 0.84;
    const lifted = measureFrame("hop", airborne, 10, initial.state);
    expect(lifted.state.phase).toBe("active");
    const landed = measureFrame("hop", pose(), 20, lifted.state);
    expect(landed.metrics.count).toBe(1);
  });

  it("counts a bridge observation across its angle cycle", () => {
    const top = measureFrame("bridge", pose(), 0, initialSessionState());
    expect(top.state.phase).toBe("active");
    const lowered = pose();
    lowered[POSE.leftKnee] = { x: 0.2, y: 0.65, z: 0, visibility: 0.99 };
    const completed = measureFrame("bridge", lowered, 20, top.state);
    expect(completed.metrics.count).toBe(1);
  });
});
