import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("login page has sign-up toggle", async ({ page }) => {
    await page.goto("/login");

    // The login page has a "Sign up" link/button to switch to sign-up mode
    const signUpLink = page.getByRole("button", { name: /sign up/i }).first();
    await expect(signUpLink).toBeVisible({ timeout: 10_000 });

    // Click to switch to sign-up mode
    await signUpLink.click();

    // In sign-up mode, a "confirm password" field should appear
    await expect(page.locator("#confirm-password")).toBeVisible({ timeout: 5_000 });

    // Should be able to switch back to sign-in
    const signInLink = page.getByRole("button", { name: /sign in/i }).first();
    await expect(signInLink).toBeVisible();
  });

  test("login page form has correct input types", async ({ page }) => {
    await page.goto("/login");

    // Email input should have type="email"
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("required", "");

    // Password input should have type="password"
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(passwordInput).toHaveAttribute("required", "");

    // Email input should have autocomplete="email"
    await expect(emailInput).toHaveAttribute("autocomplete", "email");
  });

  test("login page submit button is disabled when fields are empty", async ({ page }) => {
    await page.goto("/login");

    // Wait for the form to render
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });

    // The submit button should be disabled when email and password are empty
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();

    // Fill only email - button should still be disabled (password empty)
    await page.locator('input[type="email"]').fill("test@example.com");
    await expect(submitButton).toBeDisabled();

    // Fill password too - button should become enabled
    await page.locator('input[type="password"]').fill("password123");
    await expect(submitButton).toBeEnabled();
  });
});
