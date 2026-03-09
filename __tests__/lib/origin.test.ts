import { describe, it, expect } from "vitest";
import { getOrigin } from "@/lib/origin";

function makeRequest(host: string, proto?: string): Request {
  const headers = new Headers();
  headers.set("host", host);
  if (proto) headers.set("x-forwarded-proto", proto);
  return new Request("http://localhost:3000/test", { headers });
}

describe("getOrigin", () => {
  it("returns http for localhost without x-forwarded-proto", () => {
    expect(getOrigin(makeRequest("localhost:3000"))).toBe(
      "http://localhost:3000"
    );
  });

  it("returns http for 127.0.0.1 without x-forwarded-proto", () => {
    expect(getOrigin(makeRequest("127.0.0.1:3000"))).toBe(
      "http://127.0.0.1:3000"
    );
  });

  it("defaults to https for non-localhost when x-forwarded-proto is missing", () => {
    expect(getOrigin(makeRequest("docchat.runmydocker-app.com"))).toBe(
      "https://docchat.runmydocker-app.com"
    );
  });

  it("respects x-forwarded-proto when present", () => {
    expect(getOrigin(makeRequest("myapp.com", "http"))).toBe(
      "http://myapp.com"
    );
    expect(getOrigin(makeRequest("myapp.com", "https"))).toBe(
      "https://myapp.com"
    );
  });

  it("respects x-forwarded-proto on localhost too", () => {
    expect(getOrigin(makeRequest("localhost:3000", "https"))).toBe(
      "https://localhost:3000"
    );
  });

  it("falls back to localhost:3000 when host header is missing", () => {
    const req = new Request("http://0.0.0.0:3000/test");
    expect(getOrigin(req)).toBe("http://localhost:3000");
  });
});
