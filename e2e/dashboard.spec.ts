import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    // Dashboard requires authentication. Server-side proxy.ts validates the session.
    // Without real Supabase credentials, we verify the auth redirect works.
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
