import { NextRequest, NextResponse } from "next/server";

/** 1x1 transparent PNG (67 bytes). Returned when all providers fail. */
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB" +
    "Nl7BcQAAAABJRU5ErkJggg==",
  "base64"
);

const SUCCESS_CACHE = {
  "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
  "Content-Type": "image/png",
};

const FAILURE_CACHE = {
  "Cache-Control": "public, max-age=300",
  "Content-Type": "image/png",
};

function extractDomain(input: string): string {
  try {
    const url = input.startsWith("http") ? input : `https://${input}`;
    return new URL(url).hostname;
  } catch {
    return input;
  }
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  const sz = request.nextUrl.searchParams.get("sz") || "64";

  if (!domain) {
    return new NextResponse(TRANSPARENT_PNG, {
      status: 400,
      headers: { "Content-Type": "image/png" },
    });
  }

  const host = extractDomain(domain);

  // Try Google Favicon API first
  try {
    const googleUrl = `https://www.google.com/s2/favicons?domain=${host}&sz=${sz}`;
    const res = await fetchWithTimeout(googleUrl, 2000);
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "image/png";
      const buf = Buffer.from(await res.arrayBuffer());
      // Google returns a default globe icon (~70 bytes) for unknown domains.
      // Real favicons are typically >100 bytes.
      if (buf.length > 100) {
        return new NextResponse(buf, {
          headers: { ...SUCCESS_CACHE, "Content-Type": contentType },
        });
      }
    }
  } catch (e) {
    console.error(`[logo] Google failed for ${host}:`, e instanceof Error ? e.message : e);
  }

  // Fallback: DuckDuckGo icon service (free, no auth, reliable)
  try {
    const ddgUrl = `https://icons.duckduckgo.com/ip3/${host}.ico`;
    const res = await fetchWithTimeout(ddgUrl, 2000);
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "image/x-icon";
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 100) {
        return new NextResponse(buf, {
          headers: { ...SUCCESS_CACHE, "Content-Type": contentType },
        });
      }
    }
  } catch (e) {
    console.error(`[logo] DuckDuckGo failed for ${host}:`, e instanceof Error ? e.message : e);
  }

  // Total failure: return transparent PNG with short cache so browser retries soon
  return new NextResponse(TRANSPARENT_PNG, {
    headers: FAILURE_CACHE,
  });
}
