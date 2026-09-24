import { describe, expect, it } from "vitest";
import {
  groundedFallback,
  isClearanceRequest,
  validateExplanation,
} from "../lib/ai/explanation";

describe("grounded stage explanations", () => {
  it("refuses medical clearance questions in every supported language", () => {
    expect(isClearanceRequest("Am I cleared to play?" )).toBe(true);
    expect(isClearanceRequest("আমি কি খেলতে নিরাপদ?" )).toBe(true);
    expect(isClearanceRequest("क्या खेलना सुरक्षित है?" )).toBe(true);
    expect(isClearanceRequest("کیا کھیلنا محفوظ ہے؟" )).toBe(true);
  });

  it("keeps the requested stage and a source citation", () => {
    const result = groundedFallback("Restore", "en");
    expect(result.stage).toBe("Restore");
    expect(result.citations[0]).toMatch(/ICC Return to Play/);
    expect(result.source).toBe("grounded-fallback");
  });

  it("provides a Bengali fallback without changing stage", () => {
    const result = groundedFallback("Restore", "bn");
    expect(result.summary).toMatch(/[\u0980-\u09FF]/);
    expect(result.safetyNote).toMatch(/[\u0980-\u09FF]/);
    expect(result.stage).toBe("Restore");
  });

  it("rejects generated output with a changed stage or invented citation", () => {
    const valid = {
      stage: "Restore",
      summary: "Summary",
      nextStep: "Next",
      safetyNote: "Safety",
      citations: ["allowed"],
    };
    expect(validateExplanation(valid, "Restore", "allowed")).toBe(true);
    expect(validateExplanation({ ...valid, stage: "Return" }, "Restore", "allowed")).toBe(false);
    expect(validateExplanation({ ...valid, citations: ["invented"] }, "Restore", "allowed")).toBe(false);
  });
});
