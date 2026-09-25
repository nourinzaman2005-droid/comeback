// @vitest-environment node

import { spawn, type ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const port = 18_000 + Math.floor(Math.random() * 1_000);
const api = `http://127.0.0.1:${port}`;
let server: ChildProcess;

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${api}/health`);
      if (response.ok) return;
    } catch {
      // Password hashing can make the first local startup take a moment.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Render API did not start");
}

async function signIn(
  role: "player" | "clinician",
  email: string,
  password: string,
) {
  const response = await fetch(`${api}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, email, password }),
  });
  expect(response.ok).toBe(true);
  return (await response.json()) as {
    token: string;
    user: { id: string; role: string };
  };
}

async function registerPlayer(email: string, name: string) {
  const response = await fetch(`${api}/api/auth/register/player`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: "PlayerPass2026!",
      name,
      deliveryDate: "2026-05-01",
      deliveryType: "vaginal",
      cricketRole: "batter",
      language: "en",
      clinicianId: "clinician-maya-demo",
      consent: true,
    }),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as {
    token: string;
    user: { id: string; role: string };
  };
}

function authorized(token: string, body?: unknown) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

describe("Render API authenticated end-to-end workflow", () => {
  beforeAll(async () => {
    server = spawn(process.execPath, ["server/index.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        DEMO_MODE: "true",
        SESSION_SECRET: "test-session-secret-that-is-not-used-in-production",
        DATABASE_URL: "",
        GROQ_API_KEY: "",
      },
      stdio: "ignore",
    });
    await waitForServer();
  });

  afterAll(() => server?.kill());

  it("authenticates separate roles, chats, notifies, and advances one stage", async () => {
    const player = await signIn(
      "player",
      "nourin@comeback.demo",
      "ComeBack2026!",
    );
    const clinician = await signIn(
      "clinician",
      "maya.rahman@icc-demo.org",
      "CareTeam2026!",
    );
    const playerId = player.user.id;
    const timestamp = new Date().toISOString();

    expect(
      (await fetch(`${api}/api/clinician/players`, authorized(player.token)))
        .status,
    ).toBe(403);

    const test = {
      id: "api-test-clear",
      playerId,
      kind: "squat",
      side: "both",
      metrics: { count: 8, kneeAngle: 92 },
      symptoms: [],
      completedAt: timestamp,
    };
    expect(
      (
        await fetch(`${api}/api/tests`, {
          method: "POST",
          ...authorized(player.token, test),
        })
      ).status,
    ).toBe(201);

    const queue = await fetch(
      `${api}/api/clinician/players`,
      authorized(clinician.token),
    );
    const players = (await queue.json()) as Array<{
      id: string;
      stageStatus: string;
      tests: Array<{ id: string }>;
    }>;
    expect(players.find((value) => value.id === playerId)).toMatchObject({
      id: playerId,
      stageStatus: "awaiting-review",
      tests: [{ id: test.id }],
    });

    const sent = await fetch(`${api}/api/messages`, {
      method: "POST",
      ...authorized(player.token, { playerId, body: "My check-in is ready." }),
    });
    expect(sent.status).toBe(201);
    const conversation = await fetch(
      `${api}/api/messages?playerId=${playerId}`,
      authorized(clinician.token),
    );
    expect(await conversation.json()).toEqual([
      expect.objectContaining({
        body: "My check-in is ready.",
        senderRole: "player",
      }),
    ]);

    const clinicianNotifications = await fetch(
      `${api}/api/notifications`,
      authorized(clinician.token),
    );
    expect(await clinicianNotifications.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "check-in" }),
        expect.objectContaining({ type: "message" }),
      ]),
    );

    const decision = await fetch(`${api}/api/decisions`, {
      method: "POST",
      ...authorized(clinician.token, {
        id: "api-decision-approve",
        playerId,
        testId: test.id,
        decision: "approve",
        note: "Reviewed in the demo",
      }),
    });
    expect(await decision.json()).toEqual({
      stage: "Recondition",
      status: "active",
    });

    const refreshed = await fetch(
      `${api}/api/players/${playerId}`,
      authorized(player.token),
    );
    expect(await refreshed.json()).toMatchObject({
      stage: "Recondition",
      stageStatus: "active",
    });
    const playerNotifications = await fetch(
      `${api}/api/notifications`,
      authorized(player.token),
    );
    expect(await playerNotifications.json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "decision" })]),
    );
  });

  it("blocks symptom approval for a registered linked player", async () => {
    const player = await registerPlayer("ashra-api@example.com", "Ashra");
    const clinician = await signIn(
      "clinician",
      "maya.rahman@icc-demo.org",
      "CareTeam2026!",
    );
    const timestamp = new Date().toISOString();
    await fetch(`${api}/api/tests`, {
      method: "POST",
      ...authorized(player.token, {
        id: "api-test-symptom",
        playerId: player.user.id,
        kind: "balance",
        side: "left",
        metrics: { holdSeconds: 12 },
        symptoms: ["pelvic heaviness"],
        completedAt: timestamp,
      }),
    });

    const decision = await fetch(`${api}/api/decisions`, {
      method: "POST",
      ...authorized(clinician.token, {
        id: "api-decision-blocked",
        playerId: player.user.id,
        testId: "api-test-symptom",
        decision: "approve",
        note: "Should not advance",
      }),
    });
    expect(decision.status).toBe(409);
    expect(await decision.json()).toEqual({
      error: "Approval blocked by reported symptoms",
    });
  });
});
