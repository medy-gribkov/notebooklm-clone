"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { theme } = useTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [locale, setLocale] = useState("en");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    // Read current locale from cookie
    const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/);
    if (match) setLocale(match[1]);
  }, []);

  function handleLocaleChange(newLocale: string) {
    setLocale(newLocale);
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    router.refresh();
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/login";
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 sm:px-6 py-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-xs">{tc("back")}</span>
            </Button>
          </Link>
          <h1 className="text-sm font-semibold">{t("title")}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-8">
        {/* Profile */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("profile")}
          </h2>
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("email")}</span>
              <span className="text-sm font-medium">{email ?? "..."}</span>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("appearance")}
          </h2>
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("theme")}</p>
                <p className="text-xs text-muted-foreground">
                  {theme === "dark" ? t("themeDark") : t("themeLight")}
                </p>
              </div>
              <ThemeToggle />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("language")}</p>
                  <p className="text-xs text-muted-foreground">
                    {locale === "he" ? t("hebrew") : t("english")}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleLocaleChange("en")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      locale === "en"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {t("english")}
                  </button>
                  <button
                    onClick={() => handleLocaleChange("he")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      locale === "he"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {t("hebrew")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("account")}
          </h2>
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("signOut")}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="text-xs">
                {tc("signOut")}
              </Button>
            </div>

            <div className="border-t pt-4">
              {confirmDelete ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                  <p className="text-sm font-medium text-destructive">{t("deleteAccountConfirm")}</p>
                  <p className="text-xs text-muted-foreground">{t("deleteAccountNote")}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs"
                    >
                      {tc("cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="text-xs"
                    >
                      {deleting ? tc("loading") : tc("delete")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-destructive">{t("deleteAccount")}</p>
                    <p className="text-xs text-muted-foreground">{t("deleteAccountNote")}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
                    {t("deleteAccount")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
