/*
 * The walkthrough edit list. Each clip plays a range of a recording at a
 * given speed: values below 1 slow down, values above 1 speed up (typing,
 * loading). Times are in seconds of the source recording.
 */
import { FPS } from "./theme";

export type Source = "player" | "clinician";

export type Clip = {
  source: Source;
  from: number;
  to: number;
  rate: number;
};

export type Beat = {
  feature: string;
  narration: string;
  clips: Clip[];
};

export const BEATS: Beat[] = [
  {
    feature: "Sign up and consent",
    narration:
      "She signs up in under a minute, gives consent, and chooses an ICC-verified clinician.",
    clips: [
      { source: "player", from: 1.6, to: 6.5, rate: 2.4 },
      { source: "player", from: 6.5, to: 10.5, rate: 1.15 },
      { source: "player", from: 10.5, to: 14.6, rate: 3 },
      { source: "player", from: 14.6, to: 18.6, rate: 1.3 },
    ],
  },
  {
    feature: "Today screen",
    narration:
      "Her home screen shows exactly where she is: stage one of six, Ready. And one clear next step.",
    clips: [{ source: "player", from: 18.6, to: 27.9, rate: 1 }],
  },
  {
    feature: "Cited roadmap",
    narration:
      "Every stage comes from the ICC guidelines, with the page number. It fits her role too. She's a bowler, so her plan says so.",
    clips: [{ source: "player", from: 27.9, to: 36.5, rate: 1 }],
  },
  {
    feature: "AI guide with a safety line",
    narration:
      "She can ask questions in her own words. The AI explains the guidance, but it will never say she's cleared to play.",
    clips: [
      { source: "player", from: 36.5, to: 38.9, rate: 1.5 },
      { source: "player", from: 38.9, to: 40.6, rate: 2 },
      { source: "player", from: 40.6, to: 47.6, rate: 1 },
    ],
  },
  {
    feature: "Camera check-in on the phone",
    narration:
      "Then a two-minute check-in. AI on the device tracks her movement and times her balance. The video never leaves her phone.",
    clips: [
      { source: "player", from: 47.6, to: 52.6, rate: 1.25 },
      { source: "player", from: 52.6, to: 57.5, rate: 2 },
      { source: "player", from: 57.5, to: 69.6, rate: 1 },
      { source: "player", from: 69.6, to: 72.7, rate: 2.5 },
    ],
  },
  {
    feature: "Symptom safety stop",
    narration:
      "Then: how did that feel? A warning sign, like pelvic heaviness, pauses her stage and alerts her clinician.",
    clips: [
      { source: "player", from: 72.7, to: 79, rate: 1 },
      { source: "player", from: 79, to: 81.9, rate: 2 },
      { source: "player", from: 81.9, to: 85.3, rate: 1 },
    ],
  },
  {
    feature: "Clinician approval",
    narration:
      "Her clinician reviews the check-in, adds a note, and approves the next stage. A person always decides, never the app.",
    clips: [
      { source: "clinician", from: 3, to: 14.4, rate: 1.15 },
      { source: "clinician", from: 14.4, to: 17.4, rate: 3 },
      { source: "clinician", from: 17.4, to: 24.3, rate: 1 },
    ],
  },
  {
    feature: "Live update",
    narration:
      "On her phone, the ring moves to Review, and she gets a notification.",
    clips: [
      { source: "player", from: 110.2, to: 118.5, rate: 1.2 },
      { source: "player", from: 118.5, to: 124.4, rate: 1.6 },
    ],
  },
  {
    feature: "Four languages, works offline",
    narration:
      "It works in English, Bengali, Hindi and Urdu, and it even works offline.",
    clips: [{ source: "player", from: 124.4, to: 133.3, rate: 1.3 }],
  },
];

export const clipFrames = (clip: Clip) =>
  Math.round(((clip.to - clip.from) / clip.rate) * FPS);

export const beatFrames = (beat: Beat) =>
  beat.clips.reduce((sum, clip) => sum + clipFrames(clip), 0);

export const WALKTHROUGH_FRAMES = BEATS.reduce(
  (sum, beat) => sum + beatFrames(beat),
  0,
);
