import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "DocChat - Chat with your PDFs",
  description:
    "Upload a PDF and ask questions in plain English. DocChat answers from your document using AI with cited sources.",
  keywords: ["PDF", "chat", "AI", "RAG", "document", "research"],
  authors: [{ name: "Medy Gribkov", url: "https://medygribkov.vercel.app" }],
  openGraph: {
    title: "DocChat - Chat with your PDFs",
    description: "Upload a PDF and ask questions. Get AI-powered answers with cited sources.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
