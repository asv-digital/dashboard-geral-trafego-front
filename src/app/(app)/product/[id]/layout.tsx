"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type SubTab = { slug: string; label: string };
type TabGroup = {
  slug: string; // primeiro filho default
  label: string;
  subs: SubTab[];
};

const TAB_GROUPS: TabGroup[] = [
  {
    slug: "",
    label: "Visao geral",
    subs: [{ slug: "", label: "Resumo" }],
  },
  {
    slug: "realtime",
    label: "Operacao",
    subs: [
      { slug: "realtime", label: "Tempo real" },
      { slug: "alerts", label: "Alertas" },
      { slug: "decisions", label: "Decisoes" },
    ],
  },
  {
    slug: "analytics",
    label: "Performance",
    subs: [
      { slug: "analytics", label: "Analytics" },
      { slug: "funnel", label: "Funil" },
      { slug: "fatigue", label: "Fadiga" },
      { slug: "placements", label: "Placements" },
    ],
  },
  {
    slug: "campaigns",
    label: "Midia",
    subs: [
      { slug: "campaigns", label: "Campanhas" },
      { slug: "creatives", label: "Criativos" },
      { slug: "assets", label: "Conteudo" },
      { slug: "planner", label: "Planner" },
      { slug: "ab-tests", label: "A/B tests" },
    ],
  },
  {
    slug: "high-ticket",
    label: "Painel manual",
    subs: [{ slug: "high-ticket", label: "High ticket" }],
  },
  {
    slug: "method",
    label: "Sistema",
    subs: [
      { slug: "method", label: "Metodo" },
      { slug: "config", label: "Config" },
      { slug: "preflight", label: "Preflight" },
    ],
  },
];

function findActiveGroup(pathname: string | null, productId: string): TabGroup {
  if (!pathname) return TAB_GROUPS[0];
  for (const g of TAB_GROUPS) {
    for (const s of g.subs) {
      if (s.slug === "" && pathname === `/product/${productId}`) return g;
      if (s.slug && pathname.startsWith(`/product/${productId}/${s.slug}`)) return g;
    }
  }
  return TAB_GROUPS[0];
}

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
  const { data: overview } = useQuery({
    queryKey: ["global", "overview", 7],
    queryFn: () => api.globalOverview(7),
    refetchInterval: 5 * 60_000,
  });
  const { data: campaigns } = useQuery({
    queryKey: ["campaigns", id],
    queryFn: () => api.listCampaigns(id),
    refetchInterval: 5 * 60_000,
  });
  const { data: highTicket } = useQuery({
    queryKey: ["high-ticket", "list", id],
    queryFn: () => api.listHighTicketSales(id, 90),
    refetchInterval: 5 * 60_000,
  });

  const product = data?.product;
  const activeGroup = findActiveGroup(pathname, id);
  const showSubtabs = activeGroup.subs.length > 1;

  // Badges por grupo
  const productOverview = overview?.products.find(p => p.productId === id);
  const alertsCount = productOverview?.alerts ?? 0;
  const campaignsCount = campaigns?.campaigns.filter(c => c.status === "Ativa").length ?? 0;
  const highTicketCount = highTicket?.items.length ?? 0;

  const badgeFor = (slug: string): { count: number; tone: "danger" | "info" | "muted" } | null => {
    if (slug === "realtime" && alertsCount > 0)
      return { count: alertsCount, tone: "danger" };
    if (slug === "campaigns" && campaignsCount > 0)
      return { count: campaignsCount, tone: "info" };
    if (slug === "high-ticket" && highTicketCount > 0)
      return { count: highTicketCount, tone: "info" };
    return null;
  };

  return (
    <div>
      <header className="border-b border-border px-6 md:px-8 pt-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {product?.stage || "—"}
            </div>
            <h1 className="text-2xl font-heading font-semibold mt-1 truncate">
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

        {/* Top-level tabs */}
        <nav className="flex gap-0 mt-5 overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8 border-b border-transparent">
          {TAB_GROUPS.map(group => {
            const href = `/product/${id}${group.slug ? `/${group.slug}` : ""}`;
            const active = group === activeGroup;
            const badge = badgeFor(group.slug);
            return (
              <Link
                key={group.label}
                href={href}
                className={cn(
                  "px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap inline-flex items-center gap-1.5",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {group.label}
                {badge && (
                  <span
                    className={cn(
                      "text-[10px] tabular-nums px-1.5 py-0.5 rounded leading-none",
                      badge.tone === "danger"
                        ? "bg-destructive/15 text-destructive border border-destructive/30"
                        : badge.tone === "info"
                          ? "bg-info/15 text-info border border-info/30"
                          : "bg-muted text-muted-foreground border border-border",
                    )}
                  >
                    {badge.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sub-tabs */}
        {showSubtabs && (
          <nav className="flex gap-1 py-2 overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
            {activeGroup.subs.map(sub => {
              const href = `/product/${id}${sub.slug ? `/${sub.slug}` : ""}`;
              const active =
                sub.slug === ""
                  ? pathname === `/product/${id}`
                  : pathname?.startsWith(href) ?? false;
              return (
                <Link
                  key={sub.slug || "_root"}
                  href={href}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded transition-colors whitespace-nowrap tabular-nums",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {sub.label}
                </Link>
              );
            })}
          </nav>
        )}
        {!showSubtabs && <div className="h-2" />}
      </header>
      <div>{children}</div>
    </div>
  );
}
