import type { Page } from "@playwright/test";
import notebooks from "../fixtures/notebooks.json";
import notebookDetail from "../fixtures/notebook-detail.json";
import sharedData from "../fixtures/shared-data.json";

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
