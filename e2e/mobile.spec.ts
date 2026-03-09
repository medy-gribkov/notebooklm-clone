import { test, expect } from "@playwright/test";
import { mockSharedChatApi } from "./helpers/mock-api";

test.describe("Mobile responsiveness", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test("login page is usable at mobile width", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Sign in heading should be visible
    await expect(page.getByText("Sign in to your account")).toBeVisible({ timeout: 15_000 });

    // Form elements should be usable
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByText("Sign in", { exact: true })).toBeVisible();
  });

  test("shared page is usable at mobile width", async ({ page }) => {
    await mockSharedChatApi(page, "mobile-token");
    await page.goto("/shared/mobile-token");
    await page.waitForLoadState("networkidle");

    // Chat input should be visible
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 15_000 });

    // Send button should be visible
    const sendBtn = page.getByRole("button", { name: /send/i });
    await expect(sendBtn).toBeVisible();
  });
});
