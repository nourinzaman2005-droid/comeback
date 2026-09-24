import { describe, expect, it } from "vitest";
import { nextDemoStep, previousDemoStep } from "../lib/demo-flow";

describe("demo flow", () => {
  it("moves through the guided readiness journey", () => {
    expect(nextDemoStep("home")).toBe("setup");
    expect(nextDemoStep("setup")).toBe("test");
    expect(nextDemoStep("test")).toBe("symptoms");
    expect(nextDemoStep("symptoms")).toBe("result");
  });

  it("does not move beyond either end", () => {
    expect(previousDemoStep("home")).toBe("home");
    expect(nextDemoStep("result")).toBe("result");
  });
});
