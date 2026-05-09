"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Plus,
  Settings,
  LogOut,
  Search,
  AlertCircle,
  Activity,
} from "lucide-react";
import {
  api,
  type GlobalOverviewProduct,
  type ProductHealth,
  type ProductListItem,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { StatusDot, type Tone } from "@/components/ui/status-badge";

const HEALTH_TONE: Record<ProductHealth, Tone> = {
  elite: "success",
  bom: "success",
  mediano: "warning",
  critico: "danger",
};

const SEARCH_THRESHOLD = 5;

export function Sidebar() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const { data } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.listProducts(),
  });
  const { data: me } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.me(),
  });
  const { data: overview } = useQuery({
    queryKey: ["global", "overview", 7],
    queryFn: () => api.globalOverview(7),
    refetchInterval: 60_000,
  });

  const products = useMemo(() => data?.products ?? [], [data]);
  const isOwner = me?.user.role === "owner";

  const overviewMap = useMemo(() => {
    const m = new Map<string, GlobalOverviewProduct>();
    for (const p of overview?.products ?? []) m.set(p.productId, p);
    return m;
  }, [overview]);

  const totalAlerts = useMemo(
    () => (overview?.products ?? []).reduce((acc, p) => acc + (p.alerts ?? 0), 0),
    [overview],
  );

  const visibleProducts = useMemo(
    () =>
      showArchived
        ? products
        : products.filter(p => p.status !== "archived"),
    [products, showArchived],
  );
  const archivedCount = useMemo(
    () => products.filter(p => p.status === "archived").length,
    [products],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return visibleProducts;
    const q = search.toLowerCase();
    return visibleProducts.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.stage.toLowerCase().includes(q),
    );
  }, [visibleProducts, search]);

  const showSearch = products.length > SEARCH_THRESHOLD;

  return (
    <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
      <div className="px-5 py-6 border-b border-sidebar-border">
        <div className="text-sidebar-primary font-heading font-bold text-lg leading-tight">
          Bravy
        </div>
        <div className="text-sidebar-foreground/60 text-xs mt-0.5">
          Dashboard Geral de Trafego
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavItem
          href="/global"
          icon={<LayoutDashboard className="w-4 h-4" />}
          label="Visao Geral"
          active={pathname === "/global"}
          rightSlot={
            totalAlerts > 0 ? (
              <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/30">
                {totalAlerts}
              </span>
            ) : undefined
          }
        />

        <NavItem
          href="/orquestrador"
          icon={<Activity className="w-4 h-4" />}
          label="Orquestrador"
          active={pathname === "/orquestrador"}
        />

        <div className="pt-4 pb-1 px-3 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-sidebar-foreground/40">
            Produtos {products.length > 0 && `(${products.length})`}
          </span>
        </div>

        {showSearch && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-sidebar-foreground/40" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="buscar produto..."
                className="w-full text-xs bg-sidebar-accent/40 border border-sidebar-border rounded pl-7 pr-2 py-1.5 focus:outline-none focus:border-sidebar-ring"
              />
            </div>
          </div>
        )}

        {products.length === 0 && (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/50">
            Nenhum produto ainda
          </div>
        )}

        {products.length > 0 && filtered.length === 0 && search && (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/50">
            Nada encontrado
          </div>
        )}

        {filtered.map((p: ProductListItem) => {
          const ov = overviewMap.get(p.id);
          const tone: Tone | undefined = ov ? HEALTH_TONE[ov.health] : undefined;
          const productAlerts = ov?.alerts ?? 0;
          const active = pathname?.startsWith(`/product/${p.id}`);
          return (
            <NavItem
              key={p.id}
              href={`/product/${p.id}`}
              icon={
                tone ? (
                  <StatusDot tone={tone} className="w-2 h-2" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-sidebar-foreground/20" />
                )
              }
              label={p.name}
              active={active}
              dim={p.status !== "active"}
              statusLabel={p.status !== "active" ? p.status : undefined}
              rightSlot={
                productAlerts > 0 ? (
                  <span
                    className="text-[10px] tabular-nums px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/30 inline-flex items-center gap-1"
                    title={`${productAlerts} alerta(s) ativo(s)`}
                  >
                    <AlertCircle className="w-2.5 h-2.5" />
                    {productAlerts}
                  </span>
                ) : undefined
              }
            />
          );
        })}

        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived(s => !s)}
            className="w-full text-left px-3 py-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
          >
            {showArchived ? "ocultar" : "mostrar"} arquivados ({archivedCount})
          </button>
        )}

        <div className="pt-2">
          <NavItem
            href="/product/new"
            icon={<Plus className="w-4 h-4" />}
            label="Novo produto"
            active={pathname === "/product/new"}
            muted
          />
        </div>
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3 space-y-1">
        {isOwner && (
          <NavItem
            href="/settings"
            icon={<Settings className="w-4 h-4" />}
            label="Configuracoes"
            active={pathname === "/settings"}
          />
        )}
        <LogoutButton />
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  rightSlot,
  muted,
  dim,
  statusLabel,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  rightSlot?: React.ReactNode;
  muted?: boolean;
  dim?: boolean;
  statusLabel?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors group",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        muted && !active && "text-sidebar-foreground/50",
        dim && !active && "text-sidebar-foreground/45",
      )}
    >
      <span className="shrink-0 flex items-center justify-center w-4 h-4">{icon}</span>
      <span className="flex-1 truncate flex items-center gap-1.5">
        {label}
        {statusLabel && (
          <span className="text-[9px] uppercase tracking-wider text-sidebar-foreground/40">
            · {statusLabel}
          </span>
        )}
      </span>
      {rightSlot}
    </Link>
  );
}

function LogoutButton() {
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    window.location.href = "/login";
  };
  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
    >
      <LogOut className="w-4 h-4" />
      <span>Sair</span>
    </button>
  );
}
