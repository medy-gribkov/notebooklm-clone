"use client";

import { useState, useCallback, memo } from "react";

interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

interface MindMapViewProps {
  data: MindMapNode;
}

const DEPTH_COLORS = [
  { text: "text-foreground", dot: "bg-primary", line: "border-primary/30" },
  { text: "text-foreground/90", dot: "bg-primary/70", line: "border-primary/20" },
  { text: "text-muted-foreground", dot: "bg-muted-foreground/50", line: "border-border" },
  { text: "text-muted-foreground/70", dot: "bg-muted-foreground/30", line: "border-border/50" },
];

function TreeNode({
  node,
  depth = 0,
}: {
  node: MindMapNode;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const colors = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];

  const toggle = useCallback(() => {
    if (hasChildren) setExpanded((prev) => !prev);
  }, [hasChildren]);

  return (
    <div className={depth > 0 ? `ml-5 border-l ${colors.line} pl-4` : ""}>
      <button
        onClick={toggle}
        className={`flex items-center gap-2.5 py-1.5 text-left transition-colors hover:text-foreground group ${colors.text}`}
      >
        {hasChildren ? (
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${
            expanded ? "bg-primary/10" : "bg-muted group-hover:bg-primary/10"
          }`}>
            <svg
              className={`h-3 w-3 shrink-0 transition-transform text-primary ${
                expanded ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        ) : (
          <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot} ml-1.5 mr-0.5`} />
        )}
        <span
          className={`text-sm ${
            depth === 0 ? "font-bold text-base" : depth === 1 ? "font-semibold" : "font-normal"
          }`}
        >
          {node.label}
        </span>
        {hasChildren && (
          <span className="text-[10px] text-muted-foreground/40">
            ({node.children!.length})
          </span>
        )}
      </button>

      {expanded && hasChildren && (
        <div className="animate-fade-in">
          {node.children!.map((child, i) => (
            <TreeNode key={`${child.label}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export const MindMapView = memo(function MindMapView({ data }: MindMapViewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Topic Map
        </h3>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <TreeNode node={data} />
      </div>
      <p className="text-[10px] text-muted-foreground/50 text-center">
        Click nodes to expand or collapse
      </p>
    </div>
  );
});
