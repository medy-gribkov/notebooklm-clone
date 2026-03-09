// @vitest-environment jsdom
import "../components/setup";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/components/theme-toggle";

const mockToggleTheme = vi.fn();
let mockTheme = "dark";

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: mockTheme, toggleTheme: mockToggleTheme }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

describe("ThemeToggle", () => {
  it("renders with switchToLight aria-label in dark mode", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "switchToLight");
  });

  it("renders with switchToDark aria-label in light mode", () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "switchToDark");
  });

  it("calls toggleTheme on click", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockToggleTheme).toHaveBeenCalledOnce();
  });

  it("has 44px minimum touch target", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("min-h-[44px]");
    expect(btn.className).toContain("min-w-[44px]");
  });
});
