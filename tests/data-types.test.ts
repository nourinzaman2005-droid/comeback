import { describe, expect, it } from "vitest";
import { nextStage, STAGES } from "../lib/data/types";

describe("clinician stage decisions", () => {
  it("advances through each 6 Rs stage in order", () => {
    expect(STAGES.map(nextStage)).toEqual([
      "Review",
      "Restore",
      "Recondition",
      "Return",
      "Refine",
      "Refine",
    ]);
  });

  it("does not advance beyond Refine", () => {
    expect(nextStage("Refine")).toBe("Refine");
  });
});
