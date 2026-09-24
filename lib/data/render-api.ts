import type { ClinicianDecision, PlayerProfile, TestRecord } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

async function session(role: "player" | "clinician", playerId?: string) {
  if (!API_URL) return null;
  const key = `comeback:${role}:${playerId ?? "all"}:token`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const response = await fetch(`${API_URL}/api/demo/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, playerId }),
  });
  if (!response.ok) return null;
  const result = await response.json();
  localStorage.setItem(key, result.token);
  return result.token as string;
}

async function request(path: string, token: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export async function pushRemoteProfile(profile: PlayerProfile) {
  const token = await session("player", profile.id);
  if (!token) return false;
  const response = await request(`/api/players/${profile.id}`, token, {
    method: "PUT",
    body: JSON.stringify(profile),
  });
  return response.ok;
}

export async function pushRemoteTest(test: TestRecord) {
  const token = await session("player", test.playerId);
  if (!token) return false;
  const response = await request("/api/tests", token, {
    method: "POST",
    body: JSON.stringify(test),
  });
  return response.ok;
}

export async function pullRemoteProfile(profile: PlayerProfile) {
  const token = await session("player", profile.id);
  if (!token) return null;
  const response = await request(`/api/players/${profile.id}`, token);
  if (!response.ok) return null;
  const value = await response.json();
  if (!value) return null;
  return {
    ...profile,
    name: value.display_name ?? value.name ?? profile.name,
    language: value.language ?? profile.language,
    stage: value.stage ?? profile.stage,
    stageStatus: value.stage_status ?? value.stageStatus ?? profile.stageStatus,
    updatedAt: value.updated_at ?? value.updatedAt ?? profile.updatedAt,
  } as PlayerProfile;
}

export async function pullRemotePlayers() {
  const token = await session("clinician");
  if (!token) return null;
  const response = await request("/api/clinician/players", token);
  if (!response.ok) return null;
  return (await response.json()) as Array<Record<string, unknown>>;
}

export async function pushRemoteDecision(decision: ClinicianDecision) {
  const token = await session("clinician");
  if (!token) return null;
  const response = await request("/api/decisions", token, {
    method: "POST",
    body: JSON.stringify(decision),
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ stage: string; status: string }>;
}
