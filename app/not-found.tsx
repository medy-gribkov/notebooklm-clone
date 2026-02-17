import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-5xl font-bold text-muted-foreground/30 mb-4">404</p>
        <h1 className="text-xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
