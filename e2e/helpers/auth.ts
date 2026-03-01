import type { Page } from "@playwright/test";

/**
 * Set fake Supabase auth cookies so proxy.ts treats the request as authenticated.
 * proxy.ts checks for a cookie matching /sb-.*-auth-token/.
 */
export async function loginAsTestUser(page: Page) {
  // Set a fake Supabase auth token cookie
  await page.context().addCookies([
    {
      name: "sb-localhost-auth-token",
      value: JSON.stringify({
        access_token: "fake-access-token",
        refresh_token: "fake-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: "user-test-1",
          email: "test@example.com",
        },
      }),
      url: "http://localhost:3000/"
    },
  ]);

  // Intercept Supabase auth.getUser() calls to return a valid user
  await page.route("**/auth/v1/user", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-test-1",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: { full_name: "Test User" },
        aud: "authenticated",
        created_at: "2025-01-01T00:00:00Z",
      }),
    });
  });
}
