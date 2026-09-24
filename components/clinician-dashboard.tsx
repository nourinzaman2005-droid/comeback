"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ClipboardCheck,
  Clock3,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAllValues,
  putValue,
  saveWithQueue,
  subscribeToData,
} from "@/lib/data/indexed-db";
import {
  ClinicianDecision,
  nextStage,
  PlayerProfile,
  TestRecord,
} from "@/lib/data/types";

export function ClinicianDashboard() {
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const nextProfiles = await getAllValues<PlayerProfile>("profiles");
    const nextTests = await getAllValues<TestRecord>("tests");
    setProfiles(nextProfiles);
    setTests(nextTests.sort((a, b) => b.completedAt.localeCompare(a.completedAt)));
    setSelectedId((current) => current ?? nextProfiles[0]?.id ?? null);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const unsubscribe = subscribeToData(() => void load());
    return () => {
      window.clearTimeout(initialLoad);
      unsubscribe();
    };
  }, [load]);

  const profile = profiles.find((item) => item.id === selectedId) ?? null;
  const playerTests = useMemo(
    () => tests.filter((test) => test.playerId === selectedId),
    [selectedId, tests],
  );
  const latest = playerTests[0] ?? null;

  async function decide(decision: ClinicianDecision["decision"]) {
    if (!profile || !latest) return;
    const toStage = decision === "approve" ? nextStage(profile.stage) : profile.stage;
    const createdAt = new Date().toISOString();
    const record: ClinicianDecision = {
      id: `decision-${crypto.randomUUID()}`,
      playerId: profile.id,
      testId: latest.id,
      decision,
      fromStage: profile.stage,
      toStage,
      note: note.trim(),
      clinicianId: profile.clinicianId,
      createdAt,
      syncStatus: "local-demo",
    };
    await saveWithQueue("decision", "decisions", record);
    await putValue("profiles", {
      ...profile,
      stage: toStage,
      stageStatus: decision === "approve" ? "active" : "held",
      updatedAt: createdAt,
    });
    setMessage(
      decision === "approve"
        ? `${profile.name} is now in ${toStage}. The player view has been updated.`
        : `${profile.name}'s ${profile.stage} stage remains on hold.`,
    );
    setNote("");
    await load();
  }

  return (
    <main className="clinician-shell">
      <header className="clinician-topbar">
        <div><span className="clinician-logo"><Stethoscope size={21} /></span><p><strong>ComeBack Clinical</strong><span>Demo workspace</span></p></div>
        <Link href="/"><ArrowLeft size={17} /> Player view</Link>
      </header>
      <div className="clinician-layout">
        <aside className="player-list">
          <span className="eyebrow">Linked players</span>
          <h1>Care overview</h1>
          <p>Only players linked to this clinician appear here.</p>
          {profiles.length === 0 && <div className="empty-clinician"><UserRound size={26} /><strong>No local player yet</strong><span>Open player view and choose the demo.</span></div>}
          {profiles.map((item) => {
            const itemTests = tests.filter((test) => test.playerId === item.id);
            const hasFlag = itemTests.some((test) => test.symptoms.length > 0);
            return <button className={selectedId === item.id ? "selected" : ""} key={item.id} onClick={() => setSelectedId(item.id)}><span className="mini-avatar">{item.name.slice(0, 2).toUpperCase()}</span><p><strong>{item.name}</strong><span>{item.role.replace("-", " ")} · {item.stage}</span></p>{hasFlag ? <AlertTriangle className="alert-icon" size={18} /> : <Check className="clear-icon" size={18} />}</button>;
          })}
        </aside>

        <section className="clinical-content">
          {!profile ? <div className="clinical-empty"><ClipboardCheck size={38} /><h2>Choose a player to review</h2><p>The local demo keeps clinical decisions on this device.</p></div> : <>
            <div className="clinical-heading"><div><span className="eyebrow">Player review</span><h2>{profile.name}</h2><p>{profile.stage} · {profile.stageStatus.replace("-", " ")} · {profile.role.replace("-", " ")}</p></div><span className={`review-badge ${latest?.symptoms.length ? "flag" : ""}`}>{latest?.symptoms.length ? <AlertTriangle size={15} /> : <Clock3 size={15} />}{latest?.symptoms.length ? "Symptoms reported" : "Review pending"}</span></div>

            <div className="clinical-grid">
              <section className="clinical-card latest-check"><div className="card-title"><span><ClipboardCheck size={19} /></span><div><small>Latest check-in</small><h3>{latest ? latest.kind.replace("-", " ") : "No check-in yet"}</h3></div></div>{latest ? <><div className="metric-row"><div><strong>{latest.metrics.count}</strong><span>Observed reps</span></div><div><strong>{latest.metrics.holdSeconds.toFixed(1)}s</strong><span>Observed hold</span></div><div><strong>{latest.metrics.asymmetry?.toFixed(0) ?? "--"}°</strong><span>Side difference</span></div></div><small className="timestamp">Saved {new Date(latest.completedAt).toLocaleString()}</small></> : <p className="empty-copy">Ask the player to complete a movement and symptom check-in.</p>}</section>

              <section className={`clinical-card symptom-review ${latest?.symptoms.length ? "has-flags" : ""}`}><div className="card-title"><span>{latest?.symptoms.length ? <AlertTriangle size={19} /> : <ShieldCheck size={19} />}</span><div><small>Symptom screen</small><h3>{latest?.symptoms.length ? `${latest.symptoms.length} reported` : "No symptoms reported"}</h3></div></div>{latest?.symptoms.length ? <ul>{latest.symptoms.map((symptom) => <li key={symptom}>{symptom.replaceAll("_", " ")}</li>)}</ul> : <p className="empty-copy">The latest player check-in did not report a listed symptom.</p>}<small>Self-report, not a diagnosis.</small></section>
            </div>

            <section className="clinical-card trend-card"><div className="card-title"><span><Clock3 size={19} /></span><div><small>Recent observations</small><h3>Check-in history</h3></div></div><div className="trend-list">{playerTests.length === 0 ? <p className="empty-copy">No observations saved yet.</p> : playerTests.slice(0, 5).map((test) => <div key={test.id}><span className={`trend-dot ${test.symptoms.length ? "flag" : ""}`} /><p><strong>{test.kind.replace("-", " ")}</strong><span>{new Date(test.completedAt).toLocaleDateString()}</span></p><span>{test.metrics.count ? `${test.metrics.count} reps` : `${test.metrics.holdSeconds.toFixed(1)} sec`}</span></div>)}</div></section>

            <section className="decision-card"><div><span className="eyebrow">Clinical decision</span><h3>Keep the human gate</h3><p>Review the player directly and use your professional judgement. Camera observations never determine this decision.</p></div><label>Optional note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Context for the player and care team" /></label><div className="decision-actions"><button className="hold-button" disabled={!latest} onClick={() => decide("hold")}><AlertTriangle size={17} /> Hold current stage</button><button className="approve-button" disabled={!latest || Boolean(latest.symptoms.length)} onClick={() => decide("approve")}><Check size={17} /> Approve next stage</button></div>{latest?.symptoms.length ? <p className="decision-warning">Approval is disabled while the latest check-in contains reported symptoms.</p> : null}{message && <p className="decision-message" role="status">{message}</p>}</section>
          </>}
        </section>
      </div>
    </main>
  );
}
