// @vitest-environment jsdom
import "../components/setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Must mock next/navigation BEFORE import to override setup.ts mock
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), refresh: mockRefresh }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

import { LanguageToggle } from "@/components/language-toggle";

describe("LanguageToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset cookie
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });
  });

  it("renders with HE text when locale is en (default)", () => {
    render(<LanguageToggle />);
    expect(screen.getByText("HE")).toBeInTheDocument();
  });

  it("toggles to EN text on click", () => {
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("has accessible aria-label", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Switch language");
  });

  it("has 44px minimum touch target", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button").className).toContain("min-h-[44px]");
  });
});
