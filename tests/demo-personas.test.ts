import { describe, expect, it } from "vitest";
import personas from "../content/demo-personas.json";

describe("demo personas", () => {
  it("contains distinct player stories and an explicit fictional-data notice", () => {
    expect(personas.personas.length).toBeGreaterThanOrEqual(2);
    expect(new Set(personas.personas.map((persona) => persona.id)).size).toBe(
      personas.personas.length,
    );
    expect(personas.notice).toMatch(/Fictional demonstration data/);
  });
});
