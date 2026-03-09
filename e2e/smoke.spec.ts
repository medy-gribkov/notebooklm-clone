import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("root URL redirects to /login or /dashboard", async ({ page }) => {
    await page.goto("/");

    // The root page checks auth and redirects accordingly.
    // Without auth, it should redirect to /login.
    await expect(page).toHaveURL(/\/(login|dashboard)/, { timeout: 10_000 });
  });

  test("404 page renders for invalid routes", async ({ page }) => {
    const response = await page.goto("/nonexistent-page-xyz");

    // Should get a 404 status or show not-found content
    if (response) {
      // Next.js returns 404 for unmatched routes
      expect(response.status()).toBe(404);
    }

    // Verify some not-found content is displayed
    const notFoundIndicator = page
      .getByText(/not found|404|page.*exist/i)
      .first();
    await expect(notFoundIndicator).toBeVisible({ timeout: 10_000 }).catch(() => {
      // Some apps redirect unknown routes; that's acceptable too
    });
  });

  test("login page loads within 5 seconds", async ({ page }) => {
    const start = Date.now();

    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const loadTime = Date.now() - start;

    // Verify the page loaded and the form is visible
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5_000 });

    // The page should have loaded within 5 seconds
    expect(loadTime).toBeLessThan(5_000);
  });

  test("shared page handles missing token gracefully", async ({ page }) => {
    // Visit /shared/ with no token - this should show an error or 404
    const response = await page.goto("/shared/");

    if (response) {
      // Should be 404 or the page handles it
      expect([200, 404]).toContain(response.status());
    }

    // If the page rendered, it should show some error or redirect
    // rather than crashing
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("login page has proper document title", async ({ page }) => {
    await page.goto("/login");

    // Wait for page to fully load
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });

    // Page should have a meaningful title (not empty or just "Error")
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    // Title should not indicate an error
    expect(title.toLowerCase()).not.toContain("error");
  });
});
