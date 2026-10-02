"use client";

import {
  ArrowLeft,
  ArrowRight,
  Baby,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  Clock3,
  CloudOff,
  HeartHandshake,
  Home,
  LockKeyhole,
  LogOut,
  MessageCircleMore,
  Pause,
  Route,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { BrandLogo } from "@/components/brand-logo";
import { CareChat, NotificationBell } from "@/components/care-comms";
import { PlacementDiagram, SeamMotif, TEST_ICONS } from "@/components/icons";
import { CountUp, ReturnRing } from "@/components/motion";
import guideline from "@/content/guidelines/icc-2026.json";
import testGuideline from "@/content/guidelines/tests.json";
import {
  groundedFallback,
  type Language,
  type StageExplanation,
} from "@/lib/ai/explanation";
import {
  clearLocalData,
  getAllValues,
  getValue,
  putValue,
  saveWithQueue,
} from "@/lib/data/indexed-db";
import { flushSyncQueue, SyncSummary } from "@/lib/data/sync";
import {
  API_URL,
  explainStage,
  getRemoteProfile,
  pullRemoteProfile,
} from "@/lib/data/render-api";
import {
  type AuthSession,
  type PlayerProfile,
  STAGES,
  type TestRecord,
} from "@/lib/data/types";
import type { CameraMetrics, TestKind } from "@/lib/pose/types";
import { fill, UI_COPY, type UiKey } from "@/lib/i18n/ui";
import { PoseCamera } from "./pose-camera";
import { ServiceWorkerRegister } from "./service-worker-register";

type Page =
  | "home"
  | "journey"
  | "setup"
  | "test"
  | "symptoms"
  | "result"
  | "support"
  | "profile";
type UiStrings = Record<UiKey, string>;

const FLOW_PAGES: Page[] = ["setup", "test", "symptoms", "result"];
const symptomOptions = testGuideline.symptomStops;

const emptyMetrics: CameraMetrics = {
  count: 0,
  holdSeconds: 0,
  framing: "not-visible",
  cue: "",
  fps: 0,
};

const TEST_LABELS: Record<TestKind, string> = {
  squat: "Single-leg squat",
  balance: "Single-leg balance",
  hop: "Hop on the spot",
  bridge: "Single-leg bridge",
};

const CRICKET_FOCUS: Record<PlayerProfile["role"], string> = {
  bowler:
    "Agree a graded bowling plan with your care team, building overs and intensity step by step.",
  batter:
    "Rebuild batting and running between the wickets gradually, with your care team setting the pace.",
  "all-rounder":
    "Plan bowling and batting load together so neither builds faster than the other.",
  wicketkeeper:
    "Reintroduce crouching, diving and repeated squats gradually, guided by your care team.",
};

const PROGRESSION_RULES = [
  "Minimum time for the stage has passed",
  "Required check-ins are complete",
  "No red-flag symptoms in the window",
  "Your linked clinician approves",
];

function weeksSince(date: string) {
  const elapsed = Date.now() - new Date(`${date}T00:00:00`).getTime();
  return Math.max(0, Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)));
}

function todayLabel(language: Language) {
  const locale = { en: "en-GB", bn: "bn-BD", hi: "hi-IN", ur: "ur-PK" }[
    language
  ];
  return new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

const NAV_ITEMS: { page: Page; key: UiKey; icon: typeof Home }[] = [
  { page: "home", key: "today", icon: Home },
  { page: "journey", key: "journey", icon: Route },
  { page: "support", key: "support", icon: MessageCircleMore },
  { page: "profile", key: "profile", icon: CircleUserRound },
];

function Shell({
  children,
  page,
  setPage,
  profile,
  onLanguage,
}: {
  children: React.ReactNode;
  page: Page;
  setPage: (page: Page) => void;
  profile: PlayerProfile;
  onLanguage: (language: Language) => void;
}) {
  const t = UI_COPY[profile.language];
  const inFlow = FLOW_PAGES.includes(page);
  const activeNav = inFlow ? "home" : page;
  const activeIndex = NAV_ITEMS.findIndex((item) => item.page === activeNav);
  return (
    <div
      className={`app-shell ${inFlow ? "in-flow" : ""}`}
      dir={profile.language === "ur" ? "rtl" : "ltr"}
    >
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <ServiceWorkerRegister />
      <header className="app-topbar">
        <button
          className="brand topbar-brand"
          onClick={() => setPage("home")}
          aria-label="Go home"
        >
          <BrandLogo className="brand-mark" />
          <span>ComeBack</span>
        </button>
        <div className="top-actions">
          <label className="language-picker">
            <span className="sr-only">Language</span>
            <select
              value={profile.language}
              onChange={(event) => onLanguage(event.target.value as Language)}
              aria-label="Language"
            >
              <option value="en">English</option>
              <option value="bn">বাংলা</option>
              <option value="hi">हिंदी</option>
              <option value="ur">اردو</option>
            </select>
          </label>
          <NotificationBell role="player" />
          <button
            className="avatar"
            onClick={() => setPage("profile")}
            aria-label="Open profile"
          >
            {initials(profile.name)}
          </button>
        </div>
      </header>
      <nav className="primary-nav" aria-label="Primary navigation">
        <button className="brand rail-brand" onClick={() => setPage("home")}>
          <BrandLogo className="brand-mark" />
          <span>ComeBack</span>
        </button>
        <div
          className="nav-items"
          style={{ "--active": activeIndex } as React.CSSProperties}
        >
          <span className="nav-indicator" aria-hidden="true" />
          {NAV_ITEMS.map(({ page: target, key, icon: Icon }) => (
            <button
              key={target}
              className={activeNav === target ? "active" : ""}
              aria-current={activeNav === target ? "page" : undefined}
              onClick={() => setPage(target)}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{t[key]}</span>
            </button>
          ))}
        </div>
        <div className="rail-footer">
          <div className="rail-clinician">
            <span className="rail-clinician-icon">
              <Stethoscope size={16} />
            </span>
            <p>
              <small>{t.linkedClinician}</small>
              <strong>{profile.clinicianName}</strong>
            </p>
          </div>
          <p className="rail-note">
            <LockKeyhole size={13} /> Video never leaves this device
          </p>
        </div>
      </nav>
      <main className="app-main" id="main-content" aria-live="polite">
        {children}
      </main>
    </div>
  );
}

export function PlayerApp({
  session,
  onLogout,
}: {
  session: AuthSession;
  onLogout: () => void;
}) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [page, setPageState] = useState<Page>("home");
  const [metrics, setMetrics] = useState<CameraMetrics>(emptyMetrics);
  const [testKind, setTestKind] = useState<TestKind>("squat");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [history, setHistory] = useState<TestRecord[]>([]);
  const [online, setOnline] = useState(true);
  const [sync, setSync] = useState<SyncSummary>({
    mode: "render",
    synced: 0,
    pending: 0,
  });
  const latest = history[0] ?? null;

  const setPage = useCallback((next: Page) => {
    const apply = () => {
      setPageState(next);
      window.scrollTo({ top: 0 });
      if (next === "home") window.dispatchEvent(new Event("comeback-refresh"));
    };
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };
    if (doc.startViewTransition && !reduce) {
      doc.startViewTransition(() => flushSync(apply));
    } else {
      apply();
    }
  }, []);

  const load = useCallback(async () => {
    let nextProfile = await getValue<PlayerProfile>(
      "profiles",
      session.user.id,
    );
    try {
      const remote = await getRemoteProfile(session.user.id);
      nextProfile = remote;
      await putValue("profiles", remote);
    } catch {
      // A previously synced profile keeps the player journey available offline.
    }
    setProfile(nextProfile ?? null);
    if (nextProfile) {
      setHistory(
        (await getAllValues<TestRecord>("tests"))
          .filter((record) => record.playerId === nextProfile.id)
          .sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
      );
    }
    setLoaded(true);
  }, [session.user.id]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void load();
      setOnline(navigator.onLine);
      if (navigator.onLine) void flushSyncQueue().then(setSync);
    }, 0);
    const updateNetwork = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void flushSyncQueue().then(setSync);
    };
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, [load]);

  useEffect(() => {
    if (!profile) return;
    document.documentElement.lang = profile.language;
    document.documentElement.dir = profile.language === "ur" ? "rtl" : "ltr";
    return () => {
      document.documentElement.dir = "ltr";
    };
  }, [profile]);

  useEffect(() => {
    if (!profile || !API_URL) return;
    const refresh = () => {
      void pullRemoteProfile(profile).then((remote) => {
        // Compare the fields that matter, not only the timestamp, so a stage
        // decision is never missed if a timestamp happens to match.
        if (
          remote &&
          (remote.updatedAt !== profile.updatedAt ||
            remote.stage !== profile.stage ||
            remote.stageStatus !== profile.stageStatus)
        ) {
          setProfile(remote);
          void putValue("profiles", remote);
        }
      });
    };
    // Browsers throttle timers in background tabs, so also refresh the moment
    // the player comes back to the app or returns to Today.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const poll = window.setInterval(refresh, 5_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("comeback-refresh", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("comeback-refresh", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [profile]);

  const captureMetrics = useCallback((kind: TestKind, next: CameraMetrics) => {
    setTestKind(kind);
    setMetrics(next);
  }, []);

  const startCheckIn = () => {
    // Every check-in starts clean so earlier symptoms or counts never carry over.
    setSymptoms([]);
    setMetrics(emptyMetrics);
    setTestKind("squat");
    setPage("setup");
  };

  const completeCheckIn = () => {
    if (!profile) return;
    const record: TestRecord = {
      id: `test-${crypto.randomUUID()}`,
      playerId: profile.id,
      kind: testKind,
      side: "left",
      metrics: {
        count: metrics.count,
        holdSeconds: metrics.holdSeconds,
        kneeAngle: metrics.kneeAngle,
        squatDepth: metrics.squatDepth,
        fppa: metrics.fppa,
        asymmetry: metrics.asymmetry,
      },
      symptoms,
      completedAt: new Date().toISOString(),
      syncStatus: "local-demo",
    };
    const nextProfile = {
      ...profile,
      stageStatus: symptoms.length
        ? ("held" as const)
        : ("awaiting-review" as const),
      updatedAt: new Date().toISOString(),
    };
    setProfile(nextProfile);
    setHistory((current) => [record, ...current]);
    setPage("result");
    void (async () => {
      try {
        await saveWithQueue("test", "tests", record);
        await putValue("profiles", nextProfile);
        setSync(await flushSyncQueue());
      } catch {
        setSync({ mode: "offline", synced: 0, pending: 1 });
      }
    })();
  };

  if (!loaded)
    return (
      <main className="loading-screen">
        <BrandLogo className="loading-logo" />
        <strong>Opening your private journey</strong>
      </main>
    );
  if (!profile)
    return (
      <main className="loading-screen">
        <BrandLogo className="loading-logo" />
        <h1>Your profile could not load</h1>
        <p>Reconnect to the internet and retry. Your account is still safe.</p>
        <button className="primary-button" onClick={() => location.reload()}>
          Retry
        </button>
        <button className="text-button" onClick={onLogout}>
          Sign out
        </button>
      </main>
    );

  const t = UI_COPY[profile.language];
  const changeLanguage = async (language: Language) => {
    const next = { ...profile, language, updatedAt: new Date().toISOString() };
    await saveWithQueue("profile", "profiles", next);
    setSync(await flushSyncQueue());
    setProfile(next);
  };

  return (
    <Shell
      profile={profile}
      page={page}
      setPage={setPage}
      onLanguage={changeLanguage}
    >
      {page === "home" && (
        <Today
          profile={profile}
          history={history}
          online={online}
          sync={sync}
          onStart={startCheckIn}
          onMessage={() => setPage("support")}
          onJourney={() => setPage("journey")}
        />
      )}
      {page === "journey" && <Journey profile={profile} />}
      {page === "setup" && (
        <Setup
          t={t}
          onBack={() => setPage("home")}
          onNext={() => setPage("test")}
        />
      )}
      {page === "test" && (
        <Test
          t={t}
          onBack={() => setPage("setup")}
          onNext={() => setPage("symptoms")}
          onMetrics={captureMetrics}
        />
      )}
      {page === "symptoms" && (
        <Symptoms
          t={t}
          values={symptoms}
          onChange={setSymptoms}
          onBack={() => setPage("test")}
          onNext={completeCheckIn}
        />
      )}
      {page === "result" && (
        <Result
          t={t}
          profile={profile}
          record={latest}
          onHome={() => setPage("home")}
          onMessage={() => setPage("support")}
        />
      )}
      {page === "support" && <Support profile={profile} />}
      {page === "profile" && (
        <Profile
          profile={profile}
          email={session.user.email}
          checkIns={history.length}
          onLogout={onLogout}
          onReset={async () => {
            await clearLocalData();
            onLogout();
          }}
        />
      )}
    </Shell>
  );
}

function Today({
  profile,
  history,
  online,
  sync,
  onStart,
  onMessage,
  onJourney,
}: {
  profile: PlayerProfile;
  history: TestRecord[];
  online: boolean;
  sync: SyncSummary;
  onStart: () => void;
  onMessage: () => void;
  onJourney: () => void;
}) {
  const stageIndex = STAGES.indexOf(profile.stage);
  const stageInfo = guideline.stages[stageIndex];
  const next = STAGES[stageIndex + 1];
  const latest = history[0] ?? null;
  const t = UI_COPY[profile.language];
  const [explanation, setExplanation] = useState<StageExplanation | null>(null);
  const [question, setQuestion] = useState("");
  const [explaining, setExplaining] = useState(false);
  const explain = async () => {
    setExplaining(true);
    try {
      if (!API_URL) {
        setExplanation(
          groundedFallback(profile.stage, profile.language, question),
        );
        return;
      }
      setExplanation(
        await explainStage(profile.stage, profile.language, question),
      );
    } catch {
      setExplanation(
        groundedFallback(profile.stage, profile.language, question),
      );
    } finally {
      setExplaining(false);
    }
  };
  const statusLabel =
    profile.stageStatus === "awaiting-review"
      ? t.awaitingReview
      : profile.stageStatus === "held"
        ? t.onHold
        : t.inProgress;
  const weeks = weeksSince(profile.deliveryDate);
  return (
    <div className="page today-page">
      <header className="greeting">
        <div>
          <p className="greeting-date">
            <CalendarDays size={14} /> {todayLabel(profile.language)}
          </p>
          <h1>
            {t.welcomeBack}, {profile.name}
          </h1>
          <p className="greeting-copy">{t.homeIntro}</p>
        </div>
        <div className="status-chips">
          <span className={`chip ${online ? "chip-success" : "chip-neutral"}`}>
            {online ? <Wifi size={13} /> : <CloudOff size={13} />}
            {online ? t.online : t.offlineReady}
          </span>
          <span className="chip chip-neutral">
            {sync.mode === "render"
              ? t.synced
              : `${sync.pending} awaiting sync`}
          </span>
        </div>
      </header>

      <div className="today-grid">
        <div className="today-main">
          <section className="stage-card" aria-label={t.currentStage}>
            <SeamMotif className="stage-seam" />
            <div className="stage-ring">
              <ReturnRing
                current={stageIndex}
                label={fill(t.stageOf, {
                  n: stageIndex + 1,
                  total: STAGES.length,
                })}
              />
              <span className="ring-center" aria-hidden="true">
                <strong>{stageIndex + 1}</strong>
                <small>/ {STAGES.length}</small>
              </span>
            </div>
            <div className="stage-copy">
              <div className="stage-chips">
                <span className="stage-pill">{t.currentStage}</span>
                <span className={`stage-status ${profile.stageStatus}`}>
                  {statusLabel}
                </span>
              </div>
              <h2>{profile.stage}</h2>
              <p className="stage-purpose">{stageInfo?.purpose}</p>
              <p className="stage-meta">
                <span>{stageInfo?.timing}</span>
                <span aria-hidden="true" className="dot" />
                <span>ICC guideline, page {stageInfo?.reference.pdfPage}</span>
              </p>
              <button className="stage-link" onClick={onJourney}>
                {next ? fill(t.nextLabel, { stage: next }) : t.journey}
                <ChevronRight size={16} />
              </button>
            </div>
          </section>

          <div className="stat-row">
            <div className="stat-tile">
              <span className="stat-icon tone-accent">
                <Baby size={18} />
              </span>
              <strong>
                <CountUp value={weeks} />
              </strong>
              <small>
                {fill(t.weeksSinceBirth, { n: "" }).replace(/\s+/g, " ").trim()}
              </small>
            </div>
            <div className="stat-tile">
              <span className="stat-icon tone-primary">
                <ClipboardCheck size={18} />
              </span>
              <strong>
                <CountUp value={history.length} />
              </strong>
              <small>{t.checkInsSaved}</small>
            </div>
            <div className="stat-tile">
              <span className="stat-icon tone-success">
                <Route size={18} />
              </span>
              <strong>
                <CountUp value={stageIndex + 1} />
                <span className="stat-of">/{STAGES.length}</span>
              </strong>
              <small>{t.iccStages}</small>
            </div>
          </div>

          <section className="panel recent-panel">
            <div className="panel-head">
              <h2>Recent check-ins</h2>
              <span className="panel-count">{history.length}</span>
            </div>
            {history.length === 0 ? (
              <p className="panel-empty">
                No check-ins yet. Your first one takes about two minutes and
                goes straight to {profile.clinicianName}.
              </p>
            ) : (
              <ul className="recent-list">
                {history.slice(0, 4).map((record) => {
                  const Icon = TEST_ICONS[record.kind];
                  const flagged = record.symptoms.length > 0;
                  return (
                    <li key={record.id}>
                      <span className="recent-icon">
                        <Icon size={20} />
                      </span>
                      <p>
                        <strong>{TEST_LABELS[record.kind]}</strong>
                        <small>
                          {shortDate(record.completedAt)},{" "}
                          {record.kind === "balance"
                            ? `${record.metrics.holdSeconds.toFixed(1)}s hold`
                            : `${record.metrics.count} reps observed`}
                        </small>
                      </p>
                      <span
                        className={`chip ${flagged ? "chip-danger" : "chip-success"}`}
                      >
                        {flagged
                          ? `${record.symptoms.length} symptom${record.symptoms.length > 1 ? "s" : ""}`
                          : "Clear"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="today-side">
          <section className="next-step">
            <h2 className="side-title">{t.nextStep}</h2>
            <button className="task-card" onClick={onStart}>
              <span className="task-top">
                <span className="task-icon">
                  <Camera size={22} />
                </span>
                <span className="task-time">
                  <Clock3 size={13} /> {t.aboutTwoMin}
                </span>
              </span>
              <strong>{t.cameraCheck}</strong>
              <small>
                {profile.stageStatus === "awaiting-review"
                  ? `${t.awaitingReview}. You can still add another check-in.`
                  : latest
                    ? `Last saved ${shortDate(latest.completedAt)}`
                    : t.cameraDescription}
              </small>
              <span className="task-cta">
                {t.start} <ArrowRight size={16} />
              </span>
            </button>
          </section>

          <section className="panel ai-guide">
            <div className="ai-head">
              <span className="ai-icon">
                <Sparkles size={16} />
              </span>
              <div>
                <strong>ComeBack Guide</strong>
                <small>{t.aiBoundary}</small>
              </div>
            </div>
            <button
              className="soft-button"
              onClick={explain}
              disabled={explaining}
            >
              {explaining ? t.loadingExplanation : t.explainStage}
            </button>
            {explanation && (
              <div className="ai-answer" role="status">
                <p>{explanation.summary}</p>
                <p>{explanation.nextStep}</p>
                <small>{explanation.citations[0]}</small>
                <strong>
                  <ShieldCheck size={14} /> {explanation.safetyNote}
                </strong>
              </div>
            )}
            <form
              className="ai-question"
              onSubmit={(event) => {
                event.preventDefault();
                void explain();
              }}
            >
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={t.askPlaceholder}
                aria-label={t.askPlaceholder}
                maxLength={300}
              />
              <button type="submit" disabled={explaining}>
                {t.ask}
              </button>
            </form>
          </section>

          <section className="panel clinician-card">
            <span className="clinician-avatar">
              <Stethoscope size={20} />
            </span>
            <div>
              <small>{t.linkedClinician}</small>
              <strong>{profile.clinicianName}</strong>
              <span className="connected">
                <i /> {t.connected}
              </span>
            </div>
            <button onClick={onMessage} aria-label="Message linked clinician">
              <MessageCircleMore size={18} />
            </button>
          </section>

          <p className="fine-print">
            <ShieldCheck size={14} /> ComeBack supports your care team. It does
            not provide medical clearance.
          </p>
        </div>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}

function FlowHeader({
  t,
  title,
  subtitle,
  step,
  onBack,
}: {
  t: UiStrings;
  title: string;
  subtitle: string;
  step: 1 | 2 | 3;
  onBack: () => void;
}) {
  return (
    <header className="flow-header">
      <div className="flow-bar">
        <button className="back-button" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div
          className="flow-steps"
          role="progressbar"
          aria-label="Check-in progress"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
        >
          {[1, 2, 3].map((value) => (
            <span key={value} className={value <= step ? "on" : ""} />
          ))}
        </div>
        <span className="flow-count">{fill(t.stepOf, { n: step })}</span>
      </div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </header>
  );
}

function Journey({ profile }: { profile: PlayerProfile }) {
  const stageIndex = STAGES.indexOf(profile.stage);
  return (
    <div className="page">
      <PageHeader
        title="Your 6 Rs roadmap"
        subtitle="The ICC's six stages of return to play, with timing and guidance for where you are now."
      />
      <div className="journey-grid">
        <ol className="timeline">
          {guideline.stages.map((stage, index) => {
            const state =
              index < stageIndex
                ? "done"
                : index === stageIndex
                  ? "current"
                  : "next";
            return (
              <li
                className={`timeline-item ${state}`}
                key={stage.id}
                style={{ "--i": index } as React.CSSProperties}
              >
                <span className="timeline-marker" aria-hidden="true">
                  {state === "done" ? (
                    <Check size={15} strokeWidth={3} />
                  ) : (
                    stage.order
                  )}
                </span>
                <div className="timeline-body">
                  <div className="timeline-heading">
                    <h3>{stage.label}</h3>
                    {state === "current" && (
                      <span className="chip chip-accent">You are here</span>
                    )}
                    <span className="timeline-timing">{stage.timing}</span>
                  </div>
                  <p>{stage.purpose}</p>
                  {state === "current" && (
                    <ul>
                      {stage.guidance.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {stage.id === "recondition" && (
                    <div className="cricket-focus">
                      <strong>
                        Your cricket focus as a {profile.role.replace("-", " ")}
                      </strong>
                      <p>{CRICKET_FOCUS[profile.role]}</p>
                    </div>
                  )}
                  <small>
                    ICC guideline, page {stage.reference.pdfPage},{" "}
                    {stage.reference.section}
                  </small>
                </div>
              </li>
            );
          })}
        </ol>
        <aside className="journey-side">
          <section className="panel">
            <h2 className="side-title">How a stage advances</h2>
            <ol className="rule-list">
              {PROGRESSION_RULES.map((rule) => (
                <li key={rule}>
                  <Check size={14} strokeWidth={3} /> {rule}
                </li>
              ))}
            </ol>
            <p className="panel-note">
              All four must be true. Camera observations and the AI guide never
              advance a stage on their own.
            </p>
          </section>
          <section className="panel source-panel">
            <h2 className="side-title">About this framework</h2>
            <p>
              The 6 Rs come from the ICC Return to Play Post-Pregnancy
              Guidelines, published 22 June 2026 and led by the ICC Medical
              Advisory Committee.
            </p>
            <a
              href={guideline.document.sourcePageUrl}
              target="_blank"
              rel="noreferrer"
            >
              Read the ICC release
            </a>
          </section>
        </aside>
      </div>
      <p className="fine-print">
        <ShieldCheck size={14} /> The ICC framework guides care-team
        conversations. It is not an automated clearance protocol.
      </p>
    </div>
  );
}

function Setup({
  t,
  onBack,
  onNext,
}: {
  t: UiStrings;
  onBack: () => void;
  onNext: () => void;
}) {
  const steps = [
    {
      title: "Show your whole body",
      body: "Use the front view unless the bridge asks for a side view.",
    },
    {
      title: "Secure your phone",
      body: "Prop it up around hip height, about 2 metres away.",
    },
    {
      title: "Clear the floor",
      body: "Stop if you feel pain, heaviness, leaking or any concern.",
    },
  ];
  return (
    <div className="page flow-page">
      <FlowHeader
        t={t}
        title={t.setupTitle}
        subtitle={t.setupSubtitle}
        step={1}
        onBack={onBack}
      />
      <div className="setup-grid">
        <div className="placement-card">
          <PlacementDiagram className="placement-diagram" />
        </div>
        <div className="setup-side">
          <ol className="instruction-list">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span>{index + 1}</span>
                <p>
                  <strong>{step.title}</strong>
                  <small>{step.body}</small>
                </p>
              </li>
            ))}
          </ol>
          <button className="primary-button" onClick={onNext}>
            <Camera size={18} /> {t.openCamera}
          </button>
          <p className="fine-print">
            <LockKeyhole size={14} /> Video is processed on this device and is
            never saved or uploaded.
          </p>
        </div>
      </div>
    </div>
  );
}

function Test({
  t,
  onBack,
  onNext,
  onMetrics,
}: {
  t: UiStrings;
  onBack: () => void;
  onNext: () => void;
  onMetrics: (kind: TestKind, metrics: CameraMetrics) => void;
}) {
  return (
    <div className="page flow-page">
      <FlowHeader
        t={t}
        title={t.movementTitle}
        subtitle={t.movementSubtitle}
        step={2}
        onBack={onBack}
      />
      <PoseCamera
        onMetrics={onMetrics}
        action={
          <button className="primary-button" onClick={onNext}>
            {t.continueSymptoms} <ArrowRight size={18} />
          </button>
        }
      />
    </div>
  );
}

function Symptoms({
  t,
  values,
  onChange,
  onBack,
  onNext,
}: {
  t: UiStrings;
  values: string[];
  onChange: (values: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const toggle = (code: string) =>
    onChange(
      values.includes(code)
        ? values.filter((value) => value !== code)
        : [...values, code],
    );
  return (
    <div className="page flow-page narrow">
      <FlowHeader
        t={t}
        title={t.symptomsTitle}
        subtitle={t.symptomsSubtitle}
        step={3}
        onBack={onBack}
      />
      <fieldset className="symptom-fieldset">
        <legend>{t.symptomsPrompt}</legend>
        <div className="symptom-grid">
          {symptomOptions.map((symptom) => (
            <label
              className={values.includes(symptom.code) ? "checked" : ""}
              key={symptom.code}
            >
              <input
                type="checkbox"
                checked={values.includes(symptom.code)}
                onChange={() => toggle(symptom.code)}
              />
              <span className="check-box" aria-hidden="true">
                <Check size={13} strokeWidth={3.2} />
              </span>
              <span>{symptom.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {values.length > 0 && (
        <div className="red-flag-note" role="alert">
          <Pause size={18} />
          <p>
            <strong>Pause this stage and contact your care team.</strong>
            <span>Your answers will be highlighted for clinician review.</span>
          </p>
        </div>
      )}
      <div className="flow-actions">
        <button
          className={`primary-button ${values.length ? "primary-alert" : ""}`}
          onClick={onNext}
        >
          {values.length ? t.saveReview : t.saveClear}
        </button>
        <p className="fine-print">
          <ShieldCheck size={14} /> Symptom screen from Goom, Donnelly and
          Brockwell 2019, pages 10, 13 and 14 (expert consensus).
        </p>
      </div>
    </div>
  );
}

function Result({
  t,
  profile,
  record,
  onHome,
  onMessage,
}: {
  t: UiStrings;
  profile: PlayerProfile;
  record: TestRecord | null;
  onHome: () => void;
  onMessage: () => void;
}) {
  const clear = !record?.symptoms.length;
  return (
    <div className="page flow-page narrow result-page">
      <div className={`result-mark ${clear ? "" : "hold"}`} aria-hidden="true">
        <svg viewBox="0 0 52 52">
          <circle className="result-circle" cx="26" cy="26" r="24" />
          {clear ? (
            <path className="result-check" d="M15 27l7 7 15-16" />
          ) : (
            <path className="result-check" d="M21 17v18M31 17v18" />
          )}
        </svg>
      </div>
      <p className="eyebrow-text">{t.saved}</p>
      <h2>{clear ? `${t.thanks}, ${profile.name}` : "Pause and check in"}</h2>
      <p className="result-copy">
        {clear
          ? "Your movement observations and symptom-free check-in are ready for clinician review."
          : "Your reported symptoms have placed this stage on hold for clinician review."}
      </p>
      <dl className="result-stats">
        <div>
          <dt>Test</dt>
          <dd>{record ? TEST_LABELS[record.kind] : "None"}</dd>
        </div>
        <div>
          <dt>
            {record?.kind === "balance" ? "Observed hold" : "Observed reps"}
          </dt>
          <dd>
            {record?.kind === "balance"
              ? `${record.metrics.holdSeconds.toFixed(1)}s`
              : (record?.metrics.count ?? 0)}
          </dd>
        </div>
        <div>
          <dt>Symptoms</dt>
          <dd>{record?.symptoms.length ?? 0}</dd>
        </div>
      </dl>
      <div className={`approval-card ${clear ? "" : "hold"}`}>
        <Stethoscope size={20} />
        <div>
          <strong>
            {clear ? t.awaitingReview : "Review requested with symptom alert"}
          </strong>
          <p>
            Sent to {profile.clinicianName}. {t.stageNotAdvanced}
          </p>
        </div>
      </div>
      <div className="result-actions">
        <button className="primary-button" onClick={onHome}>
          {t.backToday}
        </button>
        <button className="secondary-button" onClick={onMessage}>
          <MessageCircleMore size={18} /> Message {profile.clinicianName}
        </button>
      </div>
    </div>
  );
}

function Support({ profile }: { profile: PlayerProfile }) {
  return (
    <div className="page">
      <PageHeader
        title="Your support circle"
        subtitle="Message your clinician and know who to contact, and when."
      />
      <div className="support-grid">
        <CareChat
          role="player"
          playerId={profile.id}
          title={profile.clinicianName}
        />
        <aside className="support-side">
          <section className="panel support-hero">
            <span className="support-icon">
              <HeartHandshake size={22} />
            </span>
            <h2>You do not have to navigate this alone.</h2>
            <p>
              ComeBack keeps your observations organised for conversations with
              qualified care professionals.
            </p>
          </section>
          <ul className="support-list">
            <li>
              <span className="tone-success">
                <Stethoscope size={18} />
              </span>
              <p>
                <small>Linked clinician, ICC verified</small>
                <strong>{profile.clinicianName}</strong>
              </p>
            </li>
            <li>
              <span className="tone-danger">
                <Pause size={18} />
              </span>
              <p>
                <small>If symptoms appear</small>
                <strong>Pause and contact your care team</strong>
              </p>
            </li>
          </ul>
          <p className="fine-print">
            For urgent or severe symptoms, use local emergency care rather than
            this app.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Profile({
  profile,
  email,
  checkIns,
  onLogout,
  onReset,
}: {
  profile: PlayerProfile;
  email: string;
  checkIns: number;
  onLogout: () => void;
  onReset: () => void;
}) {
  const languageNames = {
    en: "English",
    bn: "Bengali",
    hi: "Hindi",
    ur: "Urdu",
  } as const;
  return (
    <div className="page">
      <PageHeader
        title="Your profile"
        subtitle="The details used to personalise your journey."
      />
      <div className="profile-grid">
        <section className="profile-card">
          <div className="profile-head">
            <SeamMotif className="profile-seam" />
            <div className="profile-avatar">{initials(profile.name)}</div>
            <div>
              <h2>{profile.name}</h2>
              <span className="capitalize">
                {profile.role.replace("-", " ")}
              </span>
            </div>
          </div>
          <dl className="profile-stats">
            <div>
              <dt>Stage</dt>
              <dd>{profile.stage}</dd>
            </div>
            <div>
              <dt>Weeks</dt>
              <dd>{weeksSince(profile.deliveryDate)}</dd>
            </div>
            <div>
              <dt>Check-ins</dt>
              <dd>{checkIns}</dd>
            </div>
          </dl>
        </section>
        <section className="panel details-panel">
          <h2 className="side-title">Details</h2>
          <dl className="details-list">
            <div>
              <dt>Email</dt>
              <dd>{email}</dd>
            </div>
            <div>
              <dt>Delivery date</dt>
              <dd>
                {new Date(
                  `${profile.deliveryDate}T00:00:00`,
                ).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt>Delivery type</dt>
              <dd className="capitalize">{profile.deliveryType}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{languageNames[profile.language]}</dd>
            </div>
            <div>
              <dt>Clinician</dt>
              <dd>{profile.clinicianName}</dd>
            </div>
          </dl>
        </section>
        <section className="privacy-card">
          <LockKeyhole size={18} />
          <div>
            <strong>Local-first privacy</strong>
            <p>
              Camera frames stay in memory only. Your profile and movement
              observations are stored on this device and synced only with your
              consent.
            </p>
            <Link href="/privacy">Read privacy and consent details</Link>
          </div>
        </section>
        <div className="profile-actions">
          <button className="secondary-button" onClick={onLogout}>
            <LogOut size={17} /> Sign out
          </button>
          <button className="danger-text-button" onClick={onReset}>
            Erase data on this device
          </button>
        </div>
      </div>
    </div>
  );
}
