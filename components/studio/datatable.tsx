"use client";

import { useState, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";

interface DataTableData {
  columns: string[];
  rows: string[][];
}

interface DataTableViewProps {
  data: DataTableData;
}

export const DataTableView = memo(function DataTableView({ data }: DataTableViewProps) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sortedRows = useMemo(() => {
    if (sortCol === null) return data.rows;
    return [...data.rows].sort((a, b) => {
      const valA = a[sortCol] ?? "";
      const valB = b[sortCol] ?? "";
      const cmp = valA.localeCompare(valB, undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [data.rows, sortCol, sortAsc]);

  function handleSort(colIndex: number) {
    if (sortCol === colIndex) {
      setSortAsc((prev) => !prev);
    } else {
      setSortCol(colIndex);
      setSortAsc(true);
    }
  }

  function exportCsv() {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const header = data.columns.map(escape).join(",");
    const rows = data.rows.map((row) => row.map(escape).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Extracted Data
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {data.rows.length} rows
          </span>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {data.columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    {col}
                    {sortCol === i ? (
                      <svg
                        className={`h-3 w-3 transition-transform ${
                          sortAsc ? "" : "rotate-180"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    ) : (
                      <svg className="h-3 w-3 opacity-0 group-hover:opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr
                key={i}
                className={`border-b last:border-b-0 transition-colors hover:bg-muted/20 ${
                  i % 2 === 0 ? "bg-card" : "bg-muted/10"
                }`}
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-4 py-2.5 text-sm"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
