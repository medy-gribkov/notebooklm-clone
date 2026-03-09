// @vitest-environment jsdom
import "../components/setup";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "@/components/logo";

describe("Logo", () => {
  it("renders DocChat text by default", () => {
    render(<Logo />);
    expect(screen.getByText("Doc")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("hides text when showText is false", () => {
    render(<Logo showText={false} />);
    expect(screen.queryByText("Doc")).not.toBeInTheDocument();
    expect(screen.queryByText("Chat")).not.toBeInTheDocument();
  });

  it("renders SVG icon", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("applies sm size class", () => {
    const { container } = render(<Logo size="sm" />);
    const wrapper = container.querySelector(".relative");
    expect(wrapper?.className).toContain("h-6 w-6");
  });

  it("applies lg size class", () => {
    const { container } = render(<Logo size="lg" />);
    const wrapper = container.querySelector(".relative");
    expect(wrapper?.className).toContain("h-10 w-10");
  });

  it("applies md size class by default", () => {
    const { container } = render(<Logo />);
    const wrapper = container.querySelector(".relative");
    expect(wrapper?.className).toContain("h-8 w-8");
  });
});
