import { deleteValue, getAllValues } from "./indexed-db";
import {
  pushRemoteDecision,
  pushRemoteProfile,
  pushRemoteTest,
} from "./render-api";
import type {
  ClinicianDecision,
  PlayerProfile,
  SyncItem,
  TestRecord,
} from "./types";

export type SyncSummary = {
  mode: "render" | "offline";
  synced: number;
  pending: number;
};

async function pushItem(item: SyncItem) {
  if (item.entity === "profile")
    return pushRemoteProfile(item.payload as PlayerProfile);
  if (item.entity === "test") return pushRemoteTest(item.payload as TestRecord);
  if (item.entity === "decision") {
    await pushRemoteDecision(item.payload as ClinicianDecision);
    return true;
  }
  return false;
}

export async function flushSyncQueue(): Promise<SyncSummary> {
  const queue = await getAllValues<SyncItem>("syncQueue");
  let synced = 0;
  for (const item of queue) {
    try {
      if (!(await pushItem(item))) continue;
      await deleteValue("syncQueue", item.id);
      synced += 1;
    } catch {
      // Keep failed items in IndexedDB so a later online attempt can retry.
    }
  }
  const pending = queue.length - synced;
  return { mode: pending ? "offline" : "render", synced, pending };
}
