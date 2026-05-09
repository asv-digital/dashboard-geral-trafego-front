"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Activity, Bot, RefreshCw } from "lucide-react";
import {
  api,
  type ActivityItem,
  type HeartbeatItem,
} from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, StatusDot, type Tone } from "@/components/ui/status-badge";

const CYCLE_HOURS_DEFAULT = 4; // scheduler default no back

export default function OrquestradorPage() {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const sync = () => setNow(Date.now());
    sync();
    const id = window.setInterval(sync, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { data: heartbeats } = useQuery({
    queryKey: ["global", "heartbeats"],
    queryFn: () => api.globalHeartbeats(),
    refetchInterval: 30_000,
  });
  const { data: activity } = useQuery({
    queryKey: ["global", "activity"],
    queryFn: () => api.globalActivity(),
    refetchInterval: 15_000,
  });
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.listProducts(),
  });

  const heartbeatItems = heartbeats?.heartbeats ?? [];
  const activityItems = activity?.activity.slice(0, 30) ?? [];

  const overallHealth = computeOverallHealth(heartbeatItems, now);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <PageHeader
        title="Orquestrador"
        subtitle="Centro de controle do agente — saude, ciclos automaticos e ultimas acoes em tempo real."
        actions={
          <StatusBadge
            tone={overallHealth.tone}
            label={overallHealth.label}
            dot
          />
        }
      />

      {/* Resumo agregado */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Bot className="w-4 h-4" />}
          label="Produtos monitorados"
          value={String(products?.products.length ?? 0)}
        />
        <SummaryCard
          icon={<Activity className="w-4 h-4" />}
          label="Acoes hoje"
          value={String(
            activityItems.filter(a => isToday(a.executedAt)).length,
          )}
        />
        <SummaryCard
          icon={<RefreshCw className="w-4 h-4" />}
          label="Proximo ciclo"
          value={`em ~${nextCycleEta(heartbeatItems, now)}`}
        />
        <SummaryCard
          icon={<Bot className="w-4 h-4" />}
          label="Falhas consecutivas"
          value={String(
            heartbeatItems.reduce((acc, h) => acc + (h.consecutiveFailures || 0), 0),
          )}
        />
      </section>

      {/* Saude do agente por produto */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Saude do agente por produto
        </h2>
        {heartbeatItems.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
            Sem produtos monitorados ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {heartbeatItems.map(h => (
              <AgentHealthCard key={h.productId} heartbeat={h} now={now} />
            ))}
          </div>
        )}
      </section>

      {/* Feed cross-product */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Acoes do agente em tempo real
        </h2>
        <div className="bg-card border border-border rounded-lg divide-y divide-border max-h-[480px] overflow-y-auto">
          {activityItems.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground italic">
              Sem acoes registradas ainda. Quando o agente rodar pela primeira vez, aparecem aqui.
            </div>
          ) : (
            activityItems.map(item => <ActionRow key={item.id} item={item} now={now} />)
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-heading font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function AgentHealthCard({ heartbeat, now }: { heartbeat: HeartbeatItem; now: number }) {
  const lastCollection = heartbeat.lastCollectionAt ? new Date(heartbeat.lastCollectionAt) : null;
  const hoursSince =
    lastCollection && now > 0 ? (now - lastCollection.getTime()) / (1000 * 60 * 60) : null;
  const tone: Tone =
    hoursSince === null
      ? "muted"
      : hoursSince > 8
        ? "danger"
        : hoursSince > 5
          ? "warning"
          : "success";
  const label =
    hoursSince === null
      ? "Sem dado"
      : tone === "success"
        ? "Saudavel"
        : tone === "warning"
          ? "Atrasado"
          : "Parado";

  return (
    <Link
      href={`/product/${heartbeat.productId}`}
      className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors block"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            {heartbeat.product?.name ?? "Produto sem nome"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Ultimo ciclo:{" "}
            <span className="text-foreground">
              {lastCollection ? formatRelativeTime(lastCollection, now) : "nunca rodou"}
            </span>
          </div>
          {heartbeat.lastAutomationAt && (
            <div className="text-[11px] text-muted-foreground">
              Ultima acao: {formatRelativeTime(heartbeat.lastAutomationAt, now)}
            </div>
          )}
          {heartbeat.consecutiveFailures > 0 && (
            <div className="text-[11px] text-destructive mt-1">
              {heartbeat.consecutiveFailures} falha(s) consecutiva(s)
            </div>
          )}
          {heartbeat.lastError && (
            <div className="text-[10px] text-destructive/80 mt-1 truncate">
              {heartbeat.lastError.slice(0, 100)}
            </div>
          )}
        </div>
        <StatusBadge tone={tone} label={label} dot size="sm" />
      </div>
    </Link>
  );
}

function ActionRow({ item, now }: { item: ActivityItem; now: number }) {
  const tone = actionTone(item.action);
  return (
    <div className="p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot tone={tone} />
          <span className="font-mono text-primary">{item.action}</span>
          {item.product?.slug && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
              · {item.product.slug}
            </span>
          )}
        </div>
        <span className="text-muted-foreground tabular-nums shrink-0">
          {formatRelativeTime(item.executedAt, now)}
        </span>
      </div>
      <div className="text-muted-foreground mt-1 ml-3.5">
        {item.entityName || item.entityType}
        {item.details ? ` — ${item.details}` : ""}
      </div>
    </div>
  );
}

function actionTone(action: string): Tone {
  if (action.includes("scale")) return "success";
  if (action.includes("pause") || action.includes("emergency") || action.includes("chargeback"))
    return "danger";
  if (action.includes("warning") || action.includes("alert") || action.includes("refund"))
    return "warning";
  if (action.includes("sale_approved") || action.includes("ab_test_concluded")) return "success";
  return "info";
}

function computeOverallHealth(
  hearts: HeartbeatItem[],
  now: number,
): { tone: Tone; label: string } {
  if (hearts.length === 0) return { tone: "muted", label: "Sem dado" };
  let worst: Tone = "success";
  for (const h of hearts) {
    if (!h.lastCollectionAt) {
      worst = compareTone(worst, "muted");
      continue;
    }
    const hoursSince = (now - new Date(h.lastCollectionAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince > 8) worst = compareTone(worst, "danger");
    else if (hoursSince > 5) worst = compareTone(worst, "warning");
  }
  const label =
    worst === "success"
      ? "Agente saudavel"
      : worst === "warning"
        ? "Agente com atrasos"
        : worst === "danger"
          ? "Agente parado"
          : "Sem dado";
  return { tone: worst, label };
}

function compareTone(a: Tone, b: Tone): Tone {
  const order: Tone[] = ["success", "info", "muted", "warning", "danger"];
  return order.indexOf(b) > order.indexOf(a) ? b : a;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

function nextCycleEta(hearts: HeartbeatItem[], now: number): string {
  if (hearts.length === 0 || now === 0) return "—";
  const last = hearts.reduce<number>((acc, h) => {
    if (!h.lastCollectionAt) return acc;
    return Math.max(acc, new Date(h.lastCollectionAt).getTime());
  }, 0);
  if (last === 0) return "qualquer momento";
  const next = last + CYCLE_HOURS_DEFAULT * 60 * 60 * 1000;
  const diff = next - now;
  if (diff < 0) return "qualquer momento";
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? ` ${m}min` : ""}`;
}
