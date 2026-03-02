// @vitest-environment jsdom
import "../components/setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mock") },
}));

import { ShareDialog } from "@/components/share-dialog";

describe("ShareDialog", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ links: [] }),
    });
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <ShareDialog notebookId="nb-1" open={false} onClose={onClose} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders dialog when open is true", () => {
    render(<ShareDialog notebookId="nb-1" open={true} onClose={onClose} />);
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("shows permission toggles (view and chat)", () => {
    render(<ShareDialog notebookId="nb-1" open={true} onClose={onClose} />);
    expect(screen.getByText("viewOnly")).toBeInTheDocument();
    expect(screen.getByText("viewAndChat")).toBeInTheDocument();
  });

  it("shows expiry options", () => {
    render(<ShareDialog notebookId="nb-1" open={true} onClose={onClose} />);
    expect(screen.getByText("expireNever")).toBeInTheDocument();
    expect(screen.getByText("expire7")).toBeInTheDocument();
    expect(screen.getByText("expire30")).toBeInTheDocument();
  });

  it("shows create link button", () => {
    render(<ShareDialog notebookId="nb-1" open={true} onClose={onClose} />);
    expect(screen.getByText("createLink")).toBeInTheDocument();
  });

  it("shows loading state while fetching links", () => {
    // Make fetch hang (never resolve) so loading stays true
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    render(<ShareDialog notebookId="nb-1" open={true} onClose={onClose} />);
    // The spinner has animate-spin class
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
