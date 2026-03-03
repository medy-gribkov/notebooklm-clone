"use client";

import { useState, useCallback, memo } from "react";

interface CompanyLogoProps {
  /** Domain like "wix.com" or full URL */
  domain?: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Use eager loading (for above-the-fold logos) */
  eager?: boolean;
}

const SIZES = {
  sm: { box: "h-6 w-6", text: "text-[9px]", px: 24 },
  md: { box: "h-8 w-8", text: "text-xs", px: 32 },
  lg: { box: "h-10 w-10", text: "text-sm", px: 40 },
} as const;

function extractDomain(input: string): string {
  try {
    const url = input.startsWith("http") ? input : `https://${input}`;
    return new URL(url).hostname;
  } catch {
    return input;
  }
}

/** Favicon size param (closest to our display size) */
function faviconSize(px: number): number {
  if (px <= 24) return 32;
  if (px <= 32) return 64;
  return 128;
}

function CompanyLogoInner({ domain, name, size = "md", className = "", eager = false }: CompanyLogoProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Ref callback: fires when img element mounts. Catches images that loaded before React attaches onLoad.
  const imgRefCallback = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth > 1) {
      setLoaded(true);
    }
  }, []);

  const { box, text, px } = SIZES[size];
  const host = domain ? extractDomain(domain) : "";

  const letter = (
    <div
      className={`${box} rounded-lg bg-primary/90 shadow-sm flex items-center justify-center text-primary-foreground font-bold ${text} ${loaded ? "opacity-0" : "opacity-100"} transition-opacity duration-200 absolute inset-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );

  if (!host || failed) {
    return (
      <div className={`${box} relative shrink-0 ${className}`}>
        <div
          className={`${box} rounded-lg bg-primary/90 shadow-sm flex items-center justify-center text-primary-foreground font-bold ${text}`}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      </div>
    );
  }

  const src = `/api/logo?domain=${host}&sz=${faviconSize(px)}`;

  return (
    <div className={`${box} relative shrink-0 ${className}`}>
      {letter}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRefCallback}
        src={src}
        alt={name}
        width={px}
        height={px}
        className={`${box} rounded-lg bg-white/90 p-0.5 shadow-sm absolute inset-0 object-contain ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-200`}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "auto" : "low"}
        onLoad={(e) => {
          // If the proxy returned a 1x1 transparent PNG (failed), keep the letter
          const img = e.currentTarget;
          if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
            setFailed(true);
          } else {
            setLoaded(true);
          }
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export const CompanyLogo = memo(CompanyLogoInner);
