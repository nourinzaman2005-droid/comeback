import { deleteValue, getAllValues } from "./indexed-db";
import type { SyncItem } from "./types";

const TABLES: Record<SyncItem["entity"], string> = {
  profile: "profiles",
  test: "test_records",
  decision: "clinician_decisions",
  alert: "red_flag_alerts",
};

function remotePayload(item: SyncItem) {
  const value = item.payload as Record<string, unknown>;
  if (item.entity === "profile") {
    return {
      id: value.id,
      display_name: value.name,
      delivery_date: value.deliveryDate,
      delivery_type: value.deliveryType,
      cricket_role: value.role,
      language: value.language,
      consent_at: value.consentAt,
      stage: value.stage,
      stage_status: value.stageStatus,
      updated_at: value.updatedAt,
    };
  }
  if (item.entity === "test") {
    return {
      id: value.id,
      player_id: value.playerId,
      kind: value.kind,
      side: value.side,
      metrics: value.metrics,
      symptoms: value.symptoms,
      completed_at: value.completedAt,
    };
  }
  if (item.entity === "decision") {
    return {
      id: value.id,
      player_id: value.playerId,
      test_id: value.testId,
      decision: value.decision,
      from_stage: value.fromStage,
      to_stage: value.toStage,
      note: value.note,
      created_at: value.createdAt,
    };
  }
  return value;
}

export type SyncSummary = {
  mode: "supabase" | "local-demo";
  synced: number;
  pending: number;
};

export async function flushSyncQueue(accessToken?: string): Promise<SyncSummary> {
  const queue = await getAllValues<SyncItem>("syncQueue");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes("your-project") || !accessToken) {
    return { mode: "local-demo", synced: 0, pending: queue.length };
  }

  let synced = 0;
  for (const item of queue) {
    const response = await fetch(`${url}/rest/v1/${TABLES[item.entity]}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(remotePayload(item)),
    });
    if (response.ok) {
      const raw = item.payload as { symptoms?: string[] };
      if (item.entity === "test" && raw.symptoms?.length) {
        await fetch(`${url}/functions/v1/red-flag-alert`, {
          method: "POST",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            testId: item.entityId,
            symptoms: raw.symptoms,
          }),
        });
      }
      await deleteValue("syncQueue", item.id);
      synced += 1;
    }
  }
  return { mode: "supabase", synced, pending: queue.length - synced };
}
