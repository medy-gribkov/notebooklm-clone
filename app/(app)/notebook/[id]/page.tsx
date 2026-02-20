import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotebookLayout } from "@/components/notebook-layout";
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
    <NotebookLayout
      notebookId={id}
      notebookTitle={notebook.title}
      initialMessages={(messages ?? []) as Message[]}
    />
  );
}
