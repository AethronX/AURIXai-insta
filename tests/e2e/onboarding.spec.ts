import { test, expect } from "@playwright/test";

test.describe("registration and onboarding", () => {
  test("a new user can register, complete onboarding, and land on a populated dashboard", async ({ page }) => {
    const email = `e2e_${Date.now()}@example.com`;

    await page.goto("/register");
    await page.fill("#organizationName", "E2E Test Co");
    await page.fill("#name", "Test User");
    await page.fill("#email", email);
    await page.fill("#password", "supersecret123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/onboarding");
    await page.click("text=Guided questions");

    // Step 1: business
    await page.fill("#name", "E2E Coffee Co");
    await page.fill("#industry", "Specialty coffee");
    await page.click('button:has-text("Continue")');

    // Step 2: audience
    await page.fill("#targetCustomer", "Coffee enthusiasts");
    await page.click('button:has-text("Continue")');

    // Step 3: voice
    await page.selectOption("#primaryTone", "FRIENDLY");
    await page.click('button:has-text("Continue")');

    // Step 4: visual identity
    await page.fill("#primaryColor", "#4F46E5");
    await page.click('button:has-text("Continue")');

    // Step 5: content rules + submit
    await page.fill("#ctaStyle", "Warm and inviting");
    await page.click('button:has-text("Finish setup")');
    await page.waitForURL("**/dashboard", { timeout: 20_000 });

    await expect(page.locator("body")).toContainText("E2E Coffee Co");
  });

  test("an unauthenticated visitor is redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
  });

  test("onboarding offers a quick-AI-prompt path alongside the guided questions, and it fails cleanly without a Claude key", async ({ page }) => {
    const email = `e2e_prompt_${Date.now()}@example.com`;
    await page.goto("/register");
    await page.fill("#organizationName", "E2E Prompt Co");
    await page.fill("#name", "Test User");
    await page.fill("#email", email);
    await page.fill("#password", "supersecret123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/onboarding");

    await expect(page.locator("text=Quick AI prompt")).toBeVisible();
    await expect(page.locator("text=Guided questions")).toBeVisible();

    await page.click("text=Quick AI prompt");
    await page.fill(
      "textarea[name='description']",
      "AURIX is a website and e-commerce design studio serving businesses in Oman and the Gulf."
    );
    await page.click('button:has-text("Generate brand profile")');

    // No configured Claude key in this environment — must fail with a clear error, never
    // silently produce fake brand data or crash.
    await page.waitForSelector("text=/not configured|failed|error/i", { timeout: 20_000 });
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("attempting AI generation without a configured Claude key fails cleanly, not silently", async ({ page }) => {
    const email = `e2e_ai_${Date.now()}@example.com`;
    await page.goto("/register");
    await page.fill("#organizationName", "E2E AI Co");
    await page.fill("#name", "Test User");
    await page.fill("#email", email);
    await page.fill("#password", "supersecret123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/onboarding");
    await page.click("text=Guided questions");
    await page.fill("#name", "E2E AI Co");
    for (let i = 0; i < 4; i++) await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Finish setup")');
    await page.waitForURL("**/dashboard", { timeout: 20_000 });

    await page.goto("/content");
    await page.fill("textarea#objective", "Announce a new product");
    await page.click('button:has-text("Generate with AI")');

    // Either a real Claude key generated content (redirect to /content/:id) or it's not
    // configured and the form shows a clear error — either way, no crash and no silent no-op.
    await Promise.race([
      page.waitForURL(/\/content\/[a-z0-9]+/, { timeout: 20_000 }),
      page.waitForSelector("text=/not configured|failed|error/i", { timeout: 20_000 }),
    ]);
  });
});
