import { expect, test } from "@playwright/test";

async function openDemo(page: import("@playwright/test").Page) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const name = `Nourin ${suffix}`;
  const response = await page.request.post(
    "http://127.0.0.1:10000/api/auth/register/player",
    {
      data: {
        email: `nourin-${suffix}@example.com`,
        password: "PlayerPass2026!",
        name,
        deliveryDate: "2026-06-04",
        deliveryType: "caesarean",
        cricketRole: "bowler",
        language: "en",
        clinicianId: "clinician-maya-demo",
        consent: true,
      },
    },
  );
  expect(response.status()).toBe(201);
  const session = await response.json();
  await page.goto("/");
  await expect(page).toHaveTitle(/ComeBack/);
  await page.evaluate((value) => {
    localStorage.setItem("comeback:player:auth", JSON.stringify(value));
  }, session);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: `Welcome back, ${name}` }),
  ).toBeVisible();
  return { name, playerId: session.user.id as string };
}

test("player completes the guided journey and clinician approval advances the stage", async ({
  page,
  context,
}) => {
  const demo = await openDemo(page);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await page.getByRole("button", { name: /Camera-guided check-in/ }).click();
  await expect(
    page.getByRole("heading", { name: "Set up safely" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Open private camera/ }).click();
  await expect(
    page.getByRole("heading", { name: "Movement check-in" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Single-leg balance/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/Measurements describe movement only/),
  ).toBeVisible();
  await page.getByRole("button", { name: /Continue to symptoms/ }).click();
  await expect(
    page.getByRole("heading", { name: "How did that feel?" }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(8);
  await page
    .getByRole("button", { name: /Save symptom-free check-in/ })
    .click();
  await expect(
    page.getByRole("heading", { name: `Thank you, ${demo.name}` }),
  ).toBeVisible();
  await expect(page.getByText("Your stage has not advanced.")).toBeVisible();

  const clinician = await context.newPage();
  await clinician.goto("/clinician");
  await clinician
    .getByRole("button", { name: /Open fictional clinician demo/ })
    .click();
  await clinician.locator(`[data-player-id="${demo.playerId}"]`).click();
  await expect(
    clinician.getByRole("heading", { name: demo.name }),
  ).toBeVisible();
  await clinician.getByRole("button", { name: /Approve next stage/ }).click();
  await expect(
    clinician.getByText(new RegExp(`${demo.name} is now in Review`)),
  ).toBeVisible();

  await page.getByRole("button", { name: /Back to today/ }).click();
  await expect(page.locator(".stage-card h2")).toHaveText("Review", {
    timeout: 12_000,
  });
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("completed player journey reloads offline from IndexedDB and service worker cache", async ({
  page,
  context,
}) => {
  const demo = await openDemo(page);
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration?.active);
  });
  await page.waitForTimeout(800);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: `Welcome back, ${demo.name}` }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: `Welcome back, ${demo.name}` }),
  ).toBeVisible();
  await expect(page.getByText("Offline ready")).toBeVisible();
});

test("reported symptoms create a clinician hold and prevent approval", async ({
  page,
}) => {
  const demo = await openDemo(page);
  await page.getByRole("button", { name: /Camera-guided check-in/ }).click();
  await page.getByRole("button", { name: /Open private camera/ }).click();
  await page.getByRole("button", { name: /Continue to symptoms/ }).click();
  await page.getByRole("checkbox").first().check();
  await expect(
    page.getByText(/Pause this stage and contact your care team/),
  ).toBeVisible();
  const savedCheckIn = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/tests") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Save and request review/ }).click();
  expect((await savedCheckIn).status()).toBe(201);
  await page.goto("/clinician");
  await page
    .getByRole("button", { name: /Open fictional clinician demo/ })
    .click();
  await page.locator(`[data-player-id="${demo.playerId}"]`).click();
  await expect(page.getByText("1 reported")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Approve next stage/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Hold current stage/ }).click();
  await expect(page.getByText(/Ready stage remains on hold/)).toBeVisible();
});

test("new player can complete consent registration without the demo shortcut", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await page.getByLabel("First name").fill("Asha");
  await page.getByLabel("Delivery date").fill("2026-07-01");
  await page.getByLabel("Delivery type").selectOption("caesarean");
  await page.getByLabel("Cricket role").selectOption("bowler");
  await page.getByLabel("Email address").fill(`asha-${Date.now()}@example.com`);
  await page.getByLabel("Create password").fill("AshaPlayer2026!");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Create player account/ }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back, Asha" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(page.getByText("caesarean", { exact: true })).toBeVisible();
  await expect(page.getByText("bowler", { exact: true })).toBeVisible();
});

test("player can complete the core flow in Bengali with grounded AI guardrails", async ({
  page,
}) => {
  const demo = await openDemo(page);
  await page.getByLabel("Language").selectOption("bn");
  await expect(
    page.getByRole("heading", { name: `স্বাগতম, ${demo.name}` }),
  ).toBeVisible();
  await page
    .getByPlaceholder("এই ধাপ সম্পর্কে জিজ্ঞাসা করুন")
    .fill("আমি কি খেলতে নিরাপদ?");
  await page.getByRole("button", { name: "জিজ্ঞাসা করুন" }).click();
  await expect(page.getByText(/আমি চিকিৎসাগত ছাড়পত্র দিতে/)).toBeVisible();
  await page.getByRole("button", { name: /ক্যামেরা-নির্দেশিত চেক-ইন/ }).click();
  await expect(
    page.getByRole("heading", { name: "নিরাপদভাবে প্রস্তুত হোন" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /ব্যক্তিগত ক্যামেরা খুলুন/ }).click();
  await page.getByRole("button", { name: /উপসর্গে এগিয়ে যান/ }).click();
  await page
    .getByRole("button", { name: /উপসর্গহীন চেক-ইন সংরক্ষণ করুন/ })
    .click();
  await expect(
    page.getByRole("heading", { name: `ধন্যবাদ, ${demo.name}` }),
  ).toBeVisible();
});

test("linked player and clinician can chat, receive notifications, and sign out", async ({
  page,
  context,
}) => {
  const demo = await openDemo(page);
  await page.getByRole("button", { name: "Support", exact: true }).click();
  const playerChat = page.getByRole("region", {
    name: /Chat with Dr\. Maya Rahman/,
  });
  await playerChat
    .getByRole("textbox", { name: "Write a message" })
    .fill("Could you review my next movement check-in?");
  const playerMessage = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/messages") &&
      response.request().method() === "POST",
  );
  await playerChat.getByRole("button", { name: "Send message" }).click();
  expect((await playerMessage).status()).toBe(201);

  const clinician = await context.newPage();
  await clinician.goto("/clinician");
  await clinician
    .getByRole("button", { name: /Open fictional clinician demo/ })
    .click();
  await clinician.locator(`[data-player-id="${demo.playerId}"]`).click();
  const clinicianChat = clinician.getByRole("region", {
    name: `Chat with ${demo.name}`,
  });
  await expect(
    clinicianChat.getByText("Could you review my next movement check-in?"),
  ).toBeVisible();
  await clinicianChat
    .getByRole("textbox", { name: "Write a message" })
    .fill("Yes — I will review it after you save the check-in.");
  await clinicianChat.getByRole("button", { name: "Send message" }).click();
  await expect(
    clinicianChat.getByText(
      "Yes — I will review it after you save the check-in.",
    ),
  ).toBeVisible();

  await expect(
    page.getByText("Yes — I will review it after you save the check-in."),
  ).toBeVisible({ timeout: 8_000 });
  await expect(
    page.getByRole("button", { name: /Notifications, \d+ unread/ }),
  ).toBeVisible({ timeout: 12_000 });
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /A private path/ }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});
