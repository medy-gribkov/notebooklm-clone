import { test, expect } from "@playwright/test";
import { mockSharedApi404 } from "./helpers/mock-api";

test.describe("Error states", () => {
  test("shared page with expired/invalid token shows error", async ({ page }) => {
    await mockSharedApi404(page, "expired-token");
    await page.goto("/shared/expired-token");

    // Should show error message
    await expect(page.getByText("Share link not found or expired")).toBeVisible({ timeout: 10_000 });
    // Should show sign up link
    await expect(page.getByText("Sign up for full access")).toBeVisible();
  });

  test("shared page shows fallback error on fetch failure", async ({ page }) => {
    await page.route("**/api/shared/bad-token", (route) => {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/shared/bad-token");
    await expect(page.getByText("Failed to load shared notebook")).toBeVisible({ timeout: 10_000 });
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    const res = await page.goto("/this-route-does-not-exist");
    expect(res?.status()).toBe(404);
  });
});
