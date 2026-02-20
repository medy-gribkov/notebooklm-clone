import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NotebookTabs } from "@/components/notebook-tabs";
import { ViewPdfButton } from "@/components/view-pdf-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { Notebook, Message } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NotebookPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: notebook } = await supabase
    .from("notebooks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single<Notebook>();

  if (!notebook) notFound();

  if (notebook.status === "processing") {
    redirect(`/dashboard`);
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("notebook_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md shrink-0">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 sm:px-6 py-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{notebook.title}</h1>
          </div>
          <ThemeToggle />
          <ViewPdfButton notebookId={id} />
        </div>
      </header>

      <NotebookTabs
        notebookId={id}
        initialMessages={(messages ?? []) as Message[]}
      />
    </div>
  );
}
