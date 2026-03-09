import type { Page } from "@playwright/test";
import notebooks from "../fixtures/notebooks.json";
import notebookDetail from "../fixtures/notebook-detail.json";
import sharedData from "../fixtures/shared-data.json";
import notebookFiles from "../fixtures/notebook-files.json";
import notebookMessages from "../fixtures/notebook-messages.json";

/** Mock GET /api/notebooks to return fixture data */
export async function mockNotebooksApi(page: Page) {
  await page.route("**/api/notebooks*", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notebooks,
          sharedNotebooks: [],
          filesByNotebook: {},
          companyByNotebook: {},
        }),
      });
    }
    return route.continue();
  });
}

/** Mock GET /api/notebooks to return empty list */
export async function mockEmptyNotebooksApi(page: Page) {
  await page.route("**/api/notebooks*", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notebooks: [],
          sharedNotebooks: [],
          filesByNotebook: {},
          companyByNotebook: {},
        }),
      });
    }
    return route.continue();
  });
}

/** Mock notebook detail page server-side data by intercepting Supabase REST calls */
export async function mockNotebookDetailApi(page: Page) {
  // Mock the notebook API for polling
  await page.route("**/api/notebooks/nb-test-1*", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(notebookDetail.notebook),
      });
    }
    return route.continue();
  });
}

/** Mock notebook files API */
export async function mockNotebookFilesApi(page: Page) {
  await page.route("**/api/notebooks/nb-test-1/files*", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(notebookFiles),
      });
    }
    return route.continue();
  });
}

/** Mock messages API */
export async function mockMessagesApi(page: Page) {
  await page.route("**/api/messages*", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(notebookMessages),
    });
  });
}

/** Mock notebook detail with all sub-APIs for full page render */
export async function mockFullNotebookPage(page: Page) {
  await mockNotebookDetailApi(page);
  await mockNotebookFilesApi(page);
  await mockMessagesApi(page);
  // Mock share API
  await page.route("**/api/notebooks/nb-test-1/share*", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ links: [] }),
    });
  });
  // Mock studio/generations
  await page.route("**/api/notebooks/nb-test-1/generations*", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
  // Mock notes
  await page.route("**/api/notebooks/nb-test-1/notes*", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

/** Mock GET /api/shared/[token] with valid data */
export async function mockSharedApi(page: Page, token: string) {
  await page.route(`**/api/shared/${token}`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sharedData),
    });
  });
}

/** Mock GET /api/shared/[token] with 404 */
export async function mockSharedApi404(page: Page, token: string) {
  await page.route(`**/api/shared/${token}`, (route) => {
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "Share link not found or expired" }),
    });
  });
}

/** Mock shared page with chat permissions */
export async function mockSharedChatApi(page: Page, token: string) {
  const chatData = { ...sharedData, permissions: "chat" };
  await page.route(`**/api/shared/${token}`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(chatData),
    });
  });
}

/** Mock shared page with company info */
export async function mockSharedWithCompanyApi(page: Page, token: string) {
  const companyData = {
    ...sharedData,
    company: {
      name: "Acme Corp",
      website: "acme.com",
      category: "Technology",
    },
  };
  await page.route(`**/api/shared/${token}`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(companyData),
    });
  });
}

/** Mock shared page with notes */
export async function mockSharedWithNotesApi(page: Page, token: string) {
  const notesData = {
    ...sharedData,
    notes: [
      {
        id: "note-1",
        title: "Key Takeaways",
        content: "Important findings from the research documents.",
        created_at: "2025-01-01T00:03:00Z",
      },
    ],
  };
  await page.route(`**/api/shared/${token}`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(notesData),
    });
  });
}
