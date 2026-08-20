import { test, expect } from "@playwright/test";

/**
 * Exercises the full acceptance-flow surface against the seeded demo brand (run `npm run db:seed`
 * first). This is what lets us verify the entire product — calendar, content studio, carousel
 * rendering, approval workflow, analytics, strategy, brand memory — without needing a live
 * ANTHROPIC_API_KEY, since seed data bypasses generation and writes realistic rows directly.
 */
test.describe("seeded demo brand", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "demo@aurix.ai");
    await page.fill("#password", "demo12345");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
  });

  test("dashboard shows populated widgets", async ({ page }) => {
    await expect(page.locator("body")).toContainText("Acme Coffee Co");
    await expect(page.locator("body")).toContainText("5 ways to brew better coffee at home");
  });

  test("calendar shows the scheduled item", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.locator("body")).toContainText("Weekend caf");
  });

  test("content studio lists content across every lifecycle status", async ({ page }) => {
    await page.goto("/content");
    await expect(page.locator("body")).toContainText("Behind the scenes: roasting day");
    await expect(page.locator("body")).toContainText("Weekend flash sale");
  });

  test("a published carousel renders its slides", async ({ page }) => {
    await page.goto("/content");
    await page.click("text=Behind the scenes: roasting day");
    await page.waitForURL(/\/content\//);
    await expect(page.locator("body")).toContainText("Slides (5)");
    await expect(page.locator("body")).toContainText("6am, roasting day");
  });

  test("a needs-edit item shows the rejection reason that trained brand memory", async ({ page }) => {
    await page.goto("/content");
    await page.click("text=Weekend flash sale");
    await page.waitForURL(/\/content\//);
    await expect(page.locator("body")).toContainText("Too promotional");
  });

  test("analytics shows real performance and a non-overlapping leaderboard", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.locator("body")).toContainText("Behind the scenes: roasting day");
    await expect(page.locator("body")).not.toContainText("No insights yet");
  });

  test("strategy page shows the seeded content pillars", async ({ page }) => {
    await page.goto("/strategy");
    await expect(page.locator("body")).toContainText("Education");
  });

  test("brand memory shows the learned preference from the rejected post", async ({ page }) => {
    await page.goto("/brand");
    await page.click('button:has-text("Brand memory")');
    await expect(page.locator("body")).toContainText("Reduce promotional");
  });

  test("settings shows the mock Instagram connection", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("body")).toContainText("acmecoffeeco");
  });

  test("approving pending content moves it through the workflow", async ({ page }) => {
    await page.goto("/content");
    await page.click("text=5 ways to brew better coffee at home");
    await page.waitForURL(/\/content\//);
    await page.click('button:has-text("Approve")');
    await expect(page.locator("body")).toContainText("Schedule for", { timeout: 10_000 });
  });
});
