import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(
  `${process.cwd()}/supabase/migrations/202609250001_initial.sql`,
  "utf8",
);

describe("Supabase clinical data boundary", () => {
  it("enables RLS on every remotely synced table", () => {
    for (const table of [
      "profiles",
      "clinician_links",
      "test_records",
      "clinician_decisions",
      "red_flag_alerts",
    ]) {
      expect(schema).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("restricts clinical access to accepted linked clinicians", () => {
    expect(schema).toContain("and accepted_at is not null");
    expect(schema).toContain("public.is_linked_clinician(player_id)");
  });

  it("updates stage through a clinician decision trigger", () => {
    expect(schema).toContain("trigger clinician_decision_updates_stage");
    expect(schema).toContain("after insert on public.clinician_decisions");
    expect(schema).toContain("Approval must advance exactly one stage");
    expect(schema).toContain("Cannot approve while the reviewed test has reported symptoms");
    expect(schema).toContain("trigger player_cannot_change_own_stage");
  });

  it("stores metrics and symptoms but has no video column", () => {
    expect(schema).toContain("metrics jsonb not null");
    expect(schema).toContain("symptoms text[] not null");
    expect(schema).not.toMatch(/video(_url|_blob| bytea)/i);
  });
});
