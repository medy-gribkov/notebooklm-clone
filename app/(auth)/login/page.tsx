"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

type AuthMode = "signin" | "signup";

function LoginContent() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [signUpDone, setSignUpDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const authFailed = searchParams.get("error") === "auth_failed";
  const t = useTranslations("login");

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
      setError(t("githubFailed"));
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(t("googleFailed"));
      setLoading(false);
    }
  }

  async function handlePasswordAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError(t("passwordMismatch"));
        return;
      }
      if (password.length < 8) {
        setError(t("passwordTooShort"));
        return;
      }
    }

    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setSignUpDone(true);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard");
        return;
      }
    }
    setLoading(false);
  }

  async function handleMagicLink() {
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

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
    setPassword("");
    setConfirmPassword("");
    setSent(false);
    setSignUpDone(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - theme-adaptive */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Light mode gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#F0F0EB] via-[#EBDBBC] to-[#D4A27F] dark:from-[#191919] dark:via-[#262625] dark:to-[#40403E] animate-gradient" />

        {/* Floating decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[15%] left-[10%] h-64 w-64 rounded-full bg-[#CC785C]/10 dark:bg-[#CC785C]/5 blur-3xl animate-float" />
          <div className="absolute bottom-[20%] right-[15%] h-48 w-48 rounded-full bg-[#CC785C]/8 dark:bg-[#D4A27F]/5 blur-3xl animate-float [animation-delay:1.5s]" />
          <div className="absolute top-[50%] left-[50%] h-32 w-32 rounded-full bg-[#EBDBBC]/30 dark:bg-[#40403E]/20 blur-2xl animate-float [animation-delay:3s]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-8 text-foreground dark:text-white w-full h-screen overflow-hidden">
          <Logo size="md" />

          <div className="space-y-5 max-w-lg">
            <h1 className="text-display text-4xl animate-slide-up">
              {t("heroTitle1")}
              <br />
              <span className="bg-gradient-to-r from-[#CC785C] via-[#D4A27F] to-[#EBDBBC] dark:from-[#FAFAF7] dark:via-[#EBDBBC] dark:to-[#D4A27F] bg-clip-text text-transparent">
                {t("heroTitle2")}
              </span>
            </h1>
            <p className="text-body leading-relaxed text-muted-foreground dark:text-white/60 animate-slide-up [animation-delay:100ms]">
              {t("heroDescription")}
            </p>

            <div className="space-y-2.5 animate-slide-up [animation-delay:200ms]">
              <FeatureCard
                icon={<TargetIcon />}
                title={t("feature1Title")}
                description={t("feature1Desc")}
              />
              <FeatureCard
                icon={<HistoryIcon />}
                title={t("feature2Title")}
                description={t("feature2Desc")}
              />
              <FeatureCard
                icon={<ShieldIcon />}
                title={t("feature3Title")}
                description={t("feature3Desc")}
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-caption opacity-50">
              {t("poweredBy")}
            </p>
            <p className="text-caption opacity-30">
              Built by{" "}
              <a href="https://mahdygribkov.vercel.app" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-60 transition-opacity">
                Mahdy Gribkov
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - auth form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 bg-background relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-4">
            <Logo size="lg" />
          </div>

          <div className="space-y-2">
            <h2 className="text-display">
              {mode === "signin" ? t("title") : t("signUpTitle")}
            </h2>
            <p className="text-body text-muted-foreground">
              {mode === "signin" ? (
                <>
                  {t("noAccount")}{" "}
                  <button onClick={switchMode} className="text-primary font-medium hover:underline underline-offset-2">
                    {t("signUpLink")}
                  </button>
                </>
              ) : (
                <>
                  {t("haveAccount")}{" "}
                  <button onClick={switchMode} className="text-primary font-medium hover:underline underline-offset-2">
                    {t("signInLink")}
                  </button>
                </>
              )}
            </p>
          </div>

          {authFailed && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-sm text-destructive">
                {t("authFailed")}
              </p>
            </div>
          )}

          {signUpDone ? (
            <div className="space-y-4 animate-slide-up">
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <CheckIcon className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t("signUpSuccess")}
                    </p>
                    <p className="mt-1 text-sm text-primary">
                      {email}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setSignUpDone(false); setMode("signin"); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                {t("signInLink")}
              </button>
            </div>
          ) : sent ? (
            <div className="space-y-4 animate-slide-up">
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <CheckIcon className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t("checkInbox")}
                    </p>
                    <p className="mt-1 text-sm text-primary">
                      {t("linkSentTo", { email })}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                {t("differentEmail")}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* OAuth providers */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="h-11 gap-2 font-medium"
                  variant="outline"
                  onClick={handleGoogle}
                  disabled={loading}
                >
                  <GoogleIcon />
                  {t("googleButton")}
                </Button>
                <Button
                  className="h-11 gap-2 font-medium"
                  variant="outline"
                  onClick={handleGitHub}
                  disabled={loading}
                >
                  <GitHubIcon />
                  {t("githubButton")}
                </Button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">
                    {t("orDivider")}
                  </span>
                </div>
              </div>

              {/* Email + Password form */}
              <form onSubmit={handlePasswordAuth} className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium">
                    {t("emailLabel")}
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium">
                      {t("passwordLabel")}
                    </label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={handleMagicLink}
                        disabled={loading || !email}
                        className="text-xs text-primary hover:underline underline-offset-2 disabled:opacity-50"
                      >
                        {t("forgotPassword")}
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="h-11"
                  />
                </div>

                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <label htmlFor="confirm-password" className="text-sm font-medium">
                      {t("confirmPasswordLabel")}
                    </label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder={t("confirmPasswordPlaceholder")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="h-11"
                    />
                    <p className="text-caption">
                      {t("passwordRequirements")}
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 font-medium" disabled={loading || !email || !password}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner />
                      {mode === "signin" ? t("signingIn") : t("creatingAccount")}
                    </span>
                  ) : (
                    mode === "signin" ? t("signInButton") : t("signUpButton")
                  )}
                </Button>
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
    <div className="flex items-start gap-3 rounded-xl bg-primary/5 dark:bg-white/[0.06] backdrop-blur-sm p-2.5 border border-primary/10 dark:border-white/[0.06]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-white/10">
        {icon}
      </div>
      <div>
        <p className="text-body font-medium text-foreground dark:text-white/90">{title}</p>
        <p className="text-caption mt-0.5 dark:text-white/50">{description}</p>
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


function TargetIcon() {
  return (
    <svg className="h-4 w-4 text-primary/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="6" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="2" strokeWidth={1.5} />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="h-4 w-4 text-primary/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4 text-primary/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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
