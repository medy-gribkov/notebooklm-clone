"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type AIStyle = "concise" | "balanced" | "detailed";

export default function SettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { theme } = useTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [locale, setLocale] = useState("en");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiStyle, setAIStyle] = useState<AIStyle>("balanced");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [accentHue, setAccentHue] = useState<number>(250);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      const meta = data.user?.user_metadata;
      if (meta?.ai_style && ["concise", "balanced", "detailed"].includes(meta.ai_style)) {
        setAIStyle(meta.ai_style as AIStyle);
      }
      if (typeof meta?.full_name === "string") {
        setFullName(meta.full_name);
      }
      if (typeof meta?.accent_color === "string" || typeof meta?.accent_color === "number") {
        const hue = Number(meta.accent_color);
        if ([250, 290, 350, 80, 155, 200].includes(hue)) setAccentHue(hue);
      }
      if (meta?.avatar_url) {
        if (typeof meta.avatar_url === "string" && meta.avatar_url.startsWith("http")) {
          setAvatarUrl(meta.avatar_url);
        } else if (typeof meta.avatar_url === "string") {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          setAvatarUrl(`${supabaseUrl}/storage/v1/object/public/avatars/${meta.avatar_url}`);
        }
      }
    });
    const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/);
    if (match) setLocale(match[1]);
  }, []);

  function handleLocaleChange(newLocale: string) {
    setLocale(newLocale);
    document.cookie = `locale=${newLocale};path=/;max-age=31536000;Secure;SameSite=Lax`;
    router.refresh();
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.avatar_url);
        addToast("Profile photo updated");
      } else {
        const err = await res.json().catch(() => ({}));
        addToast(err.error || "Upload failed", "error");
      }
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function handleSaveName() {
    setSavingName(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName }),
      });
      if (res.ok) {
        addToast("Profile updated");
      }
    } finally {
      setSavingName(false);
    }
  }

  async function handleAccentChange(hue: number) {
    setAccentHue(hue);
    const isDark = theme === "dark";
    const l = isDark ? "0.72" : "0.45";
    const c = isDark ? "0.16" : "0.18";
    document.documentElement.style.setProperty("--primary", `oklch(${l} ${c} ${hue})`);
    document.documentElement.style.setProperty("--ring", `oklch(${l} ${c} ${hue})`);
    localStorage.setItem("accent-hue", String(hue));
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accent_color: hue }),
      });
      addToast("Accent color updated");
    } catch {
      // Silent fail
    }
  }

  async function handleAIStyleChange(style: AIStyle) {
    setAIStyle(style);
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_style: style }),
      });
      if (res.ok) addToast("Preferences saved");
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function handleExportData() {
    setExporting(true);
    try {
      const res = await fetch("/api/user/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `docchat-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAllNotebooks() {
    setDeletingAll(true);
    try {
      const res = await fetch("/api/notebooks", { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setDeletingAll(false);
    }
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

  const aiStyles: { key: AIStyle; label: string; desc: string }[] = [
    { key: "concise", label: t("aiConcise"), desc: t("aiConciseDesc") },
    { key: "balanced", label: t("aiBalanced"), desc: t("aiBalancedDesc") },
    { key: "detailed", label: t("aiDetailed"), desc: t("aiDetailedDesc") },
  ];

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
          <h2 className="text-caption uppercase tracking-wider font-semibold">
            {t("profile")}
          </h2>
          <div className="rounded-xl border bg-card p-5 space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary overflow-hidden">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="" width={80} height={80} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    email?.[0]?.toUpperCase() ?? "?"
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  {uploadingAvatar ? (
                    <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{fullName || email || "..."}</p>
                <p className="text-xs text-muted-foreground">{email ?? "..."}</p>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-xs text-primary hover:underline"
                >
                  Upload photo
                </button>
              </div>
            </div>

            {/* Display name */}
            <div className="border-t pt-4 space-y-2">
              <label className="text-sm font-medium">Display name</label>
              <div className="flex gap-2">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="h-9 text-sm flex-1"
                  maxLength={100}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="text-xs"
                >
                  {savingName ? tc("loading") : tc("save")}
                </Button>
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("email")}</span>
                <span className="text-sm font-medium">{email ?? "..."}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="space-y-4">
          <h2 className="text-caption uppercase tracking-wider font-semibold">
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
              <div>
                <p className="text-sm font-medium">{t("accentColor")}</p>
                <p className="text-xs text-muted-foreground mb-3">{t("accentColorDesc")}</p>
                <div className="flex gap-2.5">
                  {[
                    { hue: 250, label: "Blue", color: "bg-[oklch(0.62_0.12_250)]" },
                    { hue: 290, label: "Violet", color: "bg-[oklch(0.62_0.12_290)]" },
                    { hue: 350, label: "Rose", color: "bg-[oklch(0.62_0.12_350)]" },
                    { hue: 45, label: "Amber", color: "bg-[oklch(0.62_0.12_45)]" },
                    { hue: 155, label: "Emerald", color: "bg-[oklch(0.62_0.12_155)]" },
                    { hue: 200, label: "Cyan", color: "bg-[oklch(0.62_0.12_200)]" },
                  ].map((swatch) => (
                    <button
                      key={swatch.hue}
                      onClick={() => handleAccentChange(swatch.hue)}
                      className={`h-8 w-8 rounded-full ${swatch.color} flex items-center justify-center transition-transform hover:scale-110 ${accentHue === swatch.hue ? "ring-2 ring-offset-2 ring-offset-card ring-foreground/30 scale-110" : ""
                        }`}
                      title={swatch.label}
                      aria-label={`${swatch.label} accent color`}
                    >
                      {accentHue === swatch.hue && (
                        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${locale === "en"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                  >
                    {t("english")}
                  </button>
                  <button
                    onClick={() => handleLocaleChange("he")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${locale === "he"
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

        {/* AI Preferences */}
        <section className="space-y-4">
          <h2 className="text-caption uppercase tracking-wider font-semibold">
            {t("aiPreferences")}
          </h2>
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="text-sm font-medium">{t("responseStyle")}</p>
            <div className="space-y-2">
              {aiStyles.map((style) => (
                <button
                  key={style.key}
                  onClick={() => handleAIStyleChange(style.key)}
                  disabled={savingPrefs}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${aiStyle === style.key
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent/50 border border-transparent"
                    }`}
                >
                  <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${aiStyle === style.key ? "border-primary" : "border-muted-foreground/30"
                    }`}>
                    {aiStyle === style.key && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{style.label}</p>
                    <p className="text-xs text-muted-foreground">{style.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy & Data */}
        <section className="space-y-4">
          <h2 className="text-caption uppercase tracking-wider font-semibold">
            {t("privacyData")}
          </h2>
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("privacyInfo")}
            </p>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-sm font-medium">{t("exportData")}</p>
                <p className="text-xs text-muted-foreground">{t("exportDataDesc")}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                disabled={exporting}
                className="text-xs"
              >
                {exporting ? tc("loading") : t("exportData")}
              </Button>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-sm font-medium text-destructive">{t("deleteAllNotebooks")}</p>
                <p className="text-xs text-muted-foreground">{t("deleteAllNotebooksDesc")}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingAll}
                    className="text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
                    {deletingAll ? tc("loading") : tc("delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteAllNotebooks")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("deleteAllNotebooksConfirm")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAllNotebooks} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {tc("delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="space-y-4">
          <h2 className="text-caption uppercase tracking-wider font-semibold">
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
