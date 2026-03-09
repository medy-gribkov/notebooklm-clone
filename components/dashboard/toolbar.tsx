"use client";

import { Button } from "@/components/ui/button";

export type GridDensity = "compact" | "default" | "spacious";
export type SortKey = "newest" | "oldest" | "az" | "za";

interface ToolbarProps {
  gridDensity: GridDensity;
  onGridDensityChange: (d: GridDensity) => void;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
  sortOptions: { key: SortKey; label: string }[];
  onCreateNotebook: () => void;
  creatingNotebook: boolean;
  createLabel: string;
  creatingLabel: string;
}

export function Toolbar({
  gridDensity,
  onGridDensityChange,
  sortBy,
  onSortChange,
  sortOptions,
  onCreateNotebook,
  creatingNotebook,
  createLabel,
  creatingLabel,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Grid density toggle - hidden on mobile */}
      <div className="hidden sm:flex items-center rounded-lg border bg-background">
        {(["compact", "default", "spacious"] as GridDensity[]).map((d) => (
          <button
            key={d}
            onClick={() => onGridDensityChange(d)}
            className={`h-10 w-10 flex items-center justify-center transition-all duration-300 ease-out ${
              gridDensity === d ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            } ${d === "compact" ? "rounded-s-lg" : d === "spacious" ? "rounded-e-lg" : ""}`}
            title={d.charAt(0).toUpperCase() + d.slice(1)}
            aria-label={`${d} grid layout`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              {d === "compact" ? (
                <>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </>
              ) : d === "default" ? (
                <>
                  <rect x="3" y="3" width="8" height="8" rx="1" />
                  <rect x="13" y="3" width="8" height="8" rx="1" />
                  <rect x="3" y="13" width="8" height="8" rx="1" />
                  <rect x="13" y="13" width="8" height="8" rx="1" />
                </>
              ) : (
                <>
                  <rect x="3" y="3" width="18" height="8" rx="1" />
                  <rect x="3" y="13" width="18" height="8" rx="1" />
                </>
              )}
            </svg>
          </button>
        ))}
      </div>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortKey)}
        aria-label="Sort notebooks"
        className="h-10 rounded-lg border bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {sortOptions.map((opt) => (
          <option key={opt.key} value={opt.key}>{opt.label}</option>
        ))}
      </select>
      <Button
        variant="default"
        size="sm"
        onClick={onCreateNotebook}
        disabled={creatingNotebook}
        className="gap-1.5"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:inline">{creatingNotebook ? creatingLabel : createLabel}</span>
        <span className="sm:hidden">+</span>
      </Button>
    </div>
  );
}
