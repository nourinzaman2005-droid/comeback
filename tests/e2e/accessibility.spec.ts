import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("player and clinician entry screens have no automatic accessibility violations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A private path/ }),
  ).toBeVisible();
  const authentication = await new AxeBuilder({ page }).analyze();
  expect(authentication.violations).toEqual([]);

  await page.getByRole("button", { name: /2-minute player demo/ }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
  await page.waitForTimeout(600);
  const player = await new AxeBuilder({ page }).analyze();
  expect(player.violations).toEqual([]);

  await page.goto("/clinician");
  await expect(
    page.getByRole("heading", { name: /Clinical decisions/ }),
  ).toBeVisible();
  const clinician = await new AxeBuilder({ page }).analyze();
  expect(clinician.violations).toEqual([]);
});
