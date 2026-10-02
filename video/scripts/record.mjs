/*
 * Records the ComeBack walkthrough for the Remotion edit.
 *
 * It drives the real app in two browsers (player and clinician), captures each
 * with Chrome's screencast at 2x (sharp enough for zooms), and writes a
 * timeline of cursor moves, clicks and zoom targets so the edit can add Screen
 * Studio style cursor focus. Requires ffmpeg on the PATH.
 *
 * Usage (app running on http://localhost:3000 with its API):
 *   node scripts/record.mjs
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "rec");
const feed = join(root, "input", "balance.mjpeg");
const base = process.env.APP_URL ?? "http://localhost:3000";
const VIEW = { width: 1440, height: 900 };

await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    `--use-file-for-fake-video-capture=${feed}`,
    "--hide-scrollbars",
    // Without this, headless screencast frames ignore the 2x scale factor.
    "--force-device-scale-factor=2",
  ],
});

async function startCapture(page, name) {
  const dir = join(out, `${name}-frames`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  const writes = [];
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = join(dir, `${String(frames.length).padStart(6, "0")}.jpg`);
    frames.push({ file, t: metadata.timestamp });
    // Acknowledge first so Chrome keeps streaming while we write to disk.
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    const write = writeFile(file, Buffer.from(data, "base64"));
    writes.push(write);
    await write;
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 85,
    maxWidth: VIEW.width * 2,
    maxHeight: VIEW.height * 2,
    everyNthFrame: 1,
  });
  page.on("response", (response) => {
    if ([401, 403].includes(response.status()))
      console.warn(name, response.status(), response.url());
  });
  return {
    frames,
    async stop() {
      await cdp.send("Page.stopScreencast").catch(() => {});
      const end = Date.now() / 1000;
      // Make sure every frame is fully on disk before encoding.
      await new Promise((resolve) => setTimeout(resolve, 500));
      await Promise.all(writes);
      return end;
    },
  };
}

async function encode(name, capture, endTime) {
  const { frames } = capture;
  const lines = [];
  frames.forEach((frame, index) => {
    const next = frames[index + 1]?.t ?? endTime;
    lines.push(`file '${frame.file.replaceAll("\\", "/")}'`);
    lines.push(`duration ${Math.max(0.001, next - frame.t).toFixed(4)}`);
  });
  lines.push(`file '${frames.at(-1).file.replaceAll("\\", "/")}'`);
  const list = join(out, `${name}-frames.txt`);
  await writeFile(list, lines.join(String.fromCharCode(10)));
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
    "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "17",
    "-preset", "medium", "-movflags", "+faststart", join(out, `${name}.mp4`),
  ]);
  await rm(join(out, `${name}-frames`), { recursive: true, force: true });
  await rm(list, { force: true });
  return frames[0].t;
}

function track(page, name) {
  const start = Date.now();
  const events = [];
  let cursor = { x: VIEW.width / 2, y: VIEW.height / 2 };
  const now = () => Date.now() / 1000;
  const log = (event) => events.push({ t: now(), ...event });
  void start;

  async function center(target) {
    let box = await target.boundingBox();
    if (box && (box.y < 70 || box.y + box.height > VIEW.height - 20)) {
      // Scroll like a person would, smoothly, so the recording stays natural.
      await target.evaluate((el) =>
        el.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      log({ type: "scroll" });
      await page.waitForTimeout(800);
      box = await target.boundingBox();
    }
    if (!box) throw new Error(`No box for target in ${name}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
  }

  return {
    name,
    events,
    log,
    async pause(ms) {
      await page.waitForTimeout(ms);
    },
    async mark(label, extra = {}) {
      log({ type: "mark", label, ...extra });
    },
    async moveTo(target, ms = 700) {
      const { x, y, box } = await center(target);
      log({ type: "move", from: cursor, to: { x, y }, duration: ms / 1000 });
      await page.mouse.move(x, y, { steps: 12 });
      cursor = { x, y };
      await page.waitForTimeout(ms);
      return box;
    },
    async click(target, ms = 700) {
      const box = await this.moveTo(target, ms);
      log({ type: "click", x: cursor.x, y: cursor.y });
      await page.mouse.down();
      await page.waitForTimeout(80);
      await page.mouse.up();
      await page.waitForTimeout(250);
      return box;
    },
    async type(target, text, delay = 85) {
      await this.click(target);
      log({ type: "typing-start", x: cursor.x, y: cursor.y });
      await page.keyboard.type(text, { delay });
      log({ type: "typing-end" });
    },
    async zoom(target, scale, label) {
      const { x, y } = await center(target);
      log({ type: "zoom", x, y, scale, label });
    },
    zoomOut(label) {
      log({ type: "zoom", x: VIEW.width / 2, y: VIEW.height / 2, scale: 1, label });
    },
  };
}

/* ---------------- Player ---------------- */
const playerContext = await browser.newContext({
  viewport: VIEW,
  deviceScaleFactor: 2,
  permissions: ["camera"],
});
const player = await playerContext.newPage();
const playerCapture = await startCapture(player, "player");
const P = track(player, "player");
await player.goto(base);
await player.waitForTimeout(2500);
P.mark("auth");

// Sign up
await P.click(player.getByRole("button", { name: "Register", exact: true }));
await P.mark("signup-start");
await P.zoom(player.locator(".auth-form-card"), 1.35, "signup");
await P.type(player.getByLabel("First name"), "Sana");
await player.getByLabel("Delivery date").fill("2026-06-12");
await P.click(player.getByLabel("Delivery type"), 400);
await player.getByLabel("Delivery type").selectOption("caesarean");
await P.click(player.getByLabel("Cricket role"), 400);
await player.getByLabel("Cricket role").selectOption("bowler");
const maya = player.locator(".clinician-picker label", { hasText: "Dr. Maya Rahman" });
await P.zoom(maya, 1.9, "clinician");
await P.click(maya, 900);
await player.waitForTimeout(700);
await P.type(player.getByLabel("Email address"), "sana@comeback.demo", 45);
await P.type(player.getByLabel("Create password"), "ComeBack2026!", 45);
const consent = player.locator(".auth-consent");
await P.zoom(consent, 1.9, "consent");
await P.click(consent, 800);
await player.waitForTimeout(900);
const create = player.getByRole("button", { name: /Create player account/ });
await P.zoom(create, 1.6, "create");
await P.click(create, 600);
P.zoomOut("today-arrive");
try {
  await player
    .getByRole("heading", { name: /Welcome back, Sana/ })
    .waitFor({ timeout: 15000 });
} catch (error) {
  await player.screenshot({ path: join(out, "debug-signup.png") });
  console.error(
    "Sign-up did not finish:",
    await player.locator(".auth-error").textContent().catch(() => "no message"),
  );
  throw error;
}
await P.mark("today");
await player.waitForTimeout(1500);

// Today
const hero = player.locator(".stage-card");
await P.zoom(hero, 1.55, "ring");
await P.moveTo(player.locator(".ring-center"), 900);
await player.waitForTimeout(1800);
const nextStep = player.locator(".task-card");
await P.zoom(nextStep, 1.7, "next-step");
await P.moveTo(nextStep, 900);
await player.waitForTimeout(1500);
P.zoomOut("today-wide");
await player.waitForTimeout(900);

// Journey
await P.click(player.getByRole("button", { name: "Journey", exact: true }));
await P.mark("journey");
await player.waitForTimeout(1200);
const citation = player.locator(".timeline-item.current .timeline-body > small");
await P.zoom(citation, 2.0, "citation");
await P.moveTo(citation, 900);
await player.waitForTimeout(1400);
const focus = player.locator(".cricket-focus");
await focus.scrollIntoViewIfNeeded();
await player.waitForTimeout(500);
await P.zoom(focus, 1.9, "cricket-focus");
await P.moveTo(focus, 900);
await player.waitForTimeout(1800);
P.zoomOut("journey-out");

// AI guide
await P.click(player.getByRole("button", { name: "Today", exact: true }));
await P.mark("ai");
await player.waitForTimeout(1200);
const guide = player.locator(".ai-guide");
await P.zoom(guide, 1.8, "ai");
await P.type(player.getByPlaceholder("Ask about this stage"), "Am I safe to play?", 80);
await P.click(player.getByRole("button", { name: "Ask", exact: true }), 500);
await player.locator(".ai-answer").waitFor();
await player.waitForTimeout(400);
await P.zoom(player.locator(".ai-answer"), 2.0, "ai-answer");
await P.moveTo(player.locator(".ai-answer p").first(), 900);
await player.waitForTimeout(2600);
P.zoomOut("ai-out");
await player.waitForTimeout(600);

// Camera check-in
await P.click(player.getByRole("button", { name: /Camera-guided check-in/ }));
await P.mark("setup");
await player.waitForTimeout(1000);
await P.zoom(player.locator(".placement-card"), 1.5, "placement");
await P.moveTo(player.locator(".placement-card"), 900);
await player.waitForTimeout(1600);
P.zoomOut("setup-out");
await P.click(player.getByRole("button", { name: /Open private camera/ }));
await P.mark("camera");
await player.waitForTimeout(900);
await P.click(player.getByRole("button", { name: /Single-leg balance/ }));
await player.waitForTimeout(500);
const startCamera = player.getByRole("button", { name: "Start camera" });
await P.zoom(player.locator(".real-camera"), 1.45, "camera");
await P.click(startCamera, 600);
await player.locator(".camera-running").waitFor({ timeout: 30000 });
await P.mark("tracking");
await player.waitForTimeout(3500);
await P.zoom(player.locator(".rep-counter"), 2.1, "hold");
await P.moveTo(player.locator(".rep-counter"), 800);
await player.waitForTimeout(4500);
await P.zoom(player.locator(".observation-grid"), 1.6, "metrics");
await P.moveTo(player.locator(".observation-grid"), 800);
await player.waitForTimeout(2000);
P.zoomOut("camera-out");
await P.click(player.getByRole("button", { name: /Continue to symptoms/ }));

// Symptoms
await P.mark("symptoms");
await player.waitForTimeout(1000);
const heaviness = player.locator(".symptom-grid label", { hasText: "Pelvic pressure" });
await P.zoom(heaviness, 1.6, "symptom");
await P.click(heaviness, 800);
await player.locator(".red-flag-note").waitFor();
await player.waitForTimeout(300);
await P.zoom(player.locator(".red-flag-note"), 1.9, "red-flag");
await P.moveTo(player.locator(".red-flag-note"), 800);
await player.waitForTimeout(2200);
P.zoomOut("symptom-out");
await P.click(heaviness, 700);
await player.waitForTimeout(500);
await P.click(player.getByRole("button", { name: /Save symptom-free check-in/ }));
await P.mark("result");
await P.zoom(player.locator(".result-mark"), 1.5, "result");
await player.waitForTimeout(2600);
P.zoomOut("result-out");
await player.waitForTimeout(800);
await P.mark("player-wait");

/* ---------------- Clinician ---------------- */
const clinicianContext = await browser.newContext({
  viewport: VIEW,
  deviceScaleFactor: 2,
});
const clinician = await clinicianContext.newPage();
const clinicianCapture = await startCapture(clinician, "clinician");
const C = track(clinician, "clinician");
await clinician.goto(`${base}/clinician`);
await clinician.waitForTimeout(1800);
await C.click(clinician.getByRole("button", { name: /Open fictional clinician demo/ }));
await clinician.locator(".player-roster button", { hasText: "Sana" }).waitFor();
await C.mark("clinician");
await clinician.waitForTimeout(800);
const sana = clinician.locator(".player-roster button", { hasText: "Sana" });
await C.zoom(sana, 1.7, "roster");
await C.click(sana, 800);
await clinician.waitForTimeout(1000);
await C.zoom(clinician.locator(".latest-check"), 1.7, "check-in");
await C.moveTo(clinician.locator(".latest-check .metric-row"), 900);
await clinician.waitForTimeout(1600);
await C.zoom(clinician.locator(".symptom-review"), 1.7, "symptom-review");
await C.moveTo(clinician.locator(".symptom-review"), 800);
await clinician.waitForTimeout(1300);
const decision = clinician.locator(".decision-card");
await decision.scrollIntoViewIfNeeded();
await clinician.waitForTimeout(700);
await C.zoom(decision, 1.45, "decision");
await C.type(
  clinician.locator(".decision-card textarea"),
  "Steady 10 second hold and no symptoms. Moving you to Review.",
  40,
);
const approve = clinician.getByRole("button", { name: /Approve next stage/ });
await C.zoom(approve, 2.1, "approve");
await C.click(approve, 900);
await clinician.locator(".decision-message").waitFor();
await clinician.waitForTimeout(1200);
console.log(
  "Decision:",
  await clinician.locator(".decision-message").textContent(),
);
await C.mark("approved");
await C.zoom(clinician.locator(".decision-message"), 1.9, "approved");
await clinician.waitForTimeout(2600);
C.zoomOut("clinician-out");
await clinician.waitForTimeout(800);
const clinicianEnd = await clinicianCapture.stop();

/* ---------------- Player sees the update ---------------- */
await P.mark("player-back");
await player.bringToFront();
await P.click(player.getByRole("button", { name: /Back to today/ }));
await player.locator(".stage-card h2", { hasText: "Review" }).waitFor({ timeout: 15000 });
await P.mark("review");
await P.zoom(player.locator(".stage-card"), 1.55, "review-ring");
await P.moveTo(player.locator(".ring-center"), 900);
await player.waitForTimeout(2600);
const bell = player.getByRole("button", { name: /Notifications/ });
await P.zoom(bell, 2.0, "bell");
await P.click(bell, 800);
await player.waitForTimeout(400);
await P.zoom(player.locator(".notification-popover"), 1.7, "notifications");
await player.waitForTimeout(2600);
await P.click(bell, 500);
P.zoomOut("lang-wide");
await player.waitForTimeout(600);

// Offline, then Urdu
await P.mark("offline");
await playerContext.setOffline(true);
await player.getByText("Offline ready").waitFor({ timeout: 15000 });
await player.waitForTimeout(600);
await P.zoom(player.locator(".status-chips"), 2.0, "offline");
await P.moveTo(player.getByText("Offline ready"), 800);
await player.waitForTimeout(1800);
P.zoomOut("offline-out");
await P.mark("urdu");
await P.click(player.getByLabel("Language"), 600);
await player.getByLabel("Language").selectOption("ur");
await player.waitForTimeout(2800);
await P.mark("end");
await player.waitForTimeout(1000);

/* ---------------- Save ---------------- */
const playerEnd = await playerCapture.stop();
const playerStart = await encode("player", playerCapture, playerEnd);
const clinicianStart = await encode("clinician", clinicianCapture, clinicianEnd);
const relative = (events, origin) =>
  events.map((event) => ({ ...event, t: Number((event.t - origin).toFixed(3)) }));
await writeFile(
  join(out, "timeline.json"),
  JSON.stringify(
    {
      viewport: VIEW,
      player: {
        duration: Number((playerEnd - playerStart).toFixed(3)),
        events: relative(P.events, playerStart),
      },
      clinician: {
        duration: Number((clinicianEnd - clinicianStart).toFixed(3)),
        events: relative(C.events, clinicianStart),
      },
    },
    null,
    2,
  ),
);
await playerContext.close();
await clinicianContext.close();
await browser.close();
console.log("Recorded player.mp4, clinician.mp4 and timeline.json");
