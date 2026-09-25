import type { CameraMetrics, TestKind } from "../pose/types";

export const STAGES = [
  "Ready",
  "Review",
  "Restore",
  "Recondition",
  "Return",
  "Refine",
] as const;

export type Stage = (typeof STAGES)[number];
export type DeliveryType = "vaginal" | "caesarean" | "other";
export type PlayerRole = "batter" | "bowler" | "all-rounder" | "wicketkeeper";

export type PlayerProfile = {
  id: string;
  name: string;
  deliveryDate: string;
  deliveryType: DeliveryType;
  role: PlayerRole;
  language: "en" | "bn" | "hi" | "ur";
  consentAt: string;
  clinicianId: string;
  clinicianName: string;
  stage: Stage;
  stageStatus: "active" | "awaiting-review" | "held";
  updatedAt: string;
};

export type TestRecord = {
  id: string;
  playerId: string;
  kind: TestKind;
  side: "left" | "right" | "both";
  metrics: Pick<
    CameraMetrics,
    "count" | "holdSeconds" | "kneeAngle" | "squatDepth" | "fppa" | "asymmetry"
  >;
  symptoms: string[];
  completedAt: string;
  syncStatus: "pending" | "synced" | "local-demo";
};

export type ClinicianDecision = {
  id: string;
  playerId: string;
  testId: string;
  decision: "approve" | "hold";
  fromStage: Stage;
  toStage: Stage;
  note: string;
  clinicianId: string;
  createdAt: string;
  syncStatus: "pending" | "synced" | "local-demo";
};

export type SyncItem = {
  id: string;
  entity: "profile" | "test" | "decision" | "alert";
  entityId: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
};

export type AccountRole = "player" | "clinician";

export type AuthUser = {
  id: string;
  email: string;
  role: AccountRole;
  name: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  expiresInSeconds: number;
};

export type ClinicianDirectoryItem = {
  id: string;
  displayName: string;
  specialty: string;
  memberBoard: string;
  verified: boolean;
};

export type CareMessage = {
  id: string;
  playerId: string;
  clinicianId: string;
  senderRole: AccountRole;
  body: string;
  createdAt: string;
  readByPlayer: boolean;
  readByClinician: boolean;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export const DEMO_PROFILE: PlayerProfile = {
  id: "player-nourin-demo",
  name: "Nourin",
  deliveryDate: "2026-06-04",
  deliveryType: "caesarean",
  role: "bowler",
  language: "en",
  consentAt: "2026-09-25T00:00:00.000Z",
  clinicianId: "clinician-maya-demo",
  clinicianName: "Dr. Maya Rahman",
  stage: "Restore",
  stageStatus: "active",
  updatedAt: "2026-09-25T00:00:00.000Z",
};

export function nextStage(stage: Stage): Stage {
  const index = STAGES.indexOf(stage);
  return STAGES[Math.min(index + 1, STAGES.length - 1)];
}
