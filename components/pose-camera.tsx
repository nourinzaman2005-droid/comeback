"use client";

import { Camera, CameraOff, LockKeyhole, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  initialSessionState,
  LandmarkSmoother,
  measureFrame,
  SessionState,
} from "@/lib/pose/metrics";
import { CameraMetrics, Landmark, POSE, TestKind } from "@/lib/pose/types";

const TESTS: { id: TestKind; label: string; target: string }[] = [
  { id: "squat", label: "Single-leg squat", target: "10 reps, front view" },
  { id: "balance", label: "Single-leg balance", target: "10 sec, front view" },
  { id: "hop", label: "Hop on the spot", target: "10 hops, front view" },
  { id: "bridge", label: "Single-leg bridge", target: "10 reps, side view" },
];

const CONNECTIONS: [number, number][] = [
  [POSE.leftShoulder, POSE.rightShoulder],
  [POSE.leftShoulder, POSE.leftHip],
  [POSE.rightShoulder, POSE.rightHip],
  [POSE.leftHip, POSE.rightHip],
  [POSE.leftHip, POSE.leftKnee],
  [POSE.leftKnee, POSE.leftAnkle],
  [POSE.rightHip, POSE.rightKnee],
  [POSE.rightKnee, POSE.rightAnkle],
];

const blankMetrics: CameraMetrics = {
  count: 0,
  holdSeconds: 0,
  framing: "not-visible",
  cue: "Start the camera when you are ready",
  fps: 0,
};

type Status = "idle" | "loading" | "running" | "error";

function drawPose(canvas: HTMLCanvasElement, points: Landmark[]) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineCap = "round";
  context.lineWidth = 4;
  context.strokeStyle = "rgba(255, 219, 221, 0.92)";
  for (const [from, to] of CONNECTIONS) {
    const a = points[from];
    const b = points[to];
    if (!a || !b) continue;
    context.beginPath();
    context.moveTo(a.x * canvas.width, a.y * canvas.height);
    context.lineTo(b.x * canvas.width, b.y * canvas.height);
    context.stroke();
  }
  context.fillStyle = "#f5a9b2";
  for (const point of points) {
    if ((point.visibility ?? 1) < 0.5) continue;
    context.beginPath();
    context.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2);
    context.fill();
  }
}

export function PoseCamera({
  onMetrics,
}: {
  onMetrics?: (kind: TestKind, metrics: CameraMetrics) => void;
}) {
  const [kind, setKind] = useState<TestKind>("squat");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [metrics, setMetrics] = useState<CameraMetrics>(blankMetrics);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const stateRef = useRef<SessionState>(initialSessionState());
  const kindRef = useRef<TestKind>(kind);
  const smootherRef = useRef(new LandmarkSmoother());

  const stopCamera = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    workerRef.current?.terminate();
    timerRef.current = null;
    streamRef.current = null;
    workerRef.current = null;
    busyRef.current = false;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const reset = useCallback((nextKind = kindRef.current) => {
    kindRef.current = nextKind;
    stateRef.current = initialSessionState();
    smootherRef.current.reset();
    setMetrics({ ...blankMetrics, cue: "Find your full body in the frame" });
  }, []);

  const sendFrame = useCallback(async () => {
    const video = videoRef.current;
    const worker = workerRef.current;
    if (video && worker && video.readyState >= 2 && !busyRef.current) {
      busyRef.current = true;
      try {
        const bitmap = await createImageBitmap(video);
        worker.postMessage(
          { type: "frame", bitmap, timestamp: performance.now() },
          [bitmap],
        );
      } catch {
        busyRef.current = false;
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    reset();
    setStatus("loading");
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("Camera access needs a modern browser over HTTPS.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 960 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const worker = new Worker(
        new URL("../lib/pose/pose.worker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = worker;
      worker.onmessage = (event) => {
        if (event.data.type === "ready") {
          setStatus("running");
          timerRef.current = window.setInterval(() => {
            void sendFrame();
          }, 100);
        }
        if (event.data.type === "pose") {
          busyRef.current = false;
          const points = smootherRef.current.update(event.data.landmarks);
          if (points.length >= 33) {
            const measured = measureFrame(
              kindRef.current,
              points,
              event.data.timestamp,
              stateRef.current,
              event.data.inferenceMs,
            );
            stateRef.current = measured.state;
            setMetrics(measured.metrics);
            onMetrics?.(kindRef.current, measured.metrics);
            const canvas = canvasRef.current;
            if (canvas) drawPose(canvas, points);
          } else {
            setMetrics((current) => ({
              ...current,
              framing: "not-visible",
              cue: "Step into view and show your full body",
            }));
          }
        }
        if (event.data.type === "error") {
          busyRef.current = false;
          setStatus("error");
          setMessage(event.data.message);
        }
      };
      worker.postMessage({ type: "init" });
    } catch (error) {
      stopCamera();
      setStatus("error");
      setMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera permission was not granted. You can retry when ready."
          : "The camera could not start. Check that another app is not using it.",
      );
    }
  }, [onMetrics, reset, sendFrame, stopCamera]);

  const selectTest = (nextKind: TestKind) => {
    setKind(nextKind);
    reset(nextKind);
  };

  const selected = TESTS.find((test) => test.id === kind)!;
  const displayValue =
    kind === "balance"
      ? `${metrics.holdSeconds.toFixed(1)}s`
      : String(metrics.count);

  return (
    <div className="pose-test">
      <div className="test-picker" aria-label="Choose camera test">
        {TESTS.map((test) => (
          <button
            key={test.id}
            className={kind === test.id ? "selected" : ""}
            onClick={() => selectTest(test.id)}
            type="button"
          >
            <strong>{test.label}</strong>
            <span>{test.target}</span>
          </button>
        ))}
      </div>

      <div className="real-camera">
        <video ref={videoRef} muted playsInline aria-label="Live camera preview" />
        <canvas ref={canvasRef} width={720} height={960} aria-hidden="true" />
        <div className={`camera-status camera-${status}`}>
          <i /> {status === "running" ? "On-device pose" : "Camera not recording"}
        </div>
        <div className="rep-counter">
          <strong>{displayValue}</strong>
          <span>{kind === "balance" ? "hold" : "observed"}</span>
        </div>
        {status === "idle" && (
          <div className="camera-empty">
            <Camera size={36} />
            <strong>{selected.label}</strong>
            <span>Frames are measured on this device.</span>
            <button type="button" onClick={startCamera}>
              Start camera
            </button>
          </div>
        )}
        {status === "loading" && (
          <div className="camera-empty">
            <span className="camera-spinner" />
            <strong>Preparing private pose tracking</strong>
            <span>The local model may take a moment the first time.</span>
          </div>
        )}
        {status === "error" && (
          <div className="camera-empty camera-error" role="alert">
            <CameraOff size={34} />
            <strong>Camera needs attention</strong>
            <span>{message}</span>
            <button type="button" onClick={startCamera}>
              Try again
            </button>
          </div>
        )}
        {status === "running" && (
          <div className={`form-cue framing-${metrics.framing}`}>
            {metrics.cue}
          </div>
        )}
      </div>

      <div className="observation-grid" aria-label="Movement observations">
        <div>
          <span>Knee angle</span>
          <strong>{metrics.kneeAngle?.toFixed(0) ?? "--"} deg</strong>
        </div>
        <div>
          <span>Depth change</span>
          <strong>{metrics.squatDepth?.toFixed(0) ?? "--"} deg</strong>
        </div>
        <div>
          <span>Side difference</span>
          <strong>{metrics.asymmetry?.toFixed(0) ?? "--"} deg</strong>
        </div>
        <div>
          <span>FPPA offset</span>
          <strong>{metrics.fppa?.toFixed(0) ?? "--"}%</strong>
        </div>
        <div>
          <span>Processing</span>
          <strong>{metrics.fps ? metrics.fps.toFixed(0) : "--"} fps</strong>
        </div>
      </div>
      <button className="reset-measurement" type="button" onClick={() => reset()}>
        <RotateCcw size={15} /> Reset observations
      </button>
      <p className="camera-boundary">
        <LockKeyhole size={15} /> Measurements describe movement only. They do
        not score readiness or provide medical clearance.
      </p>
      <p className="accuracy-boundary">
        Prototype measurement note: manual-count validation on a physical
        Android phone is still pending.
      </p>
    </div>
  );
}
