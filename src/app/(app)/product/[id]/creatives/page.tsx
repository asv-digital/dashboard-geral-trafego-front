"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type CreativeItem } from "@/lib/api";
import { formatBRL, formatPercent } from "@/lib/format";

export default function CreativesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data } = useQuery({
    queryKey: ["creatives", id],
    queryFn: () => api.listCreatives(id),
    refetchInterval: 60_000,
  });

  const creatives = data?.creatives ?? [];

  const active = creatives.filter(creative => creative.status === "active");
  const paused = creatives.filter(creative => creative.status === "paused");
  const exhausted = creatives.filter(creative => creative.status === "exhausted");

  return (
    <div className="p-8 space-y-6">
      <header>
        <h2 className="text-xl font-heading font-semibold">Criativos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Estoque de criativos do produto, classificados por saúde.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <StockCard label="Ativos" value={active.length} tone="success" />
        <StockCard label="Pausados" value={paused.length} tone="muted" />
        <StockCard label="Exaustos" value={exhausted.length} tone="danger" />
      </div>

      {creatives.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhum criativo ainda</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">Nome</th>
                <th className="text-left px-4 py-2.5">Tipo</th>
                <th className="text-left px-4 py-2.5">Campanha</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">CTR</th>
                <th className="text-right px-4 py-2.5">Hook rate</th>
                <th className="text-right px-4 py-2.5">CPA</th>
                <th className="text-right px-4 py-2.5">Thruplay</th>
              </tr>
            </thead>
            <tbody>
              {creatives.map(creative => (
                <CreativeRow key={creative.id} creative={creative} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreativeRow({ creative }: { creative: CreativeItem }) {
  return (
    <tr className="border-t border-border hover:bg-muted/20">
      <td className="px-4 py-3 font-medium">{creative.name}</td>
      <td className="px-4 py-3 text-muted-foreground text-xs">{creative.type}</td>
      <td className="px-4 py-3 text-muted-foreground text-xs">
        {creative.campaign?.name || "—"}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={creative.status} />
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {creative.ctr ? formatPercent(creative.ctr) : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {creative.hookRate ? formatPercent(creative.hookRate) : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {creative.cpa ? formatBRL(creative.cpa) : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {creative.thruplayRate ? formatPercent(creative.thruplayRate) : "—"}
      </td>
    </tr>
  );
}

function StockCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "muted" | "danger";
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
      <div
        className={`text-3xl font-heading font-semibold mt-2 tabular-nums ${
          tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "text-success"
      : status === "exhausted"
        ? "text-destructive"
        : "text-muted-foreground";
  return <span className={`text-xs ${tone}`}>{status}</span>;
}
