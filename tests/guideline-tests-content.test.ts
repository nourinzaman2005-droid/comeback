import { describe, expect, it } from "vitest";
import tests from "../content/guidelines/tests.json";

describe("postnatal readiness test content", () => {
  it("contains all seven load and impact screens from the primary guideline", () => {
    expect(tests.loadImpactScreens.map((screen) => screen.code)).toEqual([
      "walk_30_minutes",
      "single_leg_balance",
      "single_leg_squat",
      "jog_on_spot",
      "forward_bounds",
      "hop_in_place",
      "single_leg_running_man",
    ]);
  });

  it("contains all four strength screens and preserves their non-blocking boundary", () => {
    expect(tests.strengthScreens).toHaveLength(4);
    expect(
      tests.strengthScreens.every((screen) => screen.targetRepetitions === 20),
    ).toBe(true);
    expect(tests.strengthRule).toContain("does not independently block return");
  });

  it("records the expert-consensus evidence level and clinical boundary", () => {
    expect(tests.evidenceBoundary.classification).toContain("Level 4");
    expect(tests.evidenceBoundary.limitations).toContain(
      "ComeBack must not convert a camera result into medical clearance.",
    );
  });

  it("preserves the complete symptom screen", () => {
    expect(tests.symptomStops.map((symptom) => symptom.code)).toEqual([
      "urinary_or_faecal_incontinence",
      "urinary_or_faecal_urgency",
      "pelvic_pressure_or_dragging",
      "unexpected_vaginal_bleeding",
      "pain_with_intercourse",
      "obstructive_defecation",
      "abdominal_wall_concern",
      "lumbopelvic_pain",
    ]);
  });
});
