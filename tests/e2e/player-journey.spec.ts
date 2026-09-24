import { expect, test } from "@playwright/test";

async function openDemo(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page).toHaveTitle(/ComeBack/);
  await expect(
    page.getByRole("heading", { name: "Feel supported from your first step back." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Try the 2-minute demo/ }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back, Nourin" }),
  ).toBeVisible();
}

test("player completes the guided journey and clinician approval advances the stage", async ({
  page,
  context,
}) => {
  await openDemo(page);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await page.getByRole("button", { name: /Camera-guided check-in/ }).click();
  await expect(page.getByRole("heading", { name: "Set up safely" })).toBeVisible();
  await page.getByRole("button", { name: /Open private camera/ }).click();
  await expect(page.getByRole("heading", { name: "Movement check-in" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Single-leg balance/ })).toBeVisible();
  await expect(page.getByText(/Measurements describe movement only/)).toBeVisible();
  await page.getByRole("button", { name: /Continue to symptoms/ }).click();
  await expect(page.getByRole("heading", { name: "How did that feel?" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(8);
  await page.getByRole("button", { name: /Save symptom-free check-in/ }).click();
  await expect(page.getByRole("heading", { name: "Thank you, Nourin" })).toBeVisible();
  await expect(page.getByText("Your stage has not advanced.")).toBeVisible();

  const clinician = await context.newPage();
  await clinician.goto("/clinician");
  await expect(clinician.getByRole("heading", { name: "Nourin" })).toBeVisible();
  await clinician.getByRole("button", { name: /Approve next stage/ }).click();
  await expect(clinician.getByText(/Nourin is now in Recondition/)).toBeVisible();

  await page.getByRole("button", { name: /Back to today/ }).click();
  await expect(page.locator(".stage-card h3")).toHaveText("Recondition");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("completed player journey reloads offline from IndexedDB and service worker cache", async ({
  page,
  context,
}) => {
  await openDemo(page);
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration?.active);
  });
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome back, Nourin" })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome back, Nourin" })).toBeVisible();
  await expect(page.getByText("Offline ready")).toBeVisible();
});

test("reported symptoms create a clinician hold and prevent approval", async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole("button", { name: /Camera-guided check-in/ }).click();
  await page.getByRole("button", { name: /Open private camera/ }).click();
  await page.getByRole("button", { name: /Continue to symptoms/ }).click();
  await page.getByRole("checkbox").first().check();
  await expect(page.getByText(/Pause this stage and contact your care team/)).toBeVisible();
  await page.getByRole("button", { name: /Save and request review/ }).click();
  await page.getByRole("link", { name: /Open clinician demo/ }).click();
  await expect(page.getByText("1 reported")).toBeVisible();
  await expect(page.getByRole("button", { name: /Approve next stage/ })).toBeDisabled();
  await page.getByRole("button", { name: /Hold current stage/ }).click();
  await expect(page.getByText(/Restore stage remains on hold/)).toBeVisible();
});

test("new player can complete consent onboarding without the demo shortcut", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Set up my journey/ }).click();
  await page.getByLabel("First name").fill("Asha");
  await page.getByLabel("Delivery date").fill("2026-07-01");
  await page.getByLabel("Delivery type").selectOption("caesarean");
  await page.getByLabel("Cricket role").selectOption("bowler");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /I understand and consent/ }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Asha" })).toBeVisible();
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(page.getByText("caesarean", { exact: true })).toBeVisible();
  await expect(page.getByText("bowler", { exact: true })).toBeVisible();
});
