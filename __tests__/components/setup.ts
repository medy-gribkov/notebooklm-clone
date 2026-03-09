import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

// Mock next-intl. Stable function reference to avoid infinite re-render loops
// when components use `t` in useEffect dependency arrays.
const stableT = (key: string, values?: Record<string, string>) => {
  if (values) {
    return Object.entries(values).reduce(
      (str, [k, v]) => str.replace(`{${k}}`, v),
      key,
    );
  }
  return key;
};
vi.mock("next-intl", () => ({
  useTranslations: () => stableT,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement("a", { href, ...props }, children),
}));

// Mock next/dynamic - return a lazy-like component that renders null by default.
// Individual test files should mock the actual imported modules instead (e.g., @/components/markdown-renderer).
vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = () => null;
    Stub.displayName = "DynamicStub";
    return Stub;
  },
}));

// Mock scrollTo (not available in jsdom)
Element.prototype.scrollTo = vi.fn();

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(""),
  },
});

// Mock fetch globally
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
});
