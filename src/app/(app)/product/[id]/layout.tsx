"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const TABS = [
  { slug: "", label: "Visão geral" },
  { slug: "realtime", label: "Tempo real" },
  { slug: "alerts", label: "Alertas" },
  { slug: "high-ticket", label: "High Ticket" },
  { slug: "analytics", label: "Analytics" },
  { slug: "method", label: "Método" },
  { slug: "funnel", label: "Funil" },
  { slug: "fatigue", label: "Fadiga" },
  { slug: "placements", label: "Placements" },
  { slug: "decisions", label: "Decisões" },
  { slug: "campaigns", label: "Campanhas" },
  { slug: "creatives", label: "Criativos" },
  { slug: "assets", label: "Conteúdo" },
  { slug: "planner", label: "Planner" },
  { slug: "config", label: "Config" },
  { slug: "preflight", label: "Preflight" },
];

export default function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const { data } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id),
  });

  const product = data?.product;

  return (
    <div>
      <header className="border-b border-border px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {product?.stage || "—"}
            </div>
            <h1 className="text-2xl font-heading font-semibold mt-1">
              {product?.name || "carregando…"}
            </h1>
            {product?.description && (
              <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
            )}
          </div>
          {product && (
            <div className="text-right text-xs">
              <div className="text-muted-foreground">Budget/dia</div>
              <div className="text-lg font-medium tabular-nums">
                R$ {product.dailyBudgetTarget.toFixed(0)}
              </div>
            </div>
          )}
        </div>

        <nav className="flex gap-1 mt-5 -mb-5 overflow-x-auto">
          {TABS.map(t => {
            const href = `/product/${id}${t.slug ? `/${t.slug}` : ""}`;
            const active =
              t.slug === ""
                ? pathname === `/product/${id}`
                : pathname?.startsWith(href);
            return (
              <Link
                key={t.slug}
                href={href}
                className={cn(
                  "px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div>{children}</div>
    </div>
  );
}
