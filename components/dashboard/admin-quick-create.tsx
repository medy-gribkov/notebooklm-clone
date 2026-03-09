"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/featured-notebooks";
import { Button } from "@/components/ui/button";

interface AdminQuickCreateProps {
  userId: string;
}

interface GenerateResult {
  notebookId: string;
  shareToken: string | null;
  shareUrl: string | null;
}

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c !== "All");

export function AdminQuickCreate({ userId }: AdminQuickCreateProps) {
  const [expanded, setExpanded] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState<string>(CATEGORY_OPTIONS[0]);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  if (!adminId || userId !== adminId) return null;

  async function handleGenerate() {
    if (!companyName.trim() || !website.trim()) return;

    setGenerating(true);
    setStatus("Creating notebook and generating content...");
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          website: website.trim(),
          category,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const data: GenerateResult = await res.json();
      setResult(data);
      setStatus("Done!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setStatus(null);
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!result?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(result.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  function handleReset() {
    setCompanyName("");
    setWebsite("");
    setResult(null);
    setStatus(null);
    setError(null);
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] overflow-hidden animate-fade-in">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-primary hover:bg-primary/[0.05] transition-colors min-h-[44px]"
      >
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Quick Create Company Notebook
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-primary/10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            <div>
              <label htmlFor="admin-company" className="text-xs font-medium text-muted-foreground mb-1 block">
                Company Name
              </label>
              <input
                id="admin-company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Stripe"
                disabled={generating}
                className="w-full h-10 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="admin-website" className="text-xs font-medium text-muted-foreground mb-1 block">
                Website
              </label>
              <input
                id="admin-website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g. stripe.com"
                disabled={generating}
                className="w-full h-10 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="admin-category" className="text-xs font-medium text-muted-foreground mb-1 block">
                Category
              </label>
              <select
                id="admin-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={generating}
                className="w-full h-10 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={generating || !companyName.trim() || !website.trim()}
              className="rounded-lg shadow-md shadow-primary/20"
            >
              {generating ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </Button>

            {status && !error && (
              <span className="text-xs text-muted-foreground animate-fade-in">{status}</span>
            )}
            {error && (
              <span className="text-xs text-destructive animate-fade-in">{error}</span>
            )}
          </div>

          {result && (
            <div className="rounded-lg border bg-card p-3 space-y-2 animate-slide-up">
              <p className="text-sm font-medium text-foreground">
                Notebook created for {companyName}
              </p>
              {result.shareUrl && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={result.shareUrl}
                    className="flex-1 h-9 rounded-md border bg-muted/30 px-3 text-xs font-mono truncate"
                  />
                  <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 h-9">
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/notebook/${result.notebookId}`, "_blank")}
                  className="h-9"
                >
                  Open Notebook
                </Button>
                {result.shareUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(result.shareUrl!, "_blank")}
                    className="h-9"
                  >
                    Open Share Link
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={handleReset} className="h-9 ms-auto">
                  Create Another
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
