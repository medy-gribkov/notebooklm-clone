import { test, expect } from "@playwright/test";
import { mockSharedApi, mockSharedApi404 } from "./helpers/mock-api";

test.describe("Shared notebook", () => {
  test("valid share token renders notebook title and messages", async ({ page }) => {
    await mockSharedApi(page, "valid-test-token");

    await page.goto("/shared/valid-test-token");

    // Wait for shared content to load
    await expect(page.getByText("Shared Notebook")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Here is what I found in the documents.")).toBeVisible();
  });

  test("invalid share token shows error state", async ({ page }) => {
    await mockSharedApi404(page, "invalid-token-abc");

    await page.goto("/shared/invalid-token-abc");

    // Should show some error indication (expired, not found, etc.)
    await expect(
      page.getByText(/not found|expired|invalid|error/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
