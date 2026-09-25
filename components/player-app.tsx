"use client";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  CloudOff,
  HeartHandshake,
  Home,
  LockKeyhole,
  LogOut,
  MessageCircleMore,
  Pause,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { CareChat, NotificationBell } from "@/components/care-comms";
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

function weeksSince(date: string) {
  const elapsed = Date.now() - new Date(`${date}T00:00:00`).getTime();
  return Math.max(0, Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)));
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

const NAV_ITEMS: { page: Page; key: UiKey; icon: typeof Home }[] = [
  { page: "home", key: "today", icon: Home },
  { page: "journey", key: "journey", icon: Target },
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
        <div className="nav-items">
          {NAV_ITEMS.map(({ page: target, key, icon: Icon }) => (
            <button
              key={target}
              className={activeNav === target ? "active" : ""}
              aria-current={activeNav === target ? "page" : undefined}
              onClick={() => setPage(target)}
            >
              <Icon size={21} />
              <span>{t[key]}</span>
            </button>
          ))}
        </div>
        <figure className="rail-quote">
          <blockquote>
            No player should have to choose between motherhood and representing
            her country.
          </blockquote>
          <figcaption>
            Jay Shah, ICC Chairman.{" "}
            <a
              href={guideline.document.sourcePageUrl}
              target="_blank"
              rel="noreferrer"
            >
              ICC release, 22 June 2026
            </a>
          </figcaption>
        </figure>
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
  const [latest, setLatest] = useState<TestRecord | null>(null);
  const [online, setOnline] = useState(true);
  const [sync, setSync] = useState<SyncSummary>({
    mode: "render",
    synced: 0,
    pending: 0,
  });

  const setPage = useCallback((next: Page) => {
    setPageState(next);
    window.scrollTo({ top: 0 });
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
      const records = await getAllValues<TestRecord>("tests");
      setLatest(
        records
          .filter((record) => record.playerId === nextProfile.id)
          .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] ??
          null,
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
    const poll = window.setInterval(() => {
      void pullRemoteProfile(profile).then((remote) => {
        if (remote && remote.updatedAt !== profile.updatedAt) {
          setProfile(remote);
          void putValue("profiles", remote);
        }
      });
    }, 5_000);
    return () => window.clearInterval(poll);
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
    setLatest(record);
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
          latest={latest}
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

function ReturnArc({ stageIndex }: { stageIndex: number }) {
  const center = { x: 160, y: 160 };
  const radius = 132;
  const progress = (stageIndex / (STAGES.length - 1)) * 100;
  return (
    <svg
      className="return-arc"
      viewBox="0 0 320 176"
      role="img"
      aria-label={`Stage ${stageIndex + 1} of ${STAGES.length}: ${STAGES[stageIndex]}`}
    >
      <path
        className="arc-track"
        d="M28 160 A132 132 0 0 1 292 160"
        pathLength={100}
      />
      <path
        className="arc-progress"
        d="M28 160 A132 132 0 0 1 292 160"
        pathLength={100}
        strokeDasharray={`${progress} 100`}
      />
      {STAGES.map((stage, index) => {
        const angle = Math.PI - (index / (STAGES.length - 1)) * Math.PI;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y - radius * Math.sin(angle);
        const state =
          index < stageIndex
            ? "done"
            : index === stageIndex
              ? "current"
              : "next";
        return (
          <g key={stage} className={`arc-node ${state}`}>
            {state === "current" && (
              <circle cx={x} cy={y} r={15} className="arc-halo" />
            )}
            <circle cx={x} cy={y} r={state === "current" ? 9 : 6.5} />
          </g>
        );
      })}
    </svg>
  );
}

function Today({
  profile,
  latest,
  online,
  sync,
  onStart,
  onMessage,
  onJourney,
}: {
  profile: PlayerProfile;
  latest: TestRecord | null;
  online: boolean;
  sync: SyncSummary;
  onStart: () => void;
  onMessage: () => void;
  onJourney: () => void;
}) {
  const stageIndex = STAGES.indexOf(profile.stage);
  const stageInfo = guideline.stages[stageIndex];
  const next = STAGES[stageIndex + 1];
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
  return (
    <div className="page today-page">
      <header className="page-intro">
        <div>
          <p className="intro-label">{t.returnPlan}</p>
          <h1>
            {t.welcomeBack}, {profile.name}
          </h1>
          <p className="intro-copy">{t.homeIntro}</p>
        </div>
        <div className="status-chips">
          <span className={`chip ${online ? "chip-good" : "chip-quiet"}`}>
            {online ? <Wifi size={14} /> : <CloudOff size={14} />}
            {online ? t.online : t.offlineReady}
          </span>
          <span className="chip chip-quiet">
            {sync.mode === "render"
              ? t.synced
              : `${sync.pending} awaiting sync`}
          </span>
          <span className="chip chip-petal">
            {fill(t.weeksSinceBirth, { n: weeksSince(profile.deliveryDate) })}
          </span>
        </div>
      </header>

      <div className="today-grid">
        <div className="today-main">
          <section className="stage-card" aria-label={t.currentStage}>
            <div className="stage-card-top">
              <span className="stage-kicker">{t.currentStage}</span>
              <span className={`stage-status ${profile.stageStatus}`}>
                {statusLabel}
              </span>
            </div>
            <div className="arc-wrap">
              <ReturnArc stageIndex={stageIndex} />
              <div className="arc-label">
                <span>
                  {fill(t.stageOf, {
                    n: stageIndex + 1,
                    total: STAGES.length,
                  })}
                </span>
                <h2>{profile.stage}</h2>
              </div>
            </div>
            <p className="stage-purpose">{stageInfo?.purpose}</p>
            <div className="stage-card-foot">
              <p>
                <ShieldCheck size={16} /> {t.stageGate}
              </p>
              <button className="ghost-link" onClick={onJourney}>
                {next ? fill(t.nextLabel, { stage: next }) : t.journey}
                <ChevronRight size={16} />
              </button>
            </div>
          </section>

          <section className="next-step">
            <div className="section-head">
              <h2>{t.nextStep}</h2>
              <span>{t.aboutTwoMin}</span>
            </div>
            <button className="task-card" onClick={onStart}>
              <span className="task-icon">
                <Camera size={24} />
              </span>
              <span className="task-copy">
                <strong>{t.cameraCheck}</strong>
                <small>
                  {profile.stageStatus === "awaiting-review"
                    ? `${t.awaitingReview}. You can still add another check-in.`
                    : latest
                      ? `Last saved ${new Date(latest.completedAt).toLocaleDateString()}`
                      : t.cameraDescription}
                </small>
              </span>
              <span className="round-arrow" aria-hidden="true">
                <ArrowRight size={20} />
              </span>
            </button>
          </section>
        </div>

        <div className="today-side">
          <section className="ai-guide">
            <div className="ai-guide-heading">
              <span className="ai-icon">
                <Sparkles size={18} />
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

          <section className="clinician-card">
            <span className="clinician-avatar">
              <Stethoscope size={22} />
            </span>
            <div>
              <small>{t.linkedClinician}</small>
              <strong>{profile.clinicianName}</strong>
              <span className="connected">
                <i /> {t.connected}
              </span>
            </div>
            <button onClick={onMessage} aria-label="Message linked clinician">
              <MessageCircleMore size={19} />
            </button>
          </section>

          <p className="fine-print">
            <ShieldCheck size={15} /> ComeBack supports your care team. It does
            not provide medical clearance.
          </p>
        </div>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="page-intro page-intro-simple">
      <div>
        <h1>{title}</h1>
        <p className="intro-copy">{subtitle}</p>
      </div>
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
          <ArrowLeft size={20} />
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
      <ol className="timeline">
        {guideline.stages.map((stage, index) => {
          const state =
            index < stageIndex
              ? "done"
              : index === stageIndex
                ? "current"
                : "next";
          return (
            <li className={`timeline-item ${state}`} key={stage.id}>
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
                    <span className="chip chip-petal">You are here</span>
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
      <p className="fine-print">
        <ShieldCheck size={16} /> The ICC framework guides care-team
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
        <div className="guide-frame" aria-hidden="true">
          <svg viewBox="0 0 200 260" className="guide-figure">
            <circle cx="100" cy="52" r="17" />
            <path d="M100 72 L100 150 M100 88 L70 124 M100 88 L130 124 M100 150 L82 222 M100 150 L118 222" />
          </svg>
          <span className="frame-corner tl" />
          <span className="frame-corner tr" />
          <span className="frame-corner bl" />
          <span className="frame-corner br" />
          <span className="distance-line">about 2 metres from the phone</span>
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
            <Camera size={19} /> {t.openCamera}
          </button>
          <p className="fine-print">
            <LockKeyhole size={15} /> Video is processed on this device and is
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
            {t.continueSymptoms} <ArrowRight size={19} />
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
                <Check size={14} strokeWidth={3} />
              </span>
              <span>{symptom.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {values.length > 0 && (
        <div className="red-flag-note" role="alert">
          <Pause size={20} />
          <p>
            <strong>Pause this stage and contact your care team.</strong>
            <span>Your answers will be highlighted for clinician review.</span>
          </p>
        </div>
      )}
      <button
        className={`primary-button ${values.length ? "primary-alert" : ""}`}
        onClick={onNext}
      >
        {values.length ? t.saveReview : t.saveClear}
      </button>
      <p className="fine-print">
        <ShieldCheck size={15} /> Symptom screen from Goom, Donnelly and
        Brockwell 2019, pages 10, 13 and 14 (expert consensus).
      </p>
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
      <div className={`result-orb ${clear ? "" : "hold"}`} aria-hidden="true">
        {clear ? <Check size={36} strokeWidth={2.6} /> : <Pause size={34} />}
      </div>
      <p className="intro-label">{t.saved}</p>
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
        <Stethoscope size={22} />
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
          <section className="support-hero">
            <HeartHandshake size={28} />
            <h2>You do not have to navigate this alone.</h2>
            <p>
              ComeBack keeps your observations organised for conversations with
              qualified care professionals.
            </p>
          </section>
          <ul className="support-list">
            <li>
              <span>
                <Stethoscope size={19} />
              </span>
              <p>
                <small>Linked clinician, ICC verified</small>
                <strong>{profile.clinicianName}</strong>
              </p>
            </li>
            <li>
              <span>
                <Pause size={19} />
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
  onLogout,
  onReset,
}: {
  profile: PlayerProfile;
  email: string;
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
    <div className="page narrow">
      <PageHeader
        title="Your profile"
        subtitle="The details used to personalise your journey."
      />
      <section className="profile-card">
        <div className="profile-head">
          <div className="profile-avatar">{initials(profile.name)}</div>
          <div>
            <h2>{profile.name}</h2>
            <span className="capitalize">{profile.role.replace("-", " ")}</span>
          </div>
        </div>
        <dl>
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
            <dt>Current stage</dt>
            <dd>{profile.stage}</dd>
          </div>
          <div>
            <dt>Clinician</dt>
            <dd>{profile.clinicianName}</dd>
          </div>
        </dl>
      </section>
      <section className="privacy-card">
        <LockKeyhole size={20} />
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
          <LogOut size={18} /> Sign out
        </button>
        <button className="danger-text-button" onClick={onReset}>
          Erase data on this device
        </button>
      </div>
    </div>
  );
}
