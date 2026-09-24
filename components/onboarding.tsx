"use client";

import {
  ArrowRight,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { FormEvent, useState } from "react";
import { DEMO_PROFILE, PlayerProfile } from "@/lib/data/types";

export function Onboarding({
  onComplete,
}: {
  onComplete: (profile: PlayerProfile) => Promise<void>;
}) {
  const [page, setPage] = useState<"welcome" | "details" | "consent">(
    "welcome",
  );
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState({
    name: "",
    deliveryDate: "",
    deliveryType: "vaginal" as PlayerProfile["deliveryType"],
    role: "all-rounder" as PlayerProfile["role"],
    language: "en" as PlayerProfile["language"],
  });

  async function finish(profile: PlayerProfile) {
    setSaving(true);
    await onComplete(profile);
    setSaving(false);
  }

  function submitDetails(event: FormEvent) {
    event.preventDefault();
    setPage("consent");
  }

  const createProfile = () => {
    const now = new Date().toISOString();
    return finish({
      ...DEMO_PROFILE,
      id: `player-${crypto.randomUUID()}`,
      name: details.name.trim(),
      deliveryDate: details.deliveryDate,
      deliveryType: details.deliveryType,
      role: details.role,
      language: details.language,
      consentAt: now,
      updatedAt: now,
      stage: "Ready",
    });
  };

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card">
        <div className="onboarding-brand">
          <BrandLogo className="brand-mark" />
          <strong>ComeBack</strong>
        </div>

        {page === "welcome" && (
          <div className="onboarding-page welcome-onboarding">
            <span className="onboarding-icon">
              <HeartHandshake size={34} />
            </span>
            <span className="eyebrow">Your return, at your pace</span>
            <h1>Feel supported from your first step back.</h1>
            <p>
              A private, clinician-connected pathway for cricketers returning
              after pregnancy.
            </p>
            <div className="welcome-points">
              <span>
                <Sparkles size={17} /> Clear next steps
              </span>
              <span>
                <LockKeyhole size={17} /> Camera stays on your device
              </span>
              <span>
                <ShieldCheck size={17} /> Clinician approval stays essential
              </span>
            </div>
            <button
              className="primary-button"
              onClick={() => setPage("details")}
            >
              Set up my journey <ArrowRight size={18} />
            </button>
            <button
              className="text-button"
              onClick={() => finish(DEMO_PROFILE)}
              disabled={saving}
            >
              {saving ? "Preparing demo..." : "Try the 2-minute demo"}
            </button>
          </div>
        )}

        {page === "details" && (
          <form
            className="onboarding-page onboarding-form"
            onSubmit={submitDetails}
          >
            <span className="eyebrow">Step 1 of 2</span>
            <h1>Tell us about your journey</h1>
            <p>
              These details personalise your roadmap. You can update them later.
            </p>
            <label>
              First name
              <input
                required
                value={details.name}
                onChange={(event) =>
                  setDetails({ ...details, name: event.target.value })
                }
                autoComplete="given-name"
              />
            </label>
            <label>
              Delivery date
              <input
                required
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={details.deliveryDate}
                onChange={(event) =>
                  setDetails({ ...details, deliveryDate: event.target.value })
                }
              />
            </label>
            <div className="form-pair">
              <label>
                Delivery type
                <select
                  value={details.deliveryType}
                  onChange={(event) =>
                    setDetails({
                      ...details,
                      deliveryType: event.target
                        .value as PlayerProfile["deliveryType"],
                    })
                  }
                >
                  <option value="vaginal">Vaginal</option>
                  <option value="caesarean">Caesarean</option>
                  <option value="other">Prefer to self-describe</option>
                </select>
              </label>
              <label>
                Cricket role
                <select
                  value={details.role}
                  onChange={(event) =>
                    setDetails({
                      ...details,
                      role: event.target.value as PlayerProfile["role"],
                    })
                  }
                >
                  <option value="batter">Batter</option>
                  <option value="bowler">Bowler</option>
                  <option value="all-rounder">All-rounder</option>
                  <option value="wicketkeeper">Wicketkeeper</option>
                </select>
              </label>
            </div>
            <label>
              Language
              <select
                value={details.language}
                onChange={(event) =>
                  setDetails({
                    ...details,
                    language: event.target.value as PlayerProfile["language"],
                  })
                }
              >
                <option value="en">English</option>
                <option value="bn">Bengali</option>
                <option value="hi">Hindi</option>
                <option value="ur">Urdu</option>
              </select>
            </label>
            <button className="primary-button" type="submit">
              Continue <ArrowRight size={18} />
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => setPage("welcome")}
            >
              Back
            </button>
          </form>
        )}

        {page === "consent" && (
          <div className="onboarding-page consent-page">
            <span className="eyebrow">Step 2 of 2</span>
            <h1>Your data, your choice</h1>
            <div className="consent-item">
              <LockKeyhole size={21} />
              <p>
                <strong>Video remains on this device</strong>
                <span>
                  Only movement observations and your symptom answers can be
                  shared with your linked clinician.
                </span>
              </p>
            </div>
            <div className="consent-item">
              <ShieldCheck size={21} />
              <p>
                <strong>No automated medical clearance</strong>
                <span>
                  ComeBack never diagnoses you or advances a stage without
                  clinician approval.
                </span>
              </p>
            </div>
            <div className="consent-item">
              <HeartHandshake size={21} />
              <p>
                <strong>You can stop at any time</strong>
                <span>
                  Report symptoms honestly and contact your care team when
                  anything feels concerning.
                </span>
              </p>
            </div>
            <button
              className="primary-button"
              onClick={createProfile}
              disabled={saving}
            >
              {saving ? "Saving privately..." : "I understand and consent"}{" "}
              <ArrowRight size={18} />
            </button>
            <button className="text-button" onClick={() => setPage("details")}>
              Back
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
