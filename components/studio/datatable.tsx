"use client";

import { useState, useMemo } from "react";

interface DataTableData {
  columns: string[];
  rows: string[][];
}

interface DataTableViewProps {
  data: DataTableData;
}

export function DataTableView({ data }: DataTableViewProps) {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Extracted Data
        </h3>
        <span className="text-xs text-muted-foreground">
          {data.rows.length} rows
        </span>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {data.columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <span className="flex items-center gap-1">
                    {col}
                    {sortCol === i && (
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
                className={`border-b last:border-b-0 ${
                  i % 2 === 0 ? "" : "bg-muted/10"
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
}
