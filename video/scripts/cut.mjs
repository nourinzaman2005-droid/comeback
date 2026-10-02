/*
 * Cuts each walkthrough clip from the raw recordings into its own short file,
 * already retimed to its playback speed, so the render never has to seek
 * inside long 2x recordings. Run after record.mjs and whenever src/edit.ts
 * changes:  node scripts/cut.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rec = join(root, "public", "rec");
const out = join(rec, "clips");
mkdirSync(out, { recursive: true });

// Read the clip list from src/edit.ts without a TypeScript toolchain.
const source = readFileSync(join(root, "src", "edit.ts"), "utf8");
const clips = [
  ...source.matchAll(
    /\{ source: "(player|clinician)", from: ([\d.]+), to: ([\d.]+), rate: ([\d.]+) \}/g,
  ),
].map(([, src, from, to, rate]) => ({
  src,
  from: Number(from),
  to: Number(to),
  rate: Number(rate),
}));

clips.forEach((clip, index) => {
  const name = `clip-${String(index).padStart(2, "0")}.mp4`;
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    "-ss", String(clip.from), "-to", String(clip.to),
    "-i", join(rec, `${clip.src}.mp4`),
    "-vf", `setpts=PTS/${clip.rate},fps=30,format=yuv420p`,
    "-an", "-c:v", "libx264", "-crf", "16", "-preset", "medium",
    "-g", "15", "-movflags", "+faststart",
    join(out, name),
  ]);
  console.log(name, clip.src, clip.from, "to", clip.to, "at", `${clip.rate}x`);
});
