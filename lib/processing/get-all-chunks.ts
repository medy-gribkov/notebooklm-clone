import { isValidUUID } from "@/lib/validate";
import { getServiceClient } from "@/lib/supabase/service";

/**
 * Get all chunks for a notebook (for Studio features that need full document context).
 * Returns concatenated text capped at 30k characters.
 */
export async function getAllChunks(
  notebookId: string,
  userId: string
): Promise<string> {
  if (!isValidUUID(notebookId)) throw new Error("Invalid notebookId");
  if (!isValidUUID(userId)) throw new Error("Invalid userId");

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("chunks")
    .select("content")
    .eq("notebook_id", notebookId)
    .eq("user_id", userId)
    .order("chunk_index", { ascending: true });

  if (error) {
    throw new Error("Failed to load document");
  }

  const text = (data ?? []).map((row: { content: string }) => row.content).join("\n\n");
  return text.slice(0, 30_000);
}
