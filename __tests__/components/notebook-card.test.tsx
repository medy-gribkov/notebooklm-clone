// @vitest-environment jsdom
import "../components/setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("@/components/company-logo", () => ({
  CompanyLogo: ({ domain, name }: { domain: string; name: string }) =>
    React.createElement("div", { "data-testid": "company-logo", "data-domain": domain }, name),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => React.createElement("button", { onClick, disabled }, children),
}));

import { NotebookCard } from "@/components/notebook-card";
import type { Notebook, NotebookFile } from "@/types";

const baseNotebook: Notebook = {
  id: "nb-1",
  user_id: "u1",
  title: "Machine Learning Basics",
  status: "ready",
  description: null,
  file_url: null,
  page_count: null,
  created_at: "2025-01-01T00:00:00Z",
};

const sampleFiles: NotebookFile[] = [
  {
    id: "f1",
    notebook_id: "nb-1",
    user_id: "u1",
    file_name: "doc1.pdf",
    storage_path: "u1/doc1.pdf",
    status: "ready",
    page_count: 5,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "f2",
    notebook_id: "nb-1",
    user_id: "u1",
    file_name: "doc2.pdf",
    storage_path: "u1/doc2.pdf",
    status: "ready",
    page_count: 3,
    created_at: "2025-01-01T00:00:00Z",
  },
];

const onDelete = vi.fn();

describe("NotebookCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders notebook title", () => {
    render(<NotebookCard notebook={baseNotebook} onDelete={onDelete} />);
    expect(screen.getByText("Machine Learning Basics")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <NotebookCard
        notebook={baseNotebook}
        onDelete={onDelete}
        description="A guide to ML fundamentals"
      />
    );
    expect(screen.getByText("A guide to ML fundamentals")).toBeInTheDocument();
  });

  it("renders processing status", () => {
    const nb = { ...baseNotebook, status: "processing" as const };
    render(<NotebookCard notebook={nb} onDelete={onDelete} />);
    expect(screen.getByText("processing")).toBeInTheDocument();
  });

  it("renders error status", () => {
    const nb = { ...baseNotebook, status: "error" as const };
    render(<NotebookCard notebook={nb} onDelete={onDelete} />);
    expect(screen.getByText("failed")).toBeInTheDocument();
  });

  it("renders timed out status", () => {
    const nb = { ...baseNotebook, status: "processing" as const };
    render(<NotebookCard notebook={nb} timedOut={true} onDelete={onDelete} />);
    expect(screen.getByText("timedOut")).toBeInTheDocument();
  });

  it("renders file count badge", () => {
    render(
      <NotebookCard notebook={baseNotebook} files={sampleFiles} onDelete={onDelete} />
    );
    // t("sources", { count: 2 }) -> stableT replaces {count} with "2"
    expect(screen.getByText("sources")).toBeInTheDocument();
  });

  it("shows company logo when companyDomain is provided", () => {
    render(
      <NotebookCard
        notebook={baseNotebook}
        onDelete={onDelete}
        companyDomain="example.com"
      />
    );
    expect(screen.getByTestId("company-logo")).toBeInTheDocument();
    expect(screen.getByTestId("company-logo")).toHaveAttribute("data-domain", "example.com");
  });

  it("shows first letter icon when no companyDomain", () => {
    render(<NotebookCard notebook={baseNotebook} onDelete={onDelete} />);
    // First character of title uppercased
    expect(screen.getByText("M")).toBeInTheDocument();
  });
});
