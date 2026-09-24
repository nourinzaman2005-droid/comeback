import { describe, expect, it } from "vitest";
import guideline from "../content/guidelines/icc-2026.json";

describe("ICC guideline content", () => {
  it("contains all six stages in order", () => {
    expect(guideline.stages.map((stage) => stage.id)).toEqual([
      "ready",
      "review",
      "restore",
      "recondition",
      "return",
      "refine",
    ]);
  });

  it("gives every stage a precise source reference", () => {
    for (const stage of guideline.stages) {
      expect(stage.reference.pdfPage).toBeGreaterThan(0);
      expect(stage.reference.documentPage).toBeTruthy();
      expect(stage.reference.section).toContain(stage.label);
    }
  });

  it("does not represent the ICC framework as an automated clearance protocol", () => {
    expect(guideline.scope.limitations).toContain(
      "The document does not provide a complete automated medical-clearance algorithm.",
    );
  });
});
