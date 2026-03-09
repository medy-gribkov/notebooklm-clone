import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("unauthenticated visit to /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");

    // proxy.ts should redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("/login page renders auth form with email, password, and OAuth buttons", async ({ page }) => {
    await page.goto("/login");

    // Email and password inputs
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // OAuth buttons (Google and GitHub)
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /github/i })).toBeVisible();
  });
});
