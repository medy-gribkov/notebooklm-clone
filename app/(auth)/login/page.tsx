"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
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
    <div className="flex min-h-screen">
      {/* Left panel with animated gradient */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.35_0.2_275)] via-[oklch(0.25_0.15_290)] to-[oklch(0.18_0.12_260)] animate-gradient" />

        {/* Floating decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[15%] left-[10%] h-64 w-64 rounded-full bg-[oklch(0.5_0.2_275_/_0.1)] blur-3xl animate-float" />
          <div className="absolute bottom-[20%] right-[15%] h-48 w-48 rounded-full bg-[oklch(0.6_0.18_290_/_0.08)] blur-3xl animate-float [animation-delay:1.5s]" />
          <div className="absolute top-[50%] left-[50%] h-32 w-32 rounded-full bg-[oklch(0.7_0.15_260_/_0.06)] blur-2xl animate-float [animation-delay:3s]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
              <DocIcon className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">DocChat</span>
          </div>

          <div className="space-y-8 max-w-lg">
            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight animate-slide-up">
              Chat with any PDF.
              <br />
              <span className="bg-gradient-to-r from-white via-[oklch(0.85_0.1_275)] to-[oklch(0.75_0.15_290)] bg-clip-text text-transparent">
                Get answers instantly.
              </span>
            </h1>
            <p className="text-lg leading-relaxed text-white/60 animate-slide-up [animation-delay:100ms]">
              Upload a research paper, contract, or report. Ask questions in plain
              English. DocChat reads your document and answers with cited sources.
            </p>

            <div className="space-y-4 animate-slide-up [animation-delay:200ms]">
              <FeatureCard
                icon={<TargetIcon />}
                title="Grounded answers"
                description="Every response comes from your document, not the internet"
              />
              <FeatureCard
                icon={<HistoryIcon />}
                title="Persistent history"
                description="Full chat history saved across sessions"
              />
              <FeatureCard
                icon={<ShieldIcon />}
                title="Private and secure"
                description="Your files are encrypted and only accessible to you"
              />
            </div>
          </div>

          <p className="text-xs text-white/30">
            Powered by Gemini AI, LangChain, and pgvector
          </p>
        </div>
      </div>

      {/* Right panel, auth form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <DocIcon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-semibold tracking-tight">DocChat</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Sign in to your account
            </h2>
            <p className="text-sm text-muted-foreground">
              New here? Signing in creates your account automatically.
            </p>
          </div>

          {authFailed && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-sm text-destructive">
                Sign-in failed. Please try again or use email instead.
              </p>
            </div>
          )}

          {sent ? (
            <div className="space-y-4 animate-slide-up">
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10">
                    <CheckIcon className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      Check your inbox
                    </p>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                      We sent a sign-in link to <strong>{email}</strong>. Click it to
                      continue. The link expires in 1 hour.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <Button
                className="w-full h-11 gap-2.5 font-medium"
                variant="outline"
                onClick={handleGitHub}
                disabled={loading}
              >
                <GitHubIcon />
                Continue with GitHub
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">
                    or sign in with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium"
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
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 font-medium" disabled={loading || !email}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner />
                      Sending...
                    </span>
                  ) : (
                    "Email me a sign-in link"
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  No password needed. We&apos;ll email you a one-click sign-in link.
                </p>
              </form>

              {error && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="text-sm text-center text-destructive"
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

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white/[0.06] backdrop-blur-sm p-3.5 border border-white/[0.06]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-white/90">{title}</p>
        <p className="text-xs text-white/50 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-5 w-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="6" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="2" strokeWidth={1.5} />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
