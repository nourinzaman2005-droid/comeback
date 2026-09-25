import { describe, expect, it } from "vitest";
import { fill, UI_COPY } from "../lib/i18n/ui";

describe("UI copy", () => {
  const english = Object.keys(UI_COPY.en).sort();

  it.each(["bn", "hi", "ur"] as const)(
    "%s defines every English key with non-empty text",
    (language) => {
      const copy = UI_COPY[language];
      expect(Object.keys(copy).sort()).toEqual(english);
      for (const value of Object.values(copy))
        expect(value.trim()).not.toBe("");
    },
  );

  it("keeps the same placeholders in every translation", () => {
    const placeholders = (value: string) =>
      (value.match(/\{\w+\}/g) ?? []).sort();
    for (const language of ["bn", "hi", "ur"] as const) {
      for (const key of english as (keyof typeof UI_COPY.en)[]) {
        expect(placeholders(UI_COPY[language][key])).toEqual(
          placeholders(UI_COPY.en[key]),
        );
      }
    }
  });

  it("fills placeholders", () => {
    expect(fill(UI_COPY.en.stageOf, { n: 2, total: 6 })).toBe("Stage 2 of 6");
  });
});
