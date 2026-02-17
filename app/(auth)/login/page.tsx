"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const authFailed = searchParams.get("error") === "auth_failed";

  async function handleGitHub() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError("GitHub sign-in failed. Please try email instead.");
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    setSent(false);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-zinc-900 p-12 text-white">
        <div className="flex items-center gap-2">
          <BookIcon />
          <span className="text-lg font-semibold tracking-tight">DocChat</span>
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Chat with any PDF.<br />Get answers instantly.
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Upload a research paper, contract, or report. Ask questions in plain
            English. DocChat reads your document and answers with cited sources.
          </p>
          <div className="space-y-3 text-sm text-zinc-400">
            <Feature text="Answers grounded in your document — not the internet" />
            <Feature text="Full chat history saved across sessions" />
            <Feature text="Your files are private and only accessible to you" />
          </div>
        </div>
        <p className="text-xs text-zinc-600">
          Powered by Gemini AI and pgvector
        </p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center">
            <BookIcon className="text-zinc-900 dark:text-white" />
            <span className="text-xl font-semibold tracking-tight">DocChat</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Sign in to your account
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              New here? Signing in creates your account automatically.
            </p>
          </div>

          {authFailed && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
              <p className="text-sm text-red-700 dark:text-red-400">
                Sign-in failed. Please try again or use email instead.
              </p>
            </div>
          )}

          {sent ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 dark:border-green-800 dark:bg-green-950">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Check your inbox
                </p>
                <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                  We sent a sign-in link to <strong>{email}</strong>. Click it to
                  continue. The link expires in 1 hour.
                </p>
              </div>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline underline-offset-2"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={handleGitHub}
                disabled={loading}
              >
                <GitHubIcon />
                Continue with GitHub
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-200 dark:border-zinc-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-zinc-50 dark:bg-zinc-950 px-3 text-zinc-400">
                    or sign in with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !email}>
                  {loading ? "Sending..." : "Email me a sign-in link"}
                </Button>
                <p className="text-xs text-center text-zinc-400">
                  No password needed. We&apos;ll email you a one-click sign-in link.
                </p>
              </form>

              {error && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="text-sm text-center text-red-600 dark:text-red-400"
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span>{text}</span>
    </div>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={`h-6 w-6 ${className ?? "text-white"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
