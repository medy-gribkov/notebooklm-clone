import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChatInterface } from "@/components/chat-interface";
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
      <header className="border-b shrink-0">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{notebook.title}</h1>
          </div>
          <a
            href={notebook.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            View PDF
          </a>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ChatInterface
          notebookId={id}
          initialMessages={(messages ?? []) as Message[]}
        />
      </div>
    </div>
  );
}
