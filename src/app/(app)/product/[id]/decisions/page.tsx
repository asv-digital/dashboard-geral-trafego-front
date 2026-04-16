"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  api,
  type ActionLogItem,
  type ActionSummaryItem,
} from "@/lib/api";

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
    <div className="p-8 space-y-6">
      <header>
        <h2 className="text-xl font-heading font-semibold">Trading Journal</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Todas as decisões que o agente tomou — input, raciocínio, ação.
        </p>
      </header>

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
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(action.executedAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
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
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Input que levou à decisão
              </div>
              <pre className="text-[10px] mt-1 text-muted-foreground bg-background border border-border rounded p-2 overflow-x-auto">
                {JSON.stringify(action.inputSnapshot, null, 2)}
              </pre>
            </div>
          )}
          {hasOutcome && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Outcome retroativo
              </div>
              <pre className="text-[10px] mt-1 text-muted-foreground bg-background border border-border rounded p-2 overflow-x-auto">
                {JSON.stringify(action.outcome, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </details>
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
