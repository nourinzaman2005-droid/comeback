import { describe, expect, it } from "vitest";
import {
  evaluateProgression,
  type ProgressionFacts,
  type Stage,
} from "../../lib/rules";

const baseFacts: ProgressionFacts = {
  currentStage: "ready",
  weeksPostpartum: 20,
  activeSymptoms: [],
  clinicianApproval: true,
  medicalReviewCompleted: true,
  pelvicHealthAssessmentCompleted: true,
  loadImpactScreenReviewed: true,
  cricketWorkloadCompleted: true,
  matchReturnConfirmed: true,
};

const eligibleCases: Array<[Stage, Stage]> = [
  ["ready", "review"],
  ["review", "restore"],
  ["restore", "recondition"],
  ["recondition", "return"],
  ["return", "refine"],
];

describe("evaluateProgression", () => {
  it.each(eligibleCases)(
    "allows %s to become eligible for %s",
    (currentStage, nextStage) => {
      const decision = evaluateProgression({ ...baseFacts, currentStage });

      expect(decision.status).toBe("eligible");
      expect(decision.nextStage).toBe(nextStage);
      expect(decision.missingRequirements).toEqual([]);
    },
  );

  it.each([
    ["ready", "weeksPostpartum", 5, "minimum_6_weeks_postpartum"],
    ["review", "weeksPostpartum", 7, "minimum_8_weeks_postpartum"],
    ["restore", "weeksPostpartum", 11, "minimum_12_weeks_postpartum"],
    ["review", "medicalReviewCompleted", false, "medical_review_completed"],
    [
      "review",
      "pelvicHealthAssessmentCompleted",
      false,
      "pelvic_health_assessment_completed",
    ],
    [
      "restore",
      "loadImpactScreenReviewed",
      false,
      "load_impact_screen_reviewed_by_clinician",
    ],
    [
      "recondition",
      "cricketWorkloadCompleted",
      false,
      "cricket_workload_completed",
    ],
    ["return", "matchReturnConfirmed", false, "match_return_confirmed"],
  ] as const)(
    "holds %s when %s is incomplete",
    (currentStage, field, value, missingRequirement) => {
      const decision = evaluateProgression({
        ...baseFacts,
        currentStage,
        [field]: value,
      });

      expect(decision.status).toBe("hold");
      expect(decision.missingRequirements).toContain(missingRequirement);
    },
  );

  it.each(eligibleCases)(
    "requires clinician approval for %s",
    (currentStage) => {
      const decision = evaluateProgression({
        ...baseFacts,
        currentStage,
        clinicianApproval: false,
      });

      expect(decision.status).toBe("hold");
      expect(decision.requiresClinicianAction).toBe(true);
      expect(decision.missingRequirements).toContain(
        "clinician_approval_required",
      );
    },
  );

  it("stops progression and preserves every reported symptom", () => {
    const activeSymptoms = [
      "urinary_or_faecal_incontinence",
      "pelvic_pressure_or_dragging",
    ] as const;
    const decision = evaluateProgression({
      ...baseFacts,
      currentStage: "restore",
      activeSymptoms: [...activeSymptoms],
    });

    expect(decision.status).toBe("hold");
    expect(decision.activeSymptoms).toEqual(activeSymptoms);
    expect(decision.missingRequirements[0]).toBe("symptom_review_required");
    expect(decision.requiresClinicianAction).toBe(true);
    expect(decision.references[0].source).toBe("GOOM_2019");
  });

  it("keeps other missing requirements visible when symptoms create a hold", () => {
    const decision = evaluateProgression({
      ...baseFacts,
      currentStage: "review",
      activeSymptoms: ["lumbopelvic_pain"],
      medicalReviewCompleted: false,
      clinicianApproval: false,
    });

    expect(decision.missingRequirements).toEqual([
      "symptom_review_required",
      "medical_review_completed",
      "clinician_approval_required",
    ]);
  });

  it.each([
    "urinary_or_faecal_incontinence",
    "urinary_or_faecal_urgency",
    "pelvic_pressure_or_dragging",
    "unexpected_vaginal_bleeding",
    "pain_with_intercourse",
    "obstructive_defecation",
    "abdominal_wall_concern",
    "lumbopelvic_pain",
  ] as const)("holds progression for the %s symptom screen", (symptom) => {
    const decision = evaluateProgression({
      ...baseFacts,
      currentStage: "restore",
      activeSymptoms: [symptom],
    });

    expect(decision.status).toBe("hold");
    expect(decision.activeSymptoms).toEqual([symptom]);
  });

  it("stops and requests review when symptoms appear during Refine", () => {
    const decision = evaluateProgression({
      ...baseFacts,
      currentStage: "refine",
      activeSymptoms: ["unexpected_vaginal_bleeding"],
    });

    expect(decision.status).toBe("hold");
    expect(decision.nextStage).toBeNull();
    expect(decision.activeSymptoms).toEqual(["unexpected_vaginal_bleeding"]);
    expect(decision.requiresClinicianAction).toBe(true);
  });

  it("treats symptom-free Refine as monitoring with no next stage", () => {
    const decision = evaluateProgression({
      ...baseFacts,
      currentStage: "refine",
    });

    expect(decision.status).toBe("complete");
    expect(decision.nextStage).toBeNull();
    expect(decision.requiresClinicianAction).toBe(false);
  });
});
