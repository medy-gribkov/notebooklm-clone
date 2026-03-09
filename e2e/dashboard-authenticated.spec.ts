import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";
import { mockNotebooksApi, mockEmptyNotebooksApi } from "./helpers/mock-api";

/**
 * Dashboard E2E tests.
 *
 * proxy.ts checks for sb-*-auth-token cookies. loginAsTestUser sets a fake
 * cookie that passes the proxy check but NOT the real Supabase session
 * validation on the server side. So authenticated page renders may redirect
 * back to /login. These tests verify mock setup and cookie mechanics.
 *
 * page.route() mocks only intercept browser-initiated requests (navigations,
 * fetch). page.request.get() bypasses them and hits the real server.
 * To test mock responses we navigate to a page and intercept from there.
 */
test.describe("Dashboard (authenticated)", () => {
  test("loginAsTestUser sets auth cookie and intercepts auth endpoint", async ({ page }) => {
    await loginAsTestUser(page);

    // Verify the cookie was set
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name.includes("auth-token"));
    expect(authCookie).toBeDefined();
    expect(authCookie!.value).toContain("fake-access-token");
  });

  test("mockNotebooksApi intercepts browser fetch with fixture data", async ({ page }) => {
    await mockNotebooksApi(page);

    // Navigate to login (a page that renders without auth) to establish context
    await page.goto("/login");

    // Use page.evaluate to make a browser-side fetch (which page.route intercepts)
    const body = await page.evaluate(async () => {
      const res = await fetch("/api/notebooks");
      return res.json();
    });

    expect(body.notebooks).toHaveLength(2);
    expect(body.notebooks[0].title).toBe("Machine Learning Basics");
    expect(body.notebooks[1].title).toBe("React Patterns");
    expect(body.notebooks[1].status).toBe("processing");
  });

  test("mockEmptyNotebooksApi intercepts browser fetch with empty list", async ({ page }) => {
    await mockEmptyNotebooksApi(page);

    await page.goto("/login");

    const body = await page.evaluate(async () => {
      const res = await fetch("/api/notebooks");
      return res.json();
    });

    expect(body.notebooks).toHaveLength(0);
  });

  test("unauthenticated dashboard visit redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
