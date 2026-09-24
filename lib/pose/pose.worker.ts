/// <reference lib="webworker" />

import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

let landmarker: PoseLandmarker | null = null;

self.onmessage = async (event: MessageEvent) => {
  if (event.data.type === "init") {
    try {
      const basePath = event.data.basePath ?? "";
      const vision = await FilesetResolver.forVisionTasks(
        `${basePath}/mediapipe/wasm`,
      );
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${basePath}/models/pose_landmarker_lite.task`,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({
        type: "error",
        message:
          error instanceof Error ? error.message : "Pose model failed to load",
      });
    }
    return;
  }

  if (event.data.type === "frame") {
    const bitmap = event.data.bitmap as ImageBitmap;
    const started = performance.now();
    try {
      const result = landmarker?.detectForVideo(bitmap, event.data.timestamp);
      self.postMessage({
        type: "pose",
        landmarks: result?.landmarks[0] ?? [],
        timestamp: event.data.timestamp,
        inferenceMs: performance.now() - started,
      });
    } catch (error) {
      self.postMessage({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Frame could not be measured",
      });
    } finally {
      bitmap.close();
    }
  }
};

export {};
