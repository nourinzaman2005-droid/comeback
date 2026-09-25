"use client";

import {
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ClinicianDashboard } from "./clinician-dashboard";
import { PlayerApp } from "./player-app";
import {
  clearSession,
  fetchClinicians,
  login,
  registerClinician,
  registerPlayer,
  validateSession,
} from "@/lib/data/render-api";
import type {
  AccountRole,
  AuthSession,
  ClinicianDirectoryItem,
} from "@/lib/data/types";

export function AuthPortal({ role }: { role: AccountRole }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void validateSession(role).then((value) => {
      setSession(value);
      setReady(true);
    });
    const expired = () => setSession(null);
    window.addEventListener("comeback-auth-expired", expired);
    return () => window.removeEventListener("comeback-auth-expired", expired);
  }, [role]);

  const logout = () => {
    clearSession(role);
    setSession(null);
  };

  if (!ready)
    return (
      <main className="loading-screen">
        <BrandLogo className="auth-loading-logo" />
        <strong>Opening your secure portal</strong>
      </main>
    );

  if (!session) return <AuthScreen role={role} onAuthenticated={setSession} />;

  return role === "player" ? (
    <PlayerApp session={session} onLogout={logout} />
  ) : (
    <ClinicianDashboard session={session} onLogout={logout} />
  );
}

function PasswordField({
  value,
  onChange,
  label = "Password",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="auth-field password-field">
      <span>{label}</span>
      <span className="password-input">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={
            label === "Password" ? "current-password" : "new-password"
          }
          minLength={8}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}

function AuthScreen({
  role,
  onAuthenticated,
}: {
  role: AccountRole;
  onAuthenticated: (session: AuthSession) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [clinicians, setClinicians] = useState<ClinicianDirectoryItem[]>([]);
  const [name, setName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryType, setDeliveryType] = useState<
    "vaginal" | "caesarean" | "other"
  >("vaginal");
  const [cricketRole, setCricketRole] = useState<
    "batter" | "bowler" | "all-rounder" | "wicketkeeper"
  >("batter");
  const [language, setLanguage] = useState<"en" | "bn" | "hi" | "ur">("en");
  const [clinicianId, setClinicianId] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (role !== "player") return;
    void fetchClinicians()
      .then((values) => {
        setClinicians(values);
        setClinicianId((current) => current || values[0]?.id || "");
      })
      .catch(() =>
        setError("The clinician directory is temporarily unavailable."),
      );
  }, [role]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result =
        mode === "login"
          ? await login(role, email, password)
          : role === "player"
            ? await registerPlayer({
                email,
                password,
                name,
                deliveryDate,
                deliveryType,
                cricketRole,
                language,
                clinicianId,
                consent: consent as true,
              })
            : await registerClinician({
                email,
                password,
                registrationNumber,
              });
      onAuthenticated(result);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Please try again");
    } finally {
      setBusy(false);
    }
  };

  const useDemo = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await login(
        role,
        role === "player" ? "nourin@comeback.demo" : "maya.rahman@icc-demo.org",
        role === "player" ? "ComeBack2026!" : "CareTeam2026!",
      );
      onAuthenticated(result);
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "The demo could not open",
      );
    } finally {
      setBusy(false);
    }
  };

  const isPlayer = role === "player";
  return (
    <main className={`auth-shell auth-${role}`}>
      <section className="auth-story">
        <div className="brand auth-brand">
          <BrandLogo className="brand-mark" />
          <span>{isPlayer ? "ComeBack" : "ComeBack Clinical"}</span>
        </div>
        <div>
          <span className="eyebrow eyebrow-light">
            {isPlayer
              ? "Your return, securely supported"
              : "Verified care portal"}
          </span>
          <h1>
            {isPlayer
              ? "A private path back to the game you love."
              : "Clinical decisions stay with clinicians."}
          </h1>
          <p>
            {isPlayer
              ? "Choose an ICC-registered clinician, follow your roadmap, and keep every conversation in one calm place."
              : "Review linked players, respond to symptoms, message securely, and control every stage decision."}
          </p>
        </div>
        <div className="auth-trust">
          <span>
            <LockKeyhole size={18} /> Password protected
          </span>
          <span>
            <ShieldCheck size={18} /> Role-separated access
          </span>
          <span>
            <Sparkles size={18} /> Camera stays on device
          </span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-card">
          <span className="auth-role-icon">
            {isPlayer ? <Sparkles size={23} /> : <Stethoscope size={23} />}
          </span>
          <p className="eyebrow">
            {isPlayer ? "Player portal" : "Clinician portal"}
          </p>
          <h2>
            {mode === "login"
              ? "Welcome back"
              : isPlayer
                ? "Create your journey"
                : "Activate clinical access"}
          </h2>
          <p className="auth-subtitle">
            {mode === "login"
              ? `Sign in to your separate ${role} account.`
              : isPlayer
                ? "Your selected clinician will appear in your private support circle."
                : "Your email and registration number must match the ICC directory."}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              {isPlayer ? "Register" : "Activate account"}
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === "register" && isPlayer && (
              <>
                <label className="auth-field">
                  <span>First name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    maxLength={80}
                  />
                </label>
                <div className="auth-field-row">
                  <label className="auth-field">
                    <span>Delivery date</span>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(event) => setDeliveryDate(event.target.value)}
                      required
                    />
                  </label>
                  <label className="auth-field">
                    <span>Delivery type</span>
                    <select
                      value={deliveryType}
                      onChange={(event) =>
                        setDeliveryType(
                          event.target.value as typeof deliveryType,
                        )
                      }
                    >
                      <option value="vaginal">Vaginal</option>
                      <option value="caesarean">Caesarean</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>
                <div className="auth-field-row">
                  <label className="auth-field">
                    <span>Cricket role</span>
                    <select
                      value={cricketRole}
                      onChange={(event) =>
                        setCricketRole(event.target.value as typeof cricketRole)
                      }
                    >
                      <option value="batter">Batter</option>
                      <option value="bowler">Bowler</option>
                      <option value="all-rounder">All-rounder</option>
                      <option value="wicketkeeper">Wicketkeeper</option>
                    </select>
                  </label>
                  <label className="auth-field">
                    <span>Language</span>
                    <select
                      value={language}
                      onChange={(event) =>
                        setLanguage(event.target.value as typeof language)
                      }
                    >
                      <option value="en">English</option>
                      <option value="bn">Bengali</option>
                      <option value="hi">Hindi</option>
                      <option value="ur">Urdu</option>
                    </select>
                  </label>
                </div>
                <fieldset className="clinician-picker">
                  <legend>Choose your ICC-registered clinician</legend>
                  {clinicians.map((clinician) => (
                    <label
                      key={clinician.id}
                      className={clinicianId === clinician.id ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name="clinician"
                        value={clinician.id}
                        checked={clinicianId === clinician.id}
                        onChange={() => setClinicianId(clinician.id)}
                      />
                      <span className="directory-avatar">
                        {clinician.displayName.split(" ").slice(-1)[0][0]}
                      </span>
                      <span>
                        <strong>{clinician.displayName}</strong>
                        <small>{clinician.specialty}</small>
                        <small>{clinician.memberBoard}</small>
                      </span>
                      <BadgeCheck size={18} aria-label="ICC verified" />
                    </label>
                  ))}
                </fieldset>
              </>
            )}

            {mode === "register" && !isPlayer && (
              <label className="auth-field">
                <span>ICC registration number</span>
                <input
                  value={registrationNumber}
                  onChange={(event) =>
                    setRegistrationNumber(event.target.value)
                  }
                  placeholder="ICC-XX-0000"
                  required
                />
              </label>
            )}

            <label className="auth-field">
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <PasswordField
              value={password}
              onChange={setPassword}
              label={mode === "login" ? "Password" : "Create password"}
            />

            {mode === "register" && isPlayer && (
              <label className="auth-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  required
                />
                <span>
                  I consent to store my profile, movement observations,
                  symptoms, messages, and clinician decisions. Camera media is
                  never uploaded.
                </span>
              </label>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="primary-button auth-submit"
              disabled={
                busy || (mode === "register" && isPlayer && !clinicianId)
              }
            >
              {busy
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in securely"
                  : isPlayer
                    ? "Create player account"
                    : "Verify and activate"}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>

          {mode === "login" && (
            <button
              type="button"
              className="demo-login"
              onClick={useDemo}
              disabled={busy}
            >
              {isPlayer
                ? "Try the 2-minute player demo"
                : "Open fictional clinician demo"}
            </button>
          )}
          <p className="auth-boundary">
            This prototype uses fictional demo accounts. It is not an emergency
            or medical-clearance service.
          </p>
        </div>
      </section>
    </main>
  );
}
