"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Plus, Target, Settings, LogOut } from "lucide-react";
import { api, type ProductListItem } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.listProducts(),
  });
  const { data: me } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.me(),
  });

  const products = data?.products ?? [];
  const isOwner = me?.user.role === "owner";

  return (
    <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
      <div className="px-5 py-6 border-b border-sidebar-border">
        <div className="text-sidebar-primary font-heading font-bold text-lg leading-tight">
          Bravy
        </div>
        <div className="text-sidebar-foreground/60 text-xs mt-0.5">
          Dashboard Geral de Tráfego
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavItem
          href="/global"
          icon={<LayoutDashboard className="w-4 h-4" />}
          label="Visão Geral"
          active={pathname === "/global"}
        />

        <div className="pt-4 pb-1 px-3 text-[11px] uppercase tracking-wider text-sidebar-foreground/40">
          Produtos
        </div>

        {products.length === 0 && (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/50">
            Nenhum produto ainda
          </div>
        )}

        {products.map((p: ProductListItem) => (
          <NavItem
            key={p.id}
            href={`/product/${p.id}`}
            icon={<Target className="w-4 h-4" />}
            label={p.name}
            badge={p.status !== "active" ? p.status : undefined}
            active={pathname?.startsWith(`/product/${p.id}`)}
          />
        ))}

        <NavItem
          href="/product/new"
          icon={<Plus className="w-4 h-4" />}
          label="Novo produto"
          active={pathname === "/product/new"}
          muted
        />
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3 space-y-1">
        {isOwner && (
          <NavItem
            href="/settings"
            icon={<Settings className="w-4 h-4" />}
            label="Configurações"
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
  badge,
  muted,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        muted && !active && "text-sidebar-foreground/50"
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {badge}
        </span>
      )}
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
