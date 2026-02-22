import { getServiceClient } from "@/lib/supabase/service";

/**
 * Recompute notebook status from its files.
 * - Any file processing = "processing"
 * - All files ready = "ready"
 * - No files = "ready" (empty notebook)
 * - Otherwise = "error"
 */
export async function updateNotebookStatus(notebookId: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: files } = await supabase
    .from("notebook_files")
    .select("status, page_count")
    .eq("notebook_id", notebookId);

  if (!files || files.length === 0) {
    await supabase
      .from("notebooks")
      .update({ status: "ready", page_count: 0 })
      .eq("id", notebookId);
    return;
  }

  const statuses = files.map((f: { status: string }) => f.status);
  const hasProcessing = statuses.includes("processing");
  const allReady = statuses.every((s: string) => s === "ready");

  const notebookStatus: "processing" | "ready" | "error" = hasProcessing
    ? "processing"
    : allReady
    ? "ready"
    : "error";

  const totalPageCount = files.reduce(
    (sum: number, f: { page_count: number | null }) => sum + (f.page_count ?? 0),
    0
  );

  await supabase
    .from("notebooks")
    .update({ status: notebookStatus, page_count: totalPageCount })
    .eq("id", notebookId);
}
