export default function NotebookLoading() {
  return (
    <div className="flex h-screen w-full">
      {/* Sources sidebar skeleton */}
      <div className="hidden md:flex w-72 flex-col border-r border-border bg-muted/30 p-4 gap-3">
        <div className="h-6 w-32 rounded bg-muted animate-pulse" />
        <div className="h-10 w-full rounded bg-muted animate-pulse" />
        <div className="h-10 w-full rounded bg-muted animate-pulse" />
      </div>

      {/* Main chat area skeleton */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="h-5 w-48 rounded bg-muted animate-pulse" />
        </div>

        {/* Chat messages area */}
        <div className="flex-1 p-6 space-y-4">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
        </div>

        {/* Input area */}
        <div className="border-t border-border px-6 py-4">
          <div className="h-12 w-full rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
