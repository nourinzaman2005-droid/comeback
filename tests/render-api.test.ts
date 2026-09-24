// @vitest-environment node

import { spawn, type ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const port = 18_000 + Math.floor(Math.random() * 1_000);
const api = `http://127.0.0.1:${port}`;
let server: ChildProcess;

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${api}/health`);
      if (response.ok) return;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Render API did not start");
}

async function demoToken(role: "player" | "clinician", playerId?: string) {
  const response = await fetch(`${api}/api/demo/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, playerId }),
  });
  expect(response.ok).toBe(true);
  return ((await response.json()) as { token: string }).token;
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

describe("Render API end-to-end workflow", () => {
  beforeAll(async () => {
    server = spawn(process.execPath, ["server/index.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        DEMO_MODE: "true",
        SESSION_SECRET: "test-session-secret-that-is-not-used-in-production",
        DATABASE_URL: "",
      },
      stdio: "ignore",
    });
    await waitForServer();
  });

  afterAll(() => {
    server?.kill();
  });

  it("syncs a check-in, clinician approval, and stage change", async () => {
    const playerId = "api-player";
    const playerToken = await demoToken("player", playerId);
    const clinicianToken = await demoToken("clinician");
    const timestamp = new Date().toISOString();

    const profile = {
      id: playerId,
      name: "Nourin",
      deliveryDate: "2026-06-04",
      deliveryType: "caesarean",
      role: "bowler",
      language: "en",
      consentAt: timestamp,
      stage: "Restore",
      stageStatus: "active",
      updatedAt: timestamp,
    };
    expect(
      (
        await fetch(`${api}/api/players/${playerId}`, {
          method: "PUT",
          ...authorized(playerToken, profile),
        })
      ).ok,
    ).toBe(true);

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
          ...authorized(playerToken, test),
        })
      ).status,
    ).toBe(201);

    const queue = await fetch(
      `${api}/api/clinician/players`,
      authorized(clinicianToken),
    );
    const players = (await queue.json()) as Array<{
      id: string;
      stageStatus: string;
      tests: Array<{ id: string }>;
    }>;
    expect(players[0]).toMatchObject({
      id: playerId,
      stageStatus: "awaiting-review",
      tests: [{ id: test.id }],
    });

    const decision = await fetch(`${api}/api/decisions`, {
      method: "POST",
      ...authorized(clinicianToken, {
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
      authorized(playerToken),
    );
    expect(await refreshed.json()).toMatchObject({
      stage: "Recondition",
      stageStatus: "active",
    });
  });

  it("blocks approval when symptoms were reported", async () => {
    const playerId = "symptom-player";
    const playerToken = await demoToken("player", playerId);
    const clinicianToken = await demoToken("clinician");
    const timestamp = new Date().toISOString();

    await fetch(`${api}/api/players/${playerId}`, {
      method: "PUT",
      ...authorized(playerToken, {
        id: playerId,
        name: "Ashra",
        deliveryDate: "2026-05-01",
        deliveryType: "vaginal",
        role: "batter",
        language: "en",
        consentAt: timestamp,
        stage: "Review",
        stageStatus: "active",
        updatedAt: timestamp,
      }),
    });
    await fetch(`${api}/api/tests`, {
      method: "POST",
      ...authorized(playerToken, {
        id: "api-test-symptom",
        playerId,
        kind: "balance",
        side: "left",
        metrics: { holdSeconds: 12 },
        symptoms: ["pelvic heaviness"],
        completedAt: timestamp,
      }),
    });

    const decision = await fetch(`${api}/api/decisions`, {
      method: "POST",
      ...authorized(clinicianToken, {
        id: "api-decision-blocked",
        playerId,
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
