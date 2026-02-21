import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "DocChat", template: "%s | DocChat" },
  description:
    "Upload documents. Ask questions in plain English. Get AI-powered answers with cited sources.",
  keywords: ["PDF", "chat", "AI", "RAG", "document", "research", "study", "notes"],
  authors: [{ name: "Mahdy Gribkov", url: "https://mahdygribkov.vercel.app" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "DocChat",
    description: "Upload documents. Ask questions. Get AI-powered answers with cited sources.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DocChat" }],
    siteName: "DocChat",
  },
  twitter: {
    card: "summary_large_image",
    title: "DocChat",
    description: "Upload documents. Ask questions. Get AI-powered answers with cited sources.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === "he" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')!=='light')document.documentElement.classList.add('dark');var h=localStorage.getItem('accent-hue');if(h){var d=document.documentElement,isDark=d.classList.contains('dark');d.style.setProperty('--primary','oklch('+(isDark?'0.72 0.16':'0.45 0.18')+' '+h+')');d.style.setProperty('--ring','oklch('+(isDark?'0.72 0.16':'0.45 0.18')+' '+h+')')}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
