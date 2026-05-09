"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  api,
  type ActionLogItem,
  type ActionSummaryItem,
} from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/lib/format";

export default function DecisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [filter, setFilter] = useState("");

  const { data } = useQuery({
    queryKey: ["actions", id, filter],
    queryFn: () => api.listActions(id, { limit: 200, action: filter || undefined }),
    refetchInterval: 30_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["actions", "summary", id],
    queryFn: () => api.actionsSummary(id, 7),
  });

  const summaryItems = summary?.summary ?? [];
  const actions = data?.actions ?? [];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Trading Journal"
        subtitle="Todas as decisoes que o agente tomou — input, raciocinio, acao."
      />

      <div className="flex gap-2 flex-wrap">
        <FilterChip
          label={`todas (${data?.total ?? 0})`}
          active={!filter}
          onClick={() => setFilter("")}
        />
        {summaryItems.map(item => (
          <SummaryFilterChip
            key={item.action}
            item={item}
            active={filter === item.action}
            onClick={() => setFilter(item.action)}
          />
        ))}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {actions.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            Nenhuma decisão no filtro atual
          </div>
        ) : (
          <div className="divide-y divide-border">
            {actions.map(action => (
              <DecisionRow key={action.id} action={action} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryFilterChip({
  item,
  active,
  onClick,
}: {
  item: ActionSummaryItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <FilterChip
      label={`${item.action} (${item.count})`}
      active={active}
      onClick={onClick}
    />
  );
}

function DecisionRow({ action }: { action: ActionLogItem }) {
  const hasInputSnapshot = action.inputSnapshot != null;
  const hasOutcome = action.outcome != null;
  const hasDetails = !!action.reasoning || hasInputSnapshot || hasOutcome;

  return (
    <details className="group">
      <summary
        className={`p-4 hover:bg-muted/20 list-none ${
          hasDetails ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-primary">{action.action}</span>
              {action.entityType && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                  {action.entityType}
                </span>
              )}
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                {action.source}
              </span>
              {hasDetails && (
                <span className="text-[10px] text-muted-foreground ml-auto group-open:hidden">
                  ▸ raciocínio
                </span>
              )}
            </div>
            {action.entityName && <div className="text-sm mt-1">{action.entityName}</div>}
            {action.details && (
              <div className="text-xs text-muted-foreground mt-1">{action.details}</div>
            )}
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
            {formatDateTime(action.executedAt)}
          </div>
        </div>
      </summary>
      {hasDetails && (
        <div className="px-4 pb-4 space-y-3 bg-muted/10">
          {action.reasoning && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Raciocínio
              </div>
              <div className="text-xs mt-1 text-foreground/80 leading-relaxed">
                {action.reasoning}
              </div>
            </div>
          )}
          {hasInputSnapshot && (
            <JsonBlock
              label="Input que levou à decisão"
              value={action.inputSnapshot}
            />
          )}
          {hasOutcome && (
            <JsonBlock
              label="Outcome retroativo (medido 24h depois)"
              value={action.outcome}
            />
          )}
        </div>
      )}
    </details>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(value, null, 2);
  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard sem permissão — ignora */
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <button
          onClick={copy}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          title="copiar JSON"
        >
          {copied ? "✓ copiado" : "copiar"}
        </button>
      </div>
      <pre className="text-[10px] mt-1 text-muted-foreground bg-background border border-border rounded p-2 overflow-x-auto font-mono leading-relaxed">
        {json}
      </pre>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
