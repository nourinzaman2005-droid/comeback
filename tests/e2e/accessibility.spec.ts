import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("player and clinician entry screens have no automatic accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Feel supported/ })).toBeVisible();
  const onboarding = await new AxeBuilder({ page }).analyze();
  expect(onboarding.violations).toEqual([]);

  await page.getByRole("button", { name: /Try the 2-minute demo/ }).click();
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  await page.waitForTimeout(600);
  const player = await new AxeBuilder({ page }).analyze();
  expect(player.violations).toEqual([]);

  await page.goto("/clinician");
  const clinician = await new AxeBuilder({ page }).analyze();
  expect(clinician.violations).toEqual([]);
});
