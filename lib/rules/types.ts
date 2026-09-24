export const stages = [
  "ready",
  "review",
  "restore",
  "recondition",
  "return",
  "refine",
] as const;

export type Stage = (typeof stages)[number];

export const symptomCodes = [
  "urinary_or_faecal_incontinence",
  "urinary_or_faecal_urgency",
  "pelvic_pressure_or_dragging",
  "unexpected_vaginal_bleeding",
  "pain_with_intercourse",
  "obstructive_defecation",
  "abdominal_wall_concern",
  "lumbopelvic_pain",
] as const;

export type SymptomCode = (typeof symptomCodes)[number];

export type ProgressionFacts = {
  currentStage: Stage;
  weeksPostpartum: number;
  activeSymptoms: SymptomCode[];
  clinicianApproval: boolean;
  medicalReviewCompleted: boolean;
  pelvicHealthAssessmentCompleted: boolean;
  loadImpactScreenReviewed: boolean;
  cricketWorkloadCompleted: boolean;
  matchReturnConfirmed: boolean;
};

export type GuidelineReference = {
  source: "ICC_2026" | "GOOM_2019" | "PRODUCT_SAFETY_POLICY";
  page?: string;
  section: string;
};

export type ProgressionDecision = {
  status: "eligible" | "hold" | "complete";
  currentStage: Stage;
  nextStage: Stage | null;
  missingRequirements: string[];
  activeSymptoms: SymptomCode[];
  requiresClinicianAction: boolean;
  references: GuidelineReference[];
};
