import { test, expect } from "@playwright/test";
import {
  mockSharedApi,
  mockSharedChatApi,
  mockSharedWithCompanyApi,
  mockSharedWithNotesApi,
} from "./helpers/mock-api";

test.describe("Shared notebook (extended)", () => {
  test("shared page with chat permissions shows chat input", async ({ page }) => {
    await mockSharedChatApi(page, "chat-token");

    await page.goto("/shared/chat-token");

    // Wait for page to load
    await expect(page.getByText("Shared Notebook")).toBeVisible({ timeout: 10_000 });

    // "Chat enabled" badge should be visible for chat permission
    await expect(page.getByText("Chat enabled")).toBeVisible();

    // Chat input should be present (input or textarea)
    const chatInput = page.locator('input[type="text"], textarea').first();
    await expect(chatInput).toBeVisible();

    // Send button should be present
    const sendButton = page.getByRole("button", { name: /send/i });
    await expect(sendButton).toBeVisible();
  });

  test("shared page with view permissions hides chat input", async ({ page }) => {
    await mockSharedApi(page, "view-token");

    await page.goto("/shared/view-token");

    // Wait for page to load
    await expect(page.getByText("Shared Notebook")).toBeVisible({ timeout: 10_000 });

    // View-only banner should be visible
    await expect(page.getByText(/view-only/i)).toBeVisible();

    // Chat input should NOT be visible in view-only mode
    // The form with text input is only rendered when permissions === "chat"
    const chatForm = page.locator('form input[type="text"]');
    await expect(chatForm).not.toBeVisible();
  });

  test("shared page shows company info when available", async ({ page }) => {
    await mockSharedWithCompanyApi(page, "company-token");

    await page.goto("/shared/company-token");

    // Wait for page to load - the title comes from the fixture
    await expect(page.getByText("Shared Notebook")).toBeVisible({ timeout: 10_000 });

    // Company name should be visible in the header or hero section
    await expect(page.getByText("Acme Corp").first()).toBeVisible({ timeout: 5_000 });

    // Company category badge should be visible in the hero section
    // The page renders category in a <span> badge and/or sidebar <p>
    const categoryBadge = page.locator("text=Technology").first();
    await expect(categoryBadge).toBeVisible({ timeout: 5_000 });
  });

  test("shared page displays notes tab and content when notes exist", async ({ page }) => {
    await mockSharedWithNotesApi(page, "notes-token");

    await page.goto("/shared/notes-token");

    // Wait for page to load
    await expect(page.getByText("Shared Notebook")).toBeVisible({ timeout: 10_000 });

    // Notes tab should show count
    const notesTab = page.getByText(/Notes/);
    await expect(notesTab.first()).toBeVisible();

    // Click on the Notes tab
    const notesButton = page.locator("button").filter({ hasText: /Notes/ }).first();
    await notesButton.click();

    // Note content should be visible after clicking the tab
    await expect(page.getByText("Key Takeaways")).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("Important findings from the research documents.")
    ).toBeVisible();
  });
});
