// @vitest-environment jsdom
import "../components/setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock child components
vi.mock("@/components/chat-interface", () => ({
  ChatInterface: (props: Record<string, unknown>) => (
    <div data-testid="chat-interface" data-notebook-id={props.notebookId} />
  ),
}));

vi.mock("@/components/sources-panel", () => ({
  SourcesPanel: () => <div data-testid="sources-panel" />,
}));

vi.mock("@/components/studio-panel", () => ({
  StudioPanel: () => <div data-testid="studio-panel" />,
}));

vi.mock("@/components/share-dialog", () => ({
  ShareDialog: ({ open }: { open: boolean }) => (
    open ? <div data-testid="share-dialog" /> : null
  ),
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("@/components/language-toggle", () => ({
  LanguageToggle: () => <div data-testid="language-toggle" />,
}));

vi.mock("@/components/company-logo", () => ({
  CompanyLogo: ({ name }: { name: string }) => <div data-testid="company-logo">{name}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}));

import { NotebookLayout } from "@/components/notebook-layout";
import type { NotebookFile, Message } from "@/types";

const defaultFiles: NotebookFile[] = [
  { id: "f1", notebook_id: "nb-1", user_id: "u1", file_name: "test.pdf", storage_path: "path/test.pdf", status: "ready", page_count: 5, created_at: "" },
];

const defaultMessages: Message[] = [];

describe("NotebookLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header with notebook title and back link", () => {
    render(
      <NotebookLayout
        notebookId="nb-1"
        notebookTitle="Test Notebook"
        notebookFiles={defaultFiles}
        initialMessages={defaultMessages}
      />
    );

    expect(screen.getByText("Test Notebook")).toBeInTheDocument();
    const backLink = screen.getByRole("link");
    expect(backLink).toHaveAttribute("href", "/dashboard");
  });

  it("shows company logo when companyName is provided", () => {
    render(
      <NotebookLayout
        notebookId="nb-1"
        notebookTitle="Test"
        notebookFiles={defaultFiles}
        initialMessages={defaultMessages}
        companyName="Acme Corp"
        companyDomain="acme.com"
      />
    );

    expect(screen.getByTestId("company-logo")).toHaveTextContent("Acme Corp");
  });

  it("does not show company logo when companyName is absent", () => {
    render(
      <NotebookLayout
        notebookId="nb-1"
        notebookTitle="Test"
        notebookFiles={defaultFiles}
        initialMessages={defaultMessages}
      />
    );

    expect(screen.queryByTestId("company-logo")).not.toBeInTheDocument();
  });

  it("title edit: double-click shows input, Enter saves", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(
      <NotebookLayout
        notebookId="nb-1"
        notebookTitle="Original Title"
        notebookFiles={defaultFiles}
        initialMessages={defaultMessages}
      />
    );

    const titleEl = screen.getByText("Original Title");
    fireEvent.doubleClick(titleEl);

    const input = screen.getByDisplayValue("Original Title");
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "New Title" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notebooks/nb-1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    expect(screen.getByText("New Title")).toBeInTheDocument();
  });

  it("share button opens ShareDialog", () => {
    render(
      <NotebookLayout
        notebookId="nb-1"
        notebookTitle="Test"
        notebookFiles={defaultFiles}
        initialMessages={defaultMessages}
      />
    );

    expect(screen.queryByTestId("share-dialog")).not.toBeInTheDocument();

    const shareBtn = screen.getByLabelText("title");
    fireEvent.click(shareBtn);

    expect(screen.getByTestId("share-dialog")).toBeInTheDocument();
  });

  it("renders mobile nav buttons", () => {
    render(
      <NotebookLayout
        notebookId="nb-1"
        notebookTitle="Test"
        notebookFiles={defaultFiles}
        initialMessages={defaultMessages}
      />
    );

    // "sources" and "studio" appear both in desktop toggles and mobile nav.
    // Use getAllByText to verify at least one exists (mobile nav).
    expect(screen.getAllByText("sources").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("chat").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("studio").length).toBeGreaterThanOrEqual(1);
  });
});
