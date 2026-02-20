"use client";

import { useState, useCallback } from "react";

interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

interface MindMapViewProps {
  data: MindMapNode;
}

const DEPTH_COLORS = [
  "text-primary",
  "text-primary/80",
  "text-primary/60",
  "text-muted-foreground",
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
  const colorClass = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];

  const toggle = useCallback(() => {
    if (hasChildren) setExpanded((prev) => !prev);
  }, [hasChildren]);

  return (
    <div className={depth > 0 ? "ml-5 border-l border-border pl-4" : ""}>
      <button
        onClick={toggle}
        className={`flex items-center gap-2 py-1.5 text-left transition-colors hover:text-foreground ${colorClass}`}
      >
        {hasChildren && (
          <svg
            className={`h-3 w-3 shrink-0 transition-transform ${
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
        )}
        {!hasChildren && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
        )}
        <span
          className={`text-sm ${
            depth === 0 ? "font-semibold text-base" : depth === 1 ? "font-medium" : ""
          }`}
        >
          {node.label}
        </span>
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

export function MindMapView({ data }: MindMapViewProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Topic Map
      </h3>
      <div className="rounded-xl border bg-card p-4">
        <TreeNode node={data} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Click nodes to expand or collapse.
      </p>
    </div>
  );
}
