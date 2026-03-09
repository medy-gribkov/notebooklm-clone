import type { Metadata } from "next";
import { getServiceClient } from "@/lib/supabase/service";

interface Props {
  params: Promise<{ token: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;

  if (!token || token.length < 32 || token.length > 64 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return { title: "DocChat" };
  }

  try {
    const supabase = getServiceClient();
    const { data: tokenData } = await supabase.rpc("validate_share_token", { share_token: token });

    if (!tokenData || tokenData.length === 0 || !tokenData[0].is_valid) {
      return { title: "DocChat" };
    }

    const notebookId = tokenData[0].notebook_id;
    const { data: notebook } = await supabase
      .from("notebooks")
      .select("title, description")
      .eq("id", notebookId)
      .single();

    const title = notebook?.title || "Shared Notebook";
    const description = notebook?.description || "Document analysis powered by DocChat";

    return {
      title: `${title} | DocChat`,
      description,
      openGraph: {
        title: `${title} | DocChat`,
        description,
        type: "article",
        siteName: "DocChat",
      },
      twitter: {
        card: "summary",
        title: `${title} | DocChat`,
        description,
      },
    };
  } catch {
    return { title: "DocChat" };
  }
}

export default function SharedLayout({ children }: Props) {
  return children;
}
