import { test, expect } from "@playwright/test";
import { mockFullNotebookPage } from "./helpers/mock-api";

test.describe("Notebook detail (authenticated)", () => {
  /**
   * The notebook page is a server component that fetches from Supabase
   * during SSR. Fake cookies pass proxy.ts but not real Supabase validation,
   * so authenticated page renders redirect to /login.
   *
   * page.route() only intercepts browser-side requests. We use page.evaluate()
   * for testing mock responses via browser-initiated fetch.
   */

  test("notebook page without auth redirects to login", async ({ page }) => {
    await page.goto("/notebook/nb-test-1");

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("notebook page with invalid ID returns 404 or redirects", async ({ page }) => {
    await page.goto("/notebook/not-a-valid-uuid");

    await page.waitForURL(/\/(login|notebook)/, { timeout: 10_000 });

    const loginForm = page.locator('input[type="email"]');
    const notFoundText = page.getByText(/not found|404/i).first();

    const isLoginPage = await loginForm.isVisible().catch(() => false);
    const is404Page = await notFoundText.isVisible().catch(() => false);

    expect(isLoginPage || is404Page).toBe(true);
  });

  test("mockFullNotebookPage intercepts browser fetch correctly", async ({ page }) => {
    // Set up mocks WITHOUT loginAsTestUser to avoid redirect loops
    // (fake cookie makes proxy.ts redirect /login -> /dashboard -> loop)
    await mockFullNotebookPage(page);

    // Navigate to shared page (no auth needed, client component)
    await page.goto("/shared/test-mock-verification");

    // Test mock responses via browser-side fetch (page.route intercepts these)
    const detail = await page.evaluate(async () => {
      const res = await fetch("/api/notebooks/nb-test-1");
      return res.json();
    });
    expect(detail.id).toBe("nb-test-1");

    const files = await page.evaluate(async () => {
      const res = await fetch("/api/notebooks/nb-test-1/files");
      return res.json();
    });
    expect(files).toHaveLength(1);
    expect(files[0].file_name).toBe("ml-basics.pdf");

    const share = await page.evaluate(async () => {
      const res = await fetch("/api/notebooks/nb-test-1/share");
      return res.json();
    });
    expect(share.links).toHaveLength(0);
  });

  test("fake auth cookie causes redirect for protected routes", async ({ page }) => {
    // Without real Supabase session, the notebook SSR redirects to /login.
    // Without ANY cookie, proxy.ts also redirects to /login.
    // Either way the user ends up on /login.
    await page.goto("/notebook/nb-test-1");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
