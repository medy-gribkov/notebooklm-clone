// @vitest-environment jsdom
import "../components/setup";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CompanyLogo } from "@/components/company-logo";

describe("CompanyLogo", () => {
  it("shows letter fallback when no domain", () => {
    render(<CompanyLogo name="Acme" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("shows letter fallback when domain image fails", () => {
    render(<CompanyLogo domain="test.com" name="Beta Corp" />);
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders img with correct src when domain is provided", () => {
    render(<CompanyLogo domain="example.com" name="Example" />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toContain("/api/logo?domain=example.com");
  });

  it("applies sm size classes", () => {
    const { container } = render(<CompanyLogo name="Test" size="sm" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("h-6 w-6");
  });

  it("applies lg size classes", () => {
    const { container } = render(<CompanyLogo name="Test" size="lg" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("h-10 w-10");
  });

  it("extracts hostname from full URL domain", () => {
    render(<CompanyLogo domain="https://www.example.com/path" name="Example" />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toContain("domain=www.example.com");
  });
});
