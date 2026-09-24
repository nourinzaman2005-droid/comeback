import { expect, test } from "@playwright/test";

test("player completes the guided readiness demo without a learning curve", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/ComeBack/);
  await expect(
    page.getByRole("heading", { name: "Good evening, Nourin" }),
  ).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );

  await page.getByRole("button", { name: /Single-leg squat/ }).click();
  await expect(
    page.getByRole("heading", { name: "Let us set you up" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Open camera/ }).click();
  await expect(
    page.getByRole("heading", { name: "Single-leg squat" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Finish demo set/ }).click();
  await expect(
    page.getByRole("heading", { name: "How did that feel?" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /See my result/ }).click();
  await expect(
    page.getByRole("heading", { name: "Beautiful work, Nourin" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your stage will not change without approval."),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("production PWA registers its local service worker", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration?.active);
  });

  const registrationScope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.scope;
  });
  expect(registrationScope).toBe("http://127.0.0.1:3000/");
});
