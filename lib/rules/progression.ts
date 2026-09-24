import type {
  GuidelineReference,
  ProgressionDecision,
  ProgressionFacts,
  Stage,
} from "./types";

type Requirement = {
  id: string;
  met: (facts: ProgressionFacts) => boolean;
};

type Transition = {
  nextStage: Stage;
  requirements: Requirement[];
  references: GuidelineReference[];
};

const clinicianApproval: Requirement = {
  id: "clinician_approval_required",
  met: (facts) => facts.clinicianApproval,
};

const transitions: Record<Exclude<Stage, "refine">, Transition> = {
  ready: {
    nextStage: "review",
    requirements: [
      {
        id: "minimum_6_weeks_postpartum",
        met: (facts) => facts.weeksPostpartum >= 6,
      },
      clinicianApproval,
    ],
    references: [
      { source: "ICC_2026", page: "06", section: "Ready (0 to 6 weeks)" },
      { source: "PRODUCT_SAFETY_POLICY", section: "Clinician approval gate" },
    ],
  },
  review: {
    nextStage: "restore",
    requirements: [
      {
        id: "minimum_8_weeks_postpartum",
        met: (facts) => facts.weeksPostpartum >= 8,
      },
      {
        id: "medical_review_completed",
        met: (facts) => facts.medicalReviewCompleted,
      },
      {
        id: "pelvic_health_assessment_completed",
        met: (facts) => facts.pelvicHealthAssessmentCompleted,
      },
      clinicianApproval,
    ],
    references: [
      { source: "ICC_2026", page: "06", section: "Review (6 to 8 weeks)" },
      { source: "PRODUCT_SAFETY_POLICY", section: "Clinician approval gate" },
    ],
  },
  restore: {
    nextStage: "recondition",
    requirements: [
      {
        id: "minimum_12_weeks_postpartum",
        met: (facts) => facts.weeksPostpartum >= 12,
      },
      {
        id: "load_impact_screen_reviewed_by_clinician",
        met: (facts) => facts.loadImpactScreenReviewed,
      },
      clinicianApproval,
    ],
    references: [
      { source: "ICC_2026", page: "06", section: "Restore and Recondition" },
      {
        source: "GOOM_2019",
        page: "10, 16",
        section: "Time and load-impact guidance",
      },
      { source: "PRODUCT_SAFETY_POLICY", section: "Clinician approval gate" },
    ],
  },
  recondition: {
    nextStage: "return",
    requirements: [
      {
        id: "cricket_workload_completed",
        met: (facts) => facts.cricketWorkloadCompleted,
      },
      clinicianApproval,
    ],
    references: [
      { source: "ICC_2026", page: "06", section: "Recondition and Return" },
      {
        source: "PRODUCT_SAFETY_POLICY",
        section: "Cricket workload and clinician gates",
      },
    ],
  },
  return: {
    nextStage: "refine",
    requirements: [
      {
        id: "match_return_confirmed",
        met: (facts) => facts.matchReturnConfirmed,
      },
      clinicianApproval,
    ],
    references: [
      { source: "ICC_2026", page: "06", section: "Return and Refine" },
      { source: "PRODUCT_SAFETY_POLICY", section: "Clinician approval gate" },
    ],
  },
};

export function evaluateProgression(
  facts: ProgressionFacts,
): ProgressionDecision {
  if (facts.activeSymptoms.length > 0) {
    const symptomNextStage =
      facts.currentStage === "refine"
        ? null
        : transitions[facts.currentStage].nextStage;
    const transitionReferences: GuidelineReference[] =
      facts.currentStage === "refine"
        ? [{ source: "ICC_2026", page: "06", section: "Refine monitoring" }]
        : transitions[facts.currentStage].references;
    const otherMissingRequirements =
      facts.currentStage === "refine"
        ? []
        : transitions[facts.currentStage].requirements
            .filter((requirement) => !requirement.met(facts))
            .map((requirement) => requirement.id);

    return {
      status: "hold",
      currentStage: facts.currentStage,
      nextStage: symptomNextStage,
      missingRequirements: [
        "symptom_review_required",
        ...otherMissingRequirements,
      ],
      activeSymptoms: facts.activeSymptoms,
      requiresClinicianAction: true,
      references: [
        { source: "GOOM_2019", page: "10, 14", section: "Symptom stops" },
        ...transitionReferences,
      ],
    };
  }

  if (facts.currentStage === "refine") {
    return {
      status: "complete",
      currentStage: "refine",
      nextStage: null,
      missingRequirements: [],
      activeSymptoms: facts.activeSymptoms,
      requiresClinicianAction: false,
      references: [{ source: "ICC_2026", page: "06", section: "Refine" }],
    };
  }

  const transition = transitions[facts.currentStage];
  const missingRequirements = transition.requirements
    .filter((requirement) => !requirement.met(facts))
    .map((requirement) => requirement.id);

  return {
    status: missingRequirements.length === 0 ? "eligible" : "hold",
    currentStage: facts.currentStage,
    nextStage: transition.nextStage,
    missingRequirements,
    activeSymptoms: [],
    requiresClinicianAction: !facts.clinicianApproval,
    references: transition.references,
  };
}
