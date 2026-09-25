"use client";

import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Clock3,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { CareChat, NotificationBell } from "@/components/care-comms";
import { pullRemotePlayers, pushRemoteDecision } from "@/lib/data/render-api";
import {
  type AuthSession,
  type ClinicianDecision,
  nextStage,
  type PlayerProfile,
  type TestRecord,
} from "@/lib/data/types";

const TEST_LABELS: Record<TestRecord["kind"], string> = {
  squat: "Single-leg squat",
  balance: "Single-leg balance",
  hop: "Hop on the spot",
  bridge: "Single-leg bridge",
};

function weeksSince(date: string) {
  const elapsed = Date.now() - new Date(`${date}T00:00:00`).getTime();
  return Math.max(0, Math.floor(elapsed / 604_800_000));
}

export function ClinicianDashboard({
  session,
  onLogout,
}: {
  session: AuthSession;
  onLogout: () => void;
}) {
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const remote = await pullRemotePlayers().catch(() => null);
    if (remote) {
      const remoteProfiles = remote.map((item) => ({
        id: String(item.id),
        name: String(item.display_name ?? item.name ?? "Player"),
        deliveryDate: String(item.delivery_date ?? item.deliveryDate),
        deliveryType: String(
          item.delivery_type ?? item.deliveryType,
        ) as PlayerProfile["deliveryType"],
        role: String(item.cricket_role ?? item.role) as PlayerProfile["role"],
        language: String(item.language) as PlayerProfile["language"],
        consentAt: String(item.consent_at ?? item.consentAt),
        clinicianId: session.user.id,
        clinicianName: session.user.name,
        stage: String(item.stage) as PlayerProfile["stage"],
        stageStatus: String(
          item.stage_status ?? item.stageStatus,
        ) as PlayerProfile["stageStatus"],
        updatedAt: String(item.updated_at ?? item.updatedAt),
      }));
      const remoteTests = remote.flatMap((item) =>
        ((item.tests as Array<Record<string, unknown>>) ?? []).map((test) => ({
          id: String(test.id),
          playerId: String(test.player_id ?? test.playerId),
          kind: String(test.kind) as TestRecord["kind"],
          side: String(test.side) as TestRecord["side"],
          metrics: test.metrics as TestRecord["metrics"],
          symptoms: (test.symptoms as string[]) ?? [],
          completedAt: String(test.completed_at ?? test.completedAt),
          syncStatus: "synced" as const,
        })),
      );
      setProfiles(remoteProfiles);
      setTests(
        remoteTests.sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
      );
      setSelectedId((current) =>
        remoteProfiles.some((profile) => profile.id === current)
          ? current
          : (remoteProfiles[0]?.id ?? null),
      );
    }
  }, [session.user.id, session.user.name]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 5_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [load]);

  const profile = profiles.find((item) => item.id === selectedId) ?? null;
  const playerTests = useMemo(
    () => tests.filter((test) => test.playerId === selectedId),
    [selectedId, tests],
  );
  const latest = playerTests[0] ?? null;
  const badge = latest?.symptoms.length
    ? { tone: "flag", label: "Symptoms reported" }
    : profile?.stageStatus === "awaiting-review"
      ? { tone: "", label: "Review pending" }
      : profile?.stageStatus === "held"
        ? { tone: "flag", label: "Stage on hold" }
        : latest
          ? { tone: "calm", label: "Active" }
          : { tone: "calm", label: "No check-in yet" };
  const flaggedCount = profiles.filter((item) =>
    tests.some((test) => test.playerId === item.id && test.symptoms.length > 0),
  ).length;
  const awaitingCount = profiles.filter(
    (item) => item.stageStatus === "awaiting-review",
  ).length;

  async function decide(decision: ClinicianDecision["decision"]) {
    if (!profile || !latest) return;
    const toStage =
      decision === "approve" ? nextStage(profile.stage) : profile.stage;
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
    setMessage("Saving decision...");
    try {
      const result = await pushRemoteDecision(record);
      setMessage(
        decision === "approve"
          ? `${profile.name} is now in ${result.stage}. The player has been notified.`
          : `${profile.name}'s ${profile.stage} stage remains on hold.`,
      );
      setNote("");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The decision could not be saved. Please retry.",
      );
    }
  }

  return (
    <main className="clinician-shell">
      <h1 className="sr-only">Clinical care dashboard</h1>
      <header className="clinician-topbar">
        <div>
          <BrandLogo className="clinician-logo" />
          <p>
            <strong>ComeBack Clinical</strong>
            <span>{session.user.name}</span>
          </p>
        </div>
        <div className="clinician-actions">
          <NotificationBell role="clinician" />
          <button className="clinician-account" onClick={onLogout}>
            <span>{session.user.name.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{session.user.name}</strong>
              <small>Sign out</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <div className="clinician-layout">
        <aside className="player-list">
          <h2>Care overview</h2>
          <p>Only players linked to you appear here.</p>
          <dl className="care-summary">
            <div>
              <dt>Players</dt>
              <dd>{profiles.length}</dd>
            </div>
            <div>
              <dt>To review</dt>
              <dd>{awaitingCount}</dd>
            </div>
            <div className={flaggedCount ? "flagged" : ""}>
              <dt>Symptoms</dt>
              <dd>{flaggedCount}</dd>
            </div>
          </dl>
          {profiles.length === 0 && (
            <div className="empty-clinician">
              <UserRound size={26} />
              <strong>No linked players yet</strong>
              <span>
                Players who select you during registration will appear here.
              </span>
            </div>
          )}
          <div className="player-roster">
            {profiles.map((item) => {
              const itemTests = tests.filter(
                (test) => test.playerId === item.id,
              );
              const hasFlag = itemTests.some(
                (test) => test.symptoms.length > 0,
              );
              return (
                <button
                  className={selectedId === item.id ? "selected" : ""}
                  data-player-id={item.id}
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="mini-avatar">
                    {item.name.slice(0, 2).toUpperCase()}
                  </span>
                  <p>
                    <strong>{item.name}</strong>
                    <span>
                      {item.stage}, {item.role.replace("-", " ")}
                    </span>
                  </p>
                  {hasFlag ? (
                    <AlertTriangle
                      className="alert-icon"
                      size={18}
                      aria-label="Symptoms reported"
                    />
                  ) : (
                    <Check
                      className="clear-icon"
                      size={18}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="clinical-content">
          {!profile ? (
            <div className="clinical-empty">
              <ClipboardCheck size={38} />
              <h2>Choose a player to review</h2>
              <p>Select a linked player when one becomes available.</p>
            </div>
          ) : (
            <>
              <div className="clinical-heading">
                <div>
                  <h2>{profile.name}</h2>
                  <div className="heading-chips">
                    <span className="chip chip-petal">
                      Stage: {profile.stage}
                    </span>
                    <span className="chip chip-quiet capitalize">
                      {profile.role.replace("-", " ")}
                    </span>
                    <span className="chip chip-quiet">
                      {weeksSince(profile.deliveryDate)} weeks since birth
                    </span>
                  </div>
                </div>
                <span className={`review-badge ${badge.tone}`}>
                  {badge.tone === "flag" ? (
                    <AlertTriangle size={15} />
                  ) : (
                    <Clock3 size={15} />
                  )}
                  {badge.label}
                </span>
              </div>

              <div className="clinical-grid">
                <section className="clinical-card latest-check">
                  <div className="card-title">
                    <span>
                      <ClipboardCheck size={19} />
                    </span>
                    <div>
                      <small>Latest check-in</small>
                      <h3>
                        {latest ? TEST_LABELS[latest.kind] : "No check-in yet"}
                      </h3>
                    </div>
                  </div>
                  {latest ? (
                    <>
                      <div className="metric-row">
                        <div>
                          <strong>{latest.metrics.count}</strong>
                          <span>Observed reps</span>
                        </div>
                        <div>
                          <strong>
                            {latest.metrics.holdSeconds.toFixed(1)}s
                          </strong>
                          <span>Observed hold</span>
                        </div>
                        <div>
                          <strong>
                            {latest.metrics.asymmetry?.toFixed(0) ?? "--"} deg
                          </strong>
                          <span>Side difference</span>
                        </div>
                      </div>
                      <small className="timestamp">
                        Saved {new Date(latest.completedAt).toLocaleString()}
                      </small>
                    </>
                  ) : (
                    <p className="empty-copy">
                      Ask the player to complete a movement and symptom
                      check-in.
                    </p>
                  )}
                </section>

                <section
                  className={`clinical-card symptom-review ${latest?.symptoms.length ? "has-flags" : ""}`}
                >
                  <div className="card-title">
                    <span>
                      {latest?.symptoms.length ? (
                        <AlertTriangle size={19} />
                      ) : (
                        <ShieldCheck size={19} />
                      )}
                    </span>
                    <div>
                      <small>Symptom screen</small>
                      <h3>
                        {latest?.symptoms.length
                          ? `${latest.symptoms.length} reported`
                          : "No symptoms reported"}
                      </h3>
                    </div>
                  </div>
                  {latest?.symptoms.length ? (
                    <ul>
                      {latest.symptoms.map((symptom) => (
                        <li key={symptom}>{symptom.replaceAll("_", " ")}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-copy">
                      The latest player check-in did not report a listed
                      symptom.
                    </p>
                  )}
                  <small>Self-report, not a diagnosis.</small>
                </section>
              </div>

              <section className="clinical-card trend-card">
                <div className="card-title">
                  <span>
                    <Clock3 size={19} />
                  </span>
                  <div>
                    <small>Recent observations</small>
                    <h3>Check-in history</h3>
                  </div>
                </div>
                <div className="trend-list">
                  {playerTests.length === 0 ? (
                    <p className="empty-copy">No observations saved yet.</p>
                  ) : (
                    playerTests.slice(0, 5).map((test) => (
                      <div key={test.id}>
                        <span
                          className={`trend-dot ${test.symptoms.length ? "flag" : ""}`}
                        />
                        <p>
                          <strong>{TEST_LABELS[test.kind]}</strong>
                          <span>
                            {new Date(test.completedAt).toLocaleDateString()}
                          </span>
                        </p>
                        <span>
                          {test.metrics.count
                            ? `${test.metrics.count} reps`
                            : `${test.metrics.holdSeconds.toFixed(1)} sec`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <CareChat
                role="clinician"
                playerId={profile.id}
                title={profile.name}
              />

              <section className="decision-card">
                <div>
                  <h3>Your clinical decision</h3>
                  <p>
                    Review the player directly and use your professional
                    judgement. Camera observations never determine this
                    decision.
                  </p>
                </div>
                <label className="decision-note">
                  Optional note
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Context for the player and care team"
                  />
                </label>
                <div className="decision-actions">
                  <button
                    className="hold-button"
                    disabled={!latest}
                    onClick={() => decide("hold")}
                  >
                    <AlertTriangle size={17} /> Hold current stage
                  </button>
                  <button
                    className="approve-button"
                    disabled={!latest || Boolean(latest.symptoms.length)}
                    onClick={() => decide("approve")}
                  >
                    <Check size={17} /> Approve next stage
                  </button>
                </div>
                {latest?.symptoms.length ? (
                  <p className="decision-warning">
                    Approval is disabled while the latest check-in contains
                    reported symptoms.
                  </p>
                ) : null}
                {message && (
                  <p className="decision-message" role="status">
                    {message}
                  </p>
                )}
              </section>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
