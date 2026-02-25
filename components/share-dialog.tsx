"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";

interface ShareLink {
  id: string;
  token: string;
  permissions: "view" | "chat";
  expires_at: string | null;
  created_at: string;
}

interface ShareDialogProps {
  notebookId: string;
  open: boolean;
  onClose: () => void;
}

export function ShareDialog({ notebookId, open, onClose }: ShareDialogProps) {
  const t = useTranslations("share");
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [permission, setPermission] = useState<"view" | "chat">("view");
  const [expiry, setExpiry] = useState<number | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/share`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links ?? []);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [notebookId]);

  useEffect(() => {
    if (open) {
      fetchLinks();
      setError(null);
    }
  }, [open, fetchLinks]);

  async function createLink() {
    setCreating(true);
    setError(null);
    try {
      const body: { permissions: string; expiresInDays?: number } = { permissions: permission };
      if (expiry) body.expiresInDays = expiry;

      const res = await fetch(`/api/notebooks/${notebookId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setLinks((prev) => [data.link, ...prev]);
      } else if (res.status === 429) {
        setError(t("chatLimit"));
      } else {
        setError(t("createFailed"));
      }
    } catch {
      setError(t("createFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function revokeLink(token: string) {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.token !== token));
      }
    } catch {
      // Silent
    }
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/shared/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Clipboard not available
    }
  }

  async function toggleQR(token: string) {
    if (qrToken === token) {
      setQrToken(null);
      setQrDataUrl(null);
      return;
    }
    const url = `${window.location.origin}/shared/${token}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
    setQrToken(token);
    setQrDataUrl(dataUrl);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative bg-background border rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md max-h-[85vh] overflow-hidden animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-sm font-semibold">{t("title")}</h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Create new link */}
          <div className="px-5 py-4 border-b space-y-3">
            {/* Permission selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setPermission("view")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium border transition-all ${permission === "view"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent border-transparent"
                  }`}
              >
                <svg className="h-3.5 w-3.5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {t("viewOnly")}
              </button>
              <button
                onClick={() => setPermission("chat")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium border transition-all ${permission === "chat"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent border-transparent"
                  }`}
              >
                <svg className="h-3.5 w-3.5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {t("viewAndChat")}
              </button>
            </div>

            {/* Expiry selector */}
            <div className="flex gap-1.5">
              {[
                { value: null, label: t("expireNever") },
                { value: 7, label: t("expire7") },
                { value: 30, label: t("expire30") },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setExpiry(opt.value)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${expiry === opt.value
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Create button */}
            <button
              onClick={createLink}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {creating ? (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
              {t("createLink")}
            </button>

            {error && (
              <p className="text-[11px] text-destructive">{error}</p>
            )}
          </div>

          {/* Active links list */}
          <div className="px-5 py-3 overflow-y-auto max-h-[300px] scrollbar-thin">
            <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {t("activeLinks")}
            </h3>

            {loading ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : links.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-4">{t("noLinks")}</p>
            ) : (
              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="relative flex items-center gap-2 rounded-lg border p-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${link.permissions === "chat"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                          }`}>
                          {link.permissions === "chat" ? t("viewAndChat") : t("viewOnly")}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1" suppressHydrationWarning>
                        {link.expires_at
                          ? t("expires", { date: new Date(link.expires_at).toLocaleDateString() })
                          : t("noExpiry")}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleQR(link.token)}
                      className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-md transition-colors ${qrToken === link.token ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                      aria-label="QR Code"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm14 3h.01M17 14h.01M14 17h.01M14 14h3v3h-3v-3zm3 3h3v3h-3v-3z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => copyLink(link.token)}
                      className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      aria-label={t("copyLink")}
                    >
                      {copiedToken === link.token ? (
                        <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => revokeLink(link.token)}
                      className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={t("revoke")}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {qrToken === link.token && qrDataUrl && (
                      <div className="absolute top-full left-0 right-0 mt-1 flex justify-center">
                        <div className="bg-white rounded-lg p-2 shadow-lg border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={qrDataUrl} alt="QR Code" width={200} height={200} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
