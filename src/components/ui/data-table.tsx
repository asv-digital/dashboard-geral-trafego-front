"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  width?: string;
  render: (row: T) => React.ReactNode;
  /** Valor pra ordenacao. Se ausente, usa render. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Permite participar do search (string concat). */
  searchable?: (row: T) => string | undefined;
  /** Conteudo pra export CSV. Se ausente, usa render. */
  exportValue?: (row: T) => string | number | null | undefined;
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

export function DataTable<T>({
  columns,
  data,
  keyOf,
  searchable = true,
  exportable = true,
  exportFilename = "export.csv",
  pageSize,
  emptyMessage = "Sem dados",
  rowClassName,
  initialSort,
  className,
}: {
  columns: Column<T>[];
  data: T[];
  keyOf: (row: T) => string;
  searchable?: boolean;
  exportable?: boolean;
  exportFilename?: string;
  pageSize?: number;
  emptyMessage?: string;
  rowClassName?: (row: T) => string | undefined;
  initialSort?: SortState;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>(initialSort ?? null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(c => {
        const fn = c.searchable;
        if (!fn) return false;
        const val = fn(row);
        return val ? val.toLowerCase().includes(q) : false;
      }),
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find(c => c.key === sort.key);
    if (!col) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = col.sortValue ? col.sortValue(a) : null;
      const bv = col.sortValue ? col.sortValue(b) : null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sort, columns]);

  const paged = useMemo(() => {
    if (!pageSize) return sorted;
    return sorted.slice(page * pageSize, (page + 1) * pageSize);
  }, [sorted, page, pageSize]);

  const totalPages = pageSize ? Math.ceil(sorted.length / pageSize) : 1;

  const handleExport = () => {
    const header = columns.map(c => `"${c.label}"`).join(",");
    const rows = sorted.map(row =>
      columns
        .map(c => {
          const fn = c.exportValue;
          const val = fn ? fn(row) : "";
          if (val == null) return "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sort?.key === col.key) {
      setSort({ key: col.key, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      setSort({ key: col.key, dir: "desc" });
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {(searchable || exportable) && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {searchable ? (
            <input
              type="search"
              placeholder="Buscar…"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="bg-card border border-border rounded-md px-3 py-1.5 text-xs w-full max-w-xs focus:outline-none focus:border-primary"
            />
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {sorted.length} {sorted.length === 1 ? "linha" : "linhas"}
            </span>
            {exportable && sorted.length > 0 && (
              <button
                onClick={handleExport}
                className="text-[11px] px-2.5 py-1 border border-border rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Exportar CSV
              </button>
            )}
          </div>
        </div>
      )}

      {/* Desktop / tablet: tabela */}
      <div className="border border-border rounded-lg overflow-hidden bg-card hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                {columns.map(col => {
                  const align = col.align ?? "left";
                  const isSortedBy = sort?.key === col.key;
                  return (
                    <th
                      key={col.key}
                      style={col.width ? { width: col.width } : undefined}
                      className={cn(
                        "px-4 py-2.5 font-medium",
                        align === "right" && "text-right",
                        align === "center" && "text-center",
                        col.sortable && "cursor-pointer hover:text-foreground select-none",
                      )}
                      onClick={() => handleSort(col)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.sortable && (
                          <span className={cn("text-[8px]", isSortedBy ? "text-primary" : "text-muted-foreground/50")}>
                            {isSortedBy ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-muted-foreground text-xs"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paged.map(row => (
                  <tr
                    key={keyOf(row)}
                    className={cn(
                      "border-t border-border hover:bg-muted/20",
                      rowClassName?.(row),
                    )}
                  >
                    {columns.map(col => {
                      const align = col.align ?? "left";
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            "px-4 py-3",
                            align === "right" && "text-right tabular-nums",
                            align === "center" && "text-center",
                          )}
                        >
                          {col.render(row)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: 1 linha = 1 card */}
      <div className="md:hidden space-y-2">
        {paged.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center text-xs text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          paged.map(row => {
            const [first, ...rest] = columns;
            return (
              <div
                key={keyOf(row)}
                className={cn(
                  "border border-border rounded-lg bg-card p-3 space-y-1.5",
                  rowClassName?.(row),
                )}
              >
                {/* primeira coluna em destaque */}
                <div className="font-medium text-sm">{first?.render(row)}</div>
                {/* demais em label/valor */}
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {rest.map(col => (
                    <div key={col.key} className="flex justify-between gap-2 col-span-1">
                      <dt className="text-muted-foreground uppercase tracking-wider text-[10px]">
                        {col.label}
                      </dt>
                      <dd className="tabular-nums text-right truncate">{col.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })
        )}
      </div>

      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-[11px] px-2.5 py-1 border border-border rounded disabled:opacity-30 hover:bg-muted"
          >
            ‹
          </button>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-[11px] px-2.5 py-1 border border-border rounded disabled:opacity-30 hover:bg-muted"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
