import { test, expect } from "@playwright/test";
import { mockSharedChatApi } from "./helpers/mock-api";

test.describe("Shared notebook chat interaction", () => {
  test("can type in chat input and submit", async ({ page }) => {
    await mockSharedChatApi(page, "chat-flow-token");

    // Mock the chat endpoint to return a streaming response
    await page.route("**/api/shared/chat-flow-token/chat", (route) => {
      const body = '0:"Hello from the AI assistant!"\n';
      return route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        body,
      });
    });

    await page.goto("/shared/chat-flow-token");
    await page.waitForLoadState("networkidle");

    // Chat input should be present
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    // Type a message and submit
    await input.fill("What is this document about?");
    const sendBtn = page.getByRole("button", { name: /send/i });
    await sendBtn.click();

    // User message should appear
    await expect(page.getByText("What is this document about?")).toBeVisible({ timeout: 5_000 });
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    await mockSharedChatApi(page, "empty-input-token");
    await page.goto("/shared/empty-input-token");
    await page.waitForLoadState("networkidle");

    const sendBtn = page.getByRole("button", { name: /send/i });
    await expect(sendBtn).toBeDisabled();
  });

  test("shows category-specific starters for Cybersecurity", async ({ page }) => {
    await page.route("**/api/shared/cyber-token", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notebook: { id: "nb-1", title: "CyberCo Analysis", description: null, created_at: "2025-01-01T00:00:00Z" },
          permissions: "chat",
          messages: [],
          notes: [],
          generations: [],
          company: { name: "CyberCo", website: "cyberco.com", category: "Cybersecurity" },
        }),
      });
    });

    await page.goto("/shared/cyber-token");
    await page.waitForLoadState("networkidle");

    // Wait for page heading
    await expect(page.getByRole("heading", { name: "CyberCo Analysis" })).toBeVisible({ timeout: 15_000 });

    // Cybersecurity-specific starters
    await expect(page.getByText("What security products or services do they offer?")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Explore their security solutions and threat intelligence")).toBeVisible();
  });
});
