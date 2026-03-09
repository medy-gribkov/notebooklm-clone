import { test, expect } from "@playwright/test";

test.describe("Notebook detail", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    // Notebook pages require authentication. Server-side proxy.ts validates the session.
    // Without real Supabase credentials, we verify the auth redirect works.
    await page.goto("/notebook/nb-test-1");

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
