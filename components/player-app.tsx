"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  CloudOff,
  HeartHandshake,
  Home,
  LockKeyhole,
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
import guideline from "@/content/guidelines/icc-2026.json";
import testGuideline from "@/content/guidelines/tests.json";
import {
  getAllValues,
  getValue,
  putValue,
  saveWithQueue,
  subscribeToData,
} from "@/lib/data/indexed-db";
import { flushSyncQueue, SyncSummary } from "@/lib/data/sync";
import {
  DEMO_PROFILE,
  PlayerProfile,
  STAGES,
  TestRecord,
} from "@/lib/data/types";
import type { CameraMetrics, TestKind } from "@/lib/pose/types";
import { Onboarding } from "./onboarding";
import { PoseCamera } from "./pose-camera";
import { ServiceWorkerRegister } from "./service-worker-register";

type Page = "home" | "journey" | "setup" | "test" | "symptoms" | "result" | "support" | "profile";

const symptomOptions = testGuideline.symptomStops;

const emptyMetrics: CameraMetrics = {
  count: 0,
  holdSeconds: 0,
  framing: "not-visible",
  cue: "",
  fps: 0,
};

function weeksSince(date: string) {
  const elapsed = Date.now() - new Date(`${date}T00:00:00`).getTime();
  return Math.max(0, Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)));
}

function Shell({ children, page, setPage, profile }: { children: React.ReactNode; page: Page; setPage: (page: Page) => void; profile: PlayerProfile }) {
  return (
    <main className="app-shell">
      <ServiceWorkerRegister />
      <aside className="story-panel" aria-label="ComeBack introduction">
        <button className="brand brand-light brand-button" onClick={() => setPage("home")}><span className="brand-mark">C</span><span>ComeBack</span></button>
        <div className="story-copy">
          <span className="eyebrow eyebrow-light">Return to cricket, supported</span>
          <h1>Your strength never left. Your return starts here.</h1>
          <p>A personal, clinician-connected journey built around the ICC&apos;s six stages of return to play.</p>
          <div className="trust-row"><span><ShieldCheck size={17} /> Clinician connected</span><span><LockKeyhole size={17} /> Video stays private</span></div>
        </div>
        <div className="quote-card"><div className="quote-mark">&ldquo;</div><p>No player should have to choose between motherhood and representing her country.</p><span>Jay Shah, ICC Chairman</span><a href={guideline.document.sourcePageUrl} target="_blank" rel="noreferrer">ICC media release, 22 June 2026</a></div>
      </aside>
      <section className="product-panel">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => setPage("home")} aria-label="Go home"><span className="brand-mark">C</span><span>ComeBack</span></button>
          <div className="top-actions"><Link className="clinician-link" href="/clinician"><Stethoscope size={16} /> Clinician view</Link><button className="icon-button" aria-label="Notifications"><Bell size={20} /></button><button className="avatar" onClick={() => setPage("profile")} aria-label="Open profile">{profile.name.slice(0, 2).toUpperCase()}</button></div>
        </header>
        <div className="screen" aria-live="polite">{children}</div>
        <nav className="bottom-nav" aria-label="Primary navigation">
          <button className={page === "home" ? "active" : ""} onClick={() => setPage("home")}><Home size={21} /><span>Today</span></button>
          <button className={page === "journey" ? "active" : ""} onClick={() => setPage("journey")}><Target size={21} /><span>Journey</span></button>
          <button className={page === "support" ? "active" : ""} onClick={() => setPage("support")}><MessageCircleMore size={21} /><span>Support</span></button>
          <button className={page === "profile" ? "active" : ""} onClick={() => setPage("profile")}><CircleUserRound size={21} /><span>Profile</span></button>
        </nav>
      </section>
    </main>
  );
}

export function PlayerApp() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState<Page>("home");
  const [metrics, setMetrics] = useState<CameraMetrics>(emptyMetrics);
  const [testKind, setTestKind] = useState<TestKind>("squat");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [latest, setLatest] = useState<TestRecord | null>(null);
  const [online, setOnline] = useState(true);
  const [sync, setSync] = useState<SyncSummary>({ mode: "local-demo", synced: 0, pending: 0 });

  const load = useCallback(async () => {
    const stored = await getValue<PlayerProfile>("profiles", DEMO_PROFILE.id);
    const profiles = stored ? [stored] : await getAllValues<PlayerProfile>("profiles");
    const nextProfile = profiles[0] ?? null;
    setProfile(nextProfile);
    if (nextProfile) {
      const records = await getAllValues<TestRecord>("tests");
      setLatest(records.filter((record) => record.playerId === nextProfile.id).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] ?? null);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void load();
      setOnline(navigator.onLine);
    }, 0);
    const updateNetwork = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    const unsubscribe = subscribeToData(() => void load());
    return () => {
      window.clearTimeout(initialLoad);
      unsubscribe();
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, [load]);

  const saveProfile = async (next: PlayerProfile) => {
    await saveWithQueue("profile", "profiles", next);
    setProfile(next);
    setPage("home");
    setSync(await flushSyncQueue());
  };

  const captureMetrics = useCallback((kind: TestKind, next: CameraMetrics) => {
    setTestKind(kind);
    setMetrics(next);
  }, []);

  const completeCheckIn = async () => {
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
    await saveWithQueue("test", "tests", record);
    const nextProfile = { ...profile, stageStatus: symptoms.length ? "held" as const : "awaiting-review" as const, updatedAt: new Date().toISOString() };
    await putValue("profiles", nextProfile);
    setProfile(nextProfile);
    setLatest(record);
    setSync(await flushSyncQueue());
    setPage("result");
  };

  if (!loaded) return <main className="loading-screen"><span className="camera-spinner" /><strong>Opening your private journey</strong></main>;
  if (!profile) return <Onboarding onComplete={saveProfile} />;

  return (
    <Shell profile={profile} page={page} setPage={setPage}>
      {page === "home" && <Today profile={profile} latest={latest} online={online} sync={sync} onStart={() => setPage("setup")} />}
      {page === "journey" && <Journey profile={profile} />}
      {page === "setup" && <Setup onBack={() => setPage("home")} onNext={() => setPage("test")} />}
      {page === "test" && <Test onBack={() => setPage("setup")} onNext={() => setPage("symptoms")} onMetrics={captureMetrics} />}
      {page === "symptoms" && <Symptoms values={symptoms} onChange={setSymptoms} onBack={() => setPage("test")} onNext={completeCheckIn} />}
      {page === "result" && <Result profile={profile} record={latest} onHome={() => setPage("home")} />}
      {page === "support" && <Support profile={profile} />}
      {page === "profile" && <Profile profile={profile} onReset={async () => { await putValue("profiles", { ...profile, name: profile.name }); indexedDB.deleteDatabase("comeback-data"); location.reload(); }} />}
    </Shell>
  );
}

function Today({ profile, latest, online, sync, onStart }: { profile: PlayerProfile; latest: TestRecord | null; online: boolean; sync: SyncSummary; onStart: () => void }) {
  const stageIndex = STAGES.indexOf(profile.stage);
  return <div className="home-screen">
    <div className="status-strip"><span className={online ? "online" : "offline"}>{online ? <Wifi size={13} /> : <CloudOff size={13} />}{online ? "Online" : "Offline ready"}</span><span>{sync.mode === "local-demo" ? "Private demo storage" : `${sync.pending} awaiting sync`}</span></div>
    <div className="welcome-row"><div><p className="soft-label">Your return plan</p><h2>Welcome back, {profile.name}</h2><p>One clear step at a time, with your care team in control.</p></div><div className="week-badge"><strong>{weeksSince(profile.deliveryDate)}</strong><span>weeks</span></div></div>
    <section className="stage-card"><div className="stage-heading"><div><span className="eyebrow">Your current stage</span><h3>{profile.stage}</h3></div><span className={`stage-status ${profile.stageStatus}`}>{profile.stageStatus.replace("-", " ")}</span></div><div className="roadmap" aria-label="Six Rs journey">{STAGES.map((stage, index) => <div className={`roadmap-item ${index < stageIndex ? "done" : index === stageIndex ? "current" : "next"}`} key={stage}><span className="roadmap-dot">{index < stageIndex ? <Check size={13} strokeWidth={3} /> : index + 1}</span><span>{stage}</span></div>)}</div><p className="stage-note"><Sparkles size={17} /> Your stage only changes after your linked clinician approves it.</p></section>
    <div className="section-title"><div><span className="eyebrow">Today&apos;s next step</span><h3>{profile.stageStatus === "awaiting-review" ? "Review pending" : "Readiness check"}</h3></div><span className="time-chip">2 min</span></div>
    <button className="task-card" onClick={onStart}><span className="task-icon"><Target size={25} /></span><span className="task-copy"><strong>Camera-guided check-in</strong><small>{latest ? `Last saved ${new Date(latest.completedAt).toLocaleDateString()}` : "Four movement options, then symptoms"}</small></span><span className="round-arrow"><ArrowRight size={20} /></span></button>
    <section className="clinician-card"><span className="clinician-avatar"><Stethoscope size={23} /></span><div><small>Your clinician</small><strong>{profile.clinicianName}</strong><span><i /> Connected for demo review</span></div><Link href="/clinician" aria-label="Open clinician dashboard"><ChevronRight size={20} /></Link></section>
    <p className="medical-note"><ShieldCheck size={16} /> ComeBack supports your care team. It does not provide medical clearance.</p>
  </div>;
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack?: () => void }) {
  return <div className="screen-header">{onBack && <button className="back-button" onClick={onBack} aria-label="Go back"><ArrowLeft size={21} /></button>}<div><span className="eyebrow">ComeBack journey</span><h2>{title}</h2><p>{subtitle}</p></div></div>;
}

function Journey({ profile }: { profile: PlayerProfile }) {
  const stageIndex = STAGES.indexOf(profile.stage);
  return <div className="flow-screen"><Header title="Your 6 Rs roadmap" subtitle="Guidance, timing and your next conversation in one place." /><div className="journey-list">{guideline.stages.map((stage, index) => <section className={`journey-stage ${index === stageIndex ? "current" : ""}`} key={stage.id}><span className="journey-number">{index < stageIndex ? <Check size={16} /> : stage.order}</span><div><div className="journey-heading"><h3>{stage.label}</h3><span>{stage.timing}</span></div><p>{stage.purpose}</p>{index === stageIndex && <ul>{stage.guidance.map((item) => <li key={item}>{item}</li>)}</ul>}<small>ICC guideline, page {stage.reference.pdfPage}, {stage.reference.section}</small></div></section>)}</div><p className="evidence-note"><ShieldCheck size={18} /> The ICC framework guides care-team conversations. It is not an automated clearance protocol.</p></div>;
}

function Setup({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return <div className="flow-screen"><Header title="Set up safely" subtitle="A good camera angle helps describe movement." onBack={onBack} /><div className="camera-guide"><div className="guide-frame"><div className="person-shape"><span className="head" /><span className="body" /><span className="leg left" /><span className="leg right" /><span className="arm left" /><span className="arm right" /></div><span className="frame-corner tl" /><span className="frame-corner tr" /><span className="frame-corner bl" /><span className="frame-corner br" /><span className="distance-line">about 2 metres</span></div></div><div className="instruction-list"><div><span>1</span><p><strong>Show your whole body</strong><small>Use the front view unless the bridge asks for side view.</small></p></div><div><span>2</span><p><strong>Secure your phone</strong><small>Place it around hip height.</small></p></div><div><span>3</span><p><strong>Clear the floor</strong><small>Stop if you feel pain, heaviness, leaking or concern.</small></p></div></div><button className="primary-button" onClick={onNext}><Camera size={19} /> Open private camera <ArrowRight size={19} /></button><p className="privacy-line"><LockKeyhole size={15} /> Raw video is processed on this device and never saved or uploaded.</p></div>;
}

function Test({ onBack, onNext, onMetrics }: { onBack: () => void; onNext: () => void; onMetrics: (kind: TestKind, metrics: CameraMetrics) => void }) {
  return <div className="flow-screen test-flow"><Header title="Movement check-in" subtitle="Choose one test. Counts are observations, not pass or fail." onBack={onBack} /><PoseCamera onMetrics={onMetrics} /><button className="primary-button" onClick={onNext}>Continue to symptoms <ArrowRight size={19} /></button></div>;
}

function Symptoms({ values, onChange, onBack, onNext }: { values: string[]; onChange: (values: string[]) => void; onBack: () => void; onNext: () => void }) {
  const toggle = (code: string) => onChange(values.includes(code) ? values.filter((value) => value !== code) : [...values, code]);
  return <div className="flow-screen"><Header title="How did that feel?" subtitle="Symptoms always matter more than a camera observation." onBack={onBack} /><div className="feeling-card"><span className="heart-icon"><HeartHandshake size={28} /></span><h3>Select anything you noticed during or after the movement.</h3><div className="symptom-check-grid">{symptomOptions.map((symptom) => <label className={values.includes(symptom.code) ? "checked" : ""} key={symptom.code}><input type="checkbox" checked={values.includes(symptom.code)} onChange={() => toggle(symptom.code)} /><span>{symptom.label}</span></label>)}</div></div>{values.length > 0 && <div className="red-flag-note" role="alert"><Pause size={20} /><p><strong>Pause this stage and contact your care team.</strong><span>Your answers will be highlighted for clinician review.</span></p></div>}<button className="primary-button" onClick={onNext}>{values.length ? "Save and request review" : "Save symptom-free check-in"}<ArrowRight size={19} /></button><div className="citation"><ShieldCheck size={18} /><p><strong>Complete symptom screen</strong><span>Goom, Donnelly and Brockwell 2019, pages 10, 13 and 14. Level 4 expert consensus.</span></p></div></div>;
}

function Result({ profile, record, onHome }: { profile: PlayerProfile; record: TestRecord | null; onHome: () => void }) {
  const clear = !record?.symptoms.length;
  return <div className="flow-screen result-screen"><div className={`result-orb ${clear ? "" : "hold"}`}>{clear ? <Check size={38} /> : <Pause size={36} />}</div><span className="eyebrow">Check-in saved privately</span><h2>{clear ? `Thank you, ${profile.name}` : "Pause and check in"}</h2><p>{clear ? "Your movement observations and symptom-free check-in are ready for clinician review." : "Your reported symptoms have placed this stage on hold for clinician review."}</p><div className="result-grid"><div><strong>{record?.metrics.count ?? 0}</strong><span>Observed reps</span></div><div><strong>{record?.metrics.holdSeconds.toFixed(1) ?? "0.0"}s</strong><span>Observed hold</span></div><div><strong>{record?.symptoms.length ?? 0}</strong><span>Symptoms</span></div></div><div className="approval-card"><span><Stethoscope size={24} /></span><div><small>For {profile.clinicianName}</small><strong>{clear ? "Awaiting clinician review" : "Review requested with symptom alert"}</strong><p>Your stage has not advanced.</p></div><ChevronRight size={20} /></div><Link className="primary-button link-button" href="/clinician">Open clinician demo <ArrowRight size={18} /></Link><button className="text-button" onClick={onHome}>Back to today</button></div>;
}

function Support({ profile }: { profile: PlayerProfile }) {
  return <div className="flow-screen"><Header title="Your support circle" subtitle="Know who to contact and when." /><section className="support-hero"><HeartHandshake size={31} /><h3>You do not have to navigate this alone.</h3><p>ComeBack keeps your observations organised for conversations with qualified care professionals.</p></section><div className="support-list"><div><span><Stethoscope size={20} /></span><p><small>Linked clinician</small><strong>{profile.clinicianName}</strong></p><span>Demo connection</span></div><div><span><ShieldCheck size={20} /></span><p><small>When symptoms appear</small><strong>Pause and contact your care team</strong></p><span>No automated diagnosis</span></div></div><a className="primary-button link-button" href="mailto:demo-clinician@example.com?subject=ComeBack check-in">Message clinician <MessageCircleMore size={18} /></a><p className="evidence-note">For urgent or severe symptoms, use appropriate local emergency care rather than this app.</p></div>;
}

function Profile({ profile, onReset }: { profile: PlayerProfile; onReset: () => void }) {
  return <div className="flow-screen"><Header title="Your profile" subtitle="The information used to personalise this device." /><div className="profile-card"><div className="profile-avatar">{profile.name.slice(0, 2).toUpperCase()}</div><h3>{profile.name}</h3><span>{profile.role.replace("-", " ")}</span><dl><div><dt>Delivery date</dt><dd>{new Date(`${profile.deliveryDate}T00:00:00`).toLocaleDateString()}</dd></div><div><dt>Delivery type</dt><dd>{profile.deliveryType}</dd></div><div><dt>Language</dt><dd>{profile.language.toUpperCase()}</dd></div><div><dt>Current stage</dt><dd>{profile.stage}</dd></div></dl></div><div className="privacy-card"><LockKeyhole size={21} /><div><strong>Local-first privacy</strong><p>Camera frames stay in memory only. This demo stores profile details and movement observations in IndexedDB on this device.</p></div></div><button className="danger-text-button" onClick={onReset}>Erase local demo data</button></div>;
}
