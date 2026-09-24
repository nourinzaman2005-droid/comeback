"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  HeartHandshake,
  Home,
  LockKeyhole,
  MessageCircleMore,
  Pause,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
} from "lucide-react";
import { useState } from "react";
import { DemoStep, nextDemoStep, previousDemoStep } from "@/lib/demo-flow";
import { PoseCamera } from "./pose-camera";
import { ServiceWorkerRegister } from "./service-worker-register";

const roadmap = [
  { label: "Ready", state: "done" },
  { label: "Review", state: "done" },
  { label: "Restore", state: "current" },
  { label: "Recondition", state: "next" },
  { label: "Return", state: "next" },
  { label: "Refine", state: "next" },
];

const stepNumber: Record<DemoStep, number> = {
  home: 0,
  setup: 1,
  test: 2,
  symptoms: 3,
  result: 4,
};

export function DemoApp() {
  const [step, setStep] = useState<DemoStep>("home");
  const [symptomsClear, setSymptomsClear] = useState(true);

  const goNext = () => setStep((current) => nextDemoStep(current));
  const goBack = () => setStep((current) => previousDemoStep(current));

  return (
    <main className="app-shell">
      <ServiceWorkerRegister />
      <aside className="story-panel" aria-label="ComeBack introduction">
        <a
          className="brand brand-light"
          href="#"
          onClick={() => setStep("home")}
        >
          <span className="brand-mark">C</span>
          <span>ComeBack</span>
        </a>
        <div className="story-copy">
          <span className="eyebrow eyebrow-light">
            Return to cricket, supported
          </span>
          <h1>Your strength never left. Your return starts here.</h1>
          <p>
            A personal, clinician-connected journey built around the ICC&apos;s
            six stages of return to play.
          </p>
          <div className="trust-row">
            <span>
              <ShieldCheck size={17} /> Clinician approved
            </span>
            <span>
              <LockKeyhole size={17} /> Video stays private
            </span>
          </div>
        </div>
        <div className="quote-card">
          <div className="quote-mark">“</div>
          <p>
            No player should have to choose between motherhood and representing
            her country.
          </p>
          <span>Jay Shah, ICC Chairman</span>
          <a
            href="https://www.icc-cricket.com/media-releases/icc-launches-return-to-play-post-pregnancy-guidelines-for-female-cricketers"
            target="_blank"
            rel="noreferrer"
          >
            ICC media release, 22 June 2026
          </a>
        </div>
      </aside>

      <section className="product-panel">
        <header className="topbar">
          <button
            className="mobile-brand"
            onClick={() => setStep("home")}
            aria-label="Go home"
          >
            <span className="brand-mark">C</span>
            <span>ComeBack</span>
          </button>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <button className="avatar" aria-label="Open profile">
              NZ
            </button>
          </div>
        </header>

        <div className="screen" aria-live="polite">
          {step === "home" && <HomeScreen onStart={() => setStep("setup")} />}
          {step === "setup" && <SetupScreen onBack={goBack} onNext={goNext} />}
          {step === "test" && (
            <TestScreen
              onBack={goBack}
              onNext={goNext}
            />
          )}
          {step === "symptoms" && (
            <SymptomsScreen
              clear={symptomsClear}
              onChange={setSymptomsClear}
              onBack={goBack}
              onNext={goNext}
            />
          )}
          {step === "result" && (
            <ResultScreen
              clear={symptomsClear}
              onHome={() => setStep("home")}
            />
          )}
        </div>

        {step !== "home" && (
          <div
            className="flow-progress"
            aria-label={`Step ${stepNumber[step]} of 4`}
          >
            {[1, 2, 3, 4].map((item) => (
              <span
                key={item}
                className={item <= stepNumber[step] ? "active" : ""}
              />
            ))}
          </div>
        )}

        <nav className="bottom-nav" aria-label="Primary navigation">
          <button
            className={step === "home" ? "active" : ""}
            onClick={() => setStep("home")}
          >
            <Home size={21} />
            <span>Today</span>
          </button>
          <button onClick={() => setStep("setup")}>
            <Target size={21} />
            <span>Journey</span>
          </button>
          <button>
            <MessageCircleMore size={21} />
            <span>Support</span>
          </button>
          <button>
            <CircleUserRound size={21} />
            <span>Profile</span>
          </button>
        </nav>
      </section>
    </main>
  );
}

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="home-screen">
      <div className="welcome-row">
        <div>
          <p className="soft-label">Thursday, 24 September</p>
          <h2>Good evening, Nourin</h2>
          <p>You are building back beautifully, one step at a time.</p>
        </div>
        <div className="week-badge">
          <strong>16</strong>
          <span>weeks</span>
        </div>
      </div>

      <section className="stage-card">
        <div className="stage-heading">
          <div>
            <span className="eyebrow">Your current stage</span>
            <h3>Restore</h3>
          </div>
          <span className="stage-count">3 of 6</span>
        </div>
        <div className="roadmap" aria-label="Six Rs journey">
          {roadmap.map((item, index) => (
            <div className={`roadmap-item ${item.state}`} key={item.label}>
              <span className="roadmap-dot">
                {item.state === "done" ? (
                  <Check size={13} strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <p className="stage-note">
          <Sparkles size={17} /> Your next milestone is camera-guided and takes
          about 2 minutes.
        </p>
      </section>

      <div className="section-title">
        <div>
          <span className="eyebrow">Today&apos;s next step</span>
          <h3>Readiness check</h3>
        </div>
        <span className="time-chip">
          <Clock3 size={15} /> 2 min
        </span>
      </div>

      <button className="task-card" onClick={onStart}>
        <span className="task-icon">
          <Target size={25} />
        </span>
        <span className="task-copy">
          <strong>Single-leg squat</strong>
          <small>10 guided repetitions, left side</small>
        </span>
        <span className="round-arrow">
          <ArrowRight size={20} />
        </span>
      </button>

      <section className="clinician-card">
        <span className="clinician-avatar">
          <Stethoscope size={23} />
        </span>
        <div>
          <small>Your clinician</small>
          <strong>Dr. Maya Rahman</strong>
          <span>
            <i /> Connected
          </span>
        </div>
        <button aria-label="Message clinician">
          <MessageCircleMore size={20} />
        </button>
      </section>

      <p className="medical-note">
        <ShieldCheck size={16} /> ComeBack supports your care team. It does not
        provide medical clearance.
      </p>
    </div>
  );
}

function ScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <div className="screen-header">
      <button className="back-button" onClick={onBack} aria-label="Go back">
        <ArrowLeft size={21} />
      </button>
      <div>
        <span className="eyebrow">Readiness check</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function SetupScreen({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flow-screen">
      <ScreenHeader
        title="Let us set you up"
        subtitle="A good camera angle helps us count accurately."
        onBack={onBack}
      />
      <div className="camera-guide">
        <div className="guide-frame">
          <div className="person-shape">
            <span className="head" />
            <span className="body" />
            <span className="leg left" />
            <span className="leg right" />
            <span className="arm left" />
            <span className="arm right" />
          </div>
          <span className="frame-corner tl" />
          <span className="frame-corner tr" />
          <span className="frame-corner bl" />
          <span className="frame-corner br" />
          <span className="distance-line">2 metres</span>
        </div>
      </div>
      <div className="instruction-list">
        <div>
          <span>1</span>
          <p>
            <strong>Face the camera</strong>
            <small>Keep your whole body visible.</small>
          </p>
        </div>
        <div>
          <span>2</span>
          <p>
            <strong>Place your phone securely</strong>
            <small>About 2 metres away at hip height.</small>
          </p>
        </div>
        <div>
          <span>3</span>
          <p>
            <strong>Clear some space</strong>
            <small>Make sure the floor is dry and stable.</small>
          </p>
        </div>
      </div>
      <button className="primary-button" onClick={onNext}>
        <Camera size={19} /> Open camera <ArrowRight size={19} />
      </button>
      <p className="privacy-line">
        <LockKeyhole size={15} /> Your video is processed on this device and is
        never uploaded.
      </p>
    </div>
  );
}

function TestScreen({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flow-screen test-flow">
      <ScreenHeader
        title="Single-leg squat"
        subtitle="Left side, 10 repetitions"
        onBack={onBack}
      />
      <PoseCamera />
      <button className="primary-button" onClick={onNext}>
        Finish demo set <ArrowRight size={19} />
      </button>
      <p className="privacy-line">
        <LockKeyhole size={15} /> Only your rep count and movement metrics are
        saved.
      </p>
    </div>
  );
}

function SymptomsScreen({
  clear,
  onChange,
  onBack,
  onNext,
}: {
  clear: boolean;
  onChange: (value: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const questions = [
    "Pain or discomfort",
    "Leaking",
    "Pelvic heaviness or dragging",
  ];
  return (
    <div className="flow-screen">
      <ScreenHeader
        title="How did that feel?"
        subtitle="Your symptoms matter more than a score."
        onBack={onBack}
      />
      <div className="feeling-card">
        <span className="heart-icon">
          <HeartHandshake size={28} />
        </span>
        <h3>Did you notice any of these during or after the test?</h3>
        <div className="symptom-list">
          {questions.map((question) => (
            <div key={question}>
              <span>{question}</span>
              <div className="choice-pair">
                <button
                  className={clear ? "selected" : ""}
                  onClick={() => onChange(true)}
                >
                  No
                </button>
                <button
                  className={!clear ? "selected alert" : ""}
                  onClick={() => onChange(false)}
                >
                  Yes
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="kind-note">
        <ShieldCheck size={20} />
        <p>
          <strong>There is no wrong answer.</strong>
          <span>Honest check-ins help your clinician support you safely.</span>
        </p>
      </div>
      <button className="primary-button" onClick={onNext}>
        See my result <ArrowRight size={19} />
      </button>
    </div>
  );
}

function ResultScreen({
  clear,
  onHome,
}: {
  clear: boolean;
  onHome: () => void;
}) {
  return (
    <div className="flow-screen result-screen">
      <div className={`result-orb ${clear ? "" : "hold"}`}>
        {clear ? <Check size={38} strokeWidth={2.5} /> : <Pause size={36} />}
      </div>
      <span className="eyebrow">Readiness check complete</span>
      <h2>{clear ? "Beautiful work, Nourin" : "Pause and check in"}</h2>
      <p>
        {clear
          ? "You completed 10 controlled repetitions with no symptoms reported."
          : "Your symptoms mean this stage should pause until your clinician reviews it."}
      </p>
      <div className="result-grid">
        <div>
          <strong>10 / 10</strong>
          <span>Repetitions</span>
        </div>
        <div>
          <strong>Left</strong>
          <span>Side tested</span>
        </div>
        <div>
          <strong>{clear ? "None" : "Reported"}</strong>
          <span>Symptoms</span>
        </div>
      </div>
      <div className="approval-card">
        <span>
          <Stethoscope size={24} />
        </span>
        <div>
          <small>Sent to Dr. Maya</small>
          <strong>
            {clear ? "Awaiting clinician review" : "Clinician review needed"}
          </strong>
          <p>Your stage will not change without approval.</p>
        </div>
        <ChevronRight size={20} />
      </div>
      <div className="citation">
        <ShieldCheck size={18} />
        <p>
          <strong>Based on your care pathway</strong>
          <span>
            Guideline reference will be added after primary-source extraction.
          </span>
        </p>
      </div>
      <button className="primary-button" onClick={onHome}>
        Back to today <Home size={19} />
      </button>
    </div>
  );
}
