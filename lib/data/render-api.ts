import type { Language, StageExplanation } from "../ai/explanation";
import type {
  AccountRole,
  AppNotification,
  AuthSession,
  CareMessage,
  ClinicianDecision,
  ClinicianDirectoryItem,
  PlayerProfile,
  Stage,
  TestRecord,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:10000";

const sessionKey = (role: AccountRole) => `comeback:${role}:auth`;

export function getStoredSession(role: AccountRole): AuthSession | null {
  try {
    const value = localStorage.getItem(sessionKey(role));
    return value ? (JSON.parse(value) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function storeSession(value: AuthSession) {
  localStorage.setItem(sessionKey(value.user.role), JSON.stringify(value));
}

export function clearSession(role: AccountRole) {
  localStorage.removeItem(sessionKey(role));
}

async function parseResponse<T>(response: Response): Promise<T> {
  const value = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(value.error ?? "ComeBack could not complete that request");
  return value;
}

async function publicRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  return parseResponse<T>(response);
}

async function authorizedRequest<T>(
  role: AccountRole,
  path: string,
  init?: RequestInit,
) {
  const current = getStoredSession(role);
  if (!current) throw new Error("Please sign in again");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${current.token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (response.status === 401 || response.status === 403) {
    clearSession(role);
    window.dispatchEvent(new Event("comeback-auth-expired"));
  }
  return parseResponse<T>(response);
}

export async function login(
  role: AccountRole,
  email: string,
  password: string,
) {
  const result = await publicRequest<AuthSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ role, email, password }),
  });
  storeSession(result);
  return result;
}

export async function registerPlayer(value: {
  email: string;
  password: string;
  name: string;
  deliveryDate: string;
  deliveryType: "vaginal" | "caesarean" | "other";
  cricketRole: "batter" | "bowler" | "all-rounder" | "wicketkeeper";
  language: Language;
  clinicianId: string;
  consent: true;
}) {
  const result = await publicRequest<AuthSession>("/api/auth/register/player", {
    method: "POST",
    body: JSON.stringify(value),
  });
  storeSession(result);
  return result;
}

export async function registerClinician(value: {
  email: string;
  password: string;
  registrationNumber: string;
}) {
  const result = await publicRequest<AuthSession>(
    "/api/auth/register/clinician",
    { method: "POST", body: JSON.stringify(value) },
  );
  storeSession(result);
  return result;
}

export async function validateSession(role: AccountRole) {
  const current = getStoredSession(role);
  if (!current) return null;
  try {
    const user = await authorizedRequest<AuthSession["user"]>(
      role,
      "/api/auth/me",
    );
    const next = { ...current, user };
    storeSession(next);
    return next;
  } catch {
    return getStoredSession(role);
  }
}

export async function fetchClinicians() {
  const values = await publicRequest<
    Array<{
      id: string;
      display_name: string;
      specialty: string;
      member_board: string;
      verified: boolean;
    }>
  >("/api/clinicians");
  return values.map((value): ClinicianDirectoryItem => ({
    id: value.id,
    displayName: value.display_name,
    specialty: value.specialty,
    memberBoard: value.member_board,
    verified: value.verified,
  }));
}

function mapProfile(
  value: Record<string, unknown>,
  existing?: PlayerProfile,
): PlayerProfile {
  return {
    id: String(value.id ?? existing?.id),
    name: String(value.display_name ?? value.name ?? existing?.name),
    deliveryDate: String(
      value.delivery_date ?? value.deliveryDate ?? existing?.deliveryDate,
    ).slice(0, 10),
    deliveryType: (value.delivery_type ??
      value.deliveryType ??
      existing?.deliveryType) as PlayerProfile["deliveryType"],
    role: (value.cricket_role ??
      value.role ??
      existing?.role) as PlayerProfile["role"],
    language: (value.language ?? existing?.language ?? "en") as Language,
    consentAt: String(
      value.consent_at ?? value.consentAt ?? existing?.consentAt,
    ),
    clinicianId: String(
      value.clinician_id ?? value.clinicianId ?? existing?.clinicianId,
    ),
    clinicianName: String(
      value.clinician_name ??
        value.clinicianName ??
        existing?.clinicianName ??
        "Linked clinician",
    ),
    stage: (value.stage ?? existing?.stage ?? "Ready") as Stage,
    stageStatus: (value.stage_status ??
      value.stageStatus ??
      existing?.stageStatus ??
      "active") as PlayerProfile["stageStatus"],
    updatedAt: String(
      value.updated_at ?? value.updatedAt ?? existing?.updatedAt,
    ),
  };
}

export async function getRemoteProfile(playerId: string) {
  const value = await authorizedRequest<Record<string, unknown>>(
    "player",
    `/api/players/${playerId}`,
  );
  return mapProfile(value);
}

export async function pushRemoteProfile(profile: PlayerProfile) {
  try {
    await authorizedRequest("player", `/api/players/${profile.id}`, {
      method: "PUT",
      body: JSON.stringify(profile),
    });
    return true;
  } catch {
    return false;
  }
}

export async function pushRemoteTest(test: TestRecord) {
  try {
    await authorizedRequest("player", "/api/tests", {
      method: "POST",
      body: JSON.stringify(test),
    });
    return true;
  } catch {
    return false;
  }
}

export async function pullRemoteProfile(profile: PlayerProfile) {
  try {
    const value = await authorizedRequest<Record<string, unknown>>(
      "player",
      `/api/players/${profile.id}`,
    );
    return mapProfile(value, profile);
  } catch {
    return null;
  }
}

export async function pullRemotePlayers() {
  return authorizedRequest<Array<Record<string, unknown>>>(
    "clinician",
    "/api/clinician/players",
  );
}

export async function pushRemoteDecision(decision: ClinicianDecision) {
  return authorizedRequest<{ stage: string; status: string }>(
    "clinician",
    "/api/decisions",
    { method: "POST", body: JSON.stringify(decision) },
  );
}

function mapMessage(value: Record<string, unknown>): CareMessage {
  return {
    id: String(value.id),
    playerId: String(value.player_id ?? value.playerId),
    clinicianId: String(value.clinician_id ?? value.clinicianId),
    senderRole: (value.sender_role ?? value.senderRole) as AccountRole,
    body: String(value.body),
    createdAt: String(value.created_at ?? value.createdAt),
    readByPlayer: Boolean(value.read_by_player ?? value.readByPlayer),
    readByClinician: Boolean(value.read_by_clinician ?? value.readByClinician),
  };
}

export async function getMessages(role: AccountRole, playerId: string) {
  const values = await authorizedRequest<Array<Record<string, unknown>>>(
    role,
    `/api/messages?playerId=${encodeURIComponent(playerId)}`,
  );
  return values.map(mapMessage);
}

export async function sendMessage(
  role: AccountRole,
  playerId: string,
  body: string,
) {
  const value = await authorizedRequest<Record<string, unknown>>(
    role,
    "/api/messages",
    { method: "POST", body: JSON.stringify({ playerId, body }) },
  );
  return mapMessage(value);
}

export async function getNotifications(role: AccountRole) {
  const values = await authorizedRequest<Array<Record<string, unknown>>>(
    role,
    "/api/notifications",
  );
  return values.map((value): AppNotification => ({
    id: String(value.id),
    type: String(value.type),
    title: String(value.title),
    body: String(value.body),
    createdAt: String(value.created_at ?? value.createdAt),
    readAt: (value.read_at ?? value.readAt ?? null) as string | null,
  }));
}

export async function markNotificationsRead(role: AccountRole, id?: string) {
  return authorizedRequest<{ ok: boolean }>(role, "/api/notifications/read", {
    method: "PATCH",
    body: JSON.stringify({ id }),
  });
}

export async function explainStage(
  stage: Stage,
  language: Language,
  question: string,
) {
  return authorizedRequest<StageExplanation>("player", "/api/explain", {
    method: "POST",
    body: JSON.stringify({ stage, language, question }),
  });
}
