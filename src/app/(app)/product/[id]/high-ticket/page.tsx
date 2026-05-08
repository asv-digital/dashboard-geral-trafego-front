"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type HighTicketSaleItem,
  type HighTicketSummaryResponse,
} from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";

export default function HighTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["high-ticket", "list", id],
    queryFn: () => api.listHighTicketSales(id, 90),
  });
  const summary = useQuery({
    queryKey: ["high-ticket", "summary", id],
    queryFn: () => api.highTicketSummary(id, 90),
  });

  const sync = useMutation({
    mutationFn: () => api.syncHighTicketSales(id),
    onSuccess: r => {
      setFeedback(`${r.matched}/${r.total} vendas matched (${r.unmatched} sem match)`);
      setTimeout(() => setFeedback(null), 4000);
      queryClient.invalidateQueries({ queryKey: ["high-ticket", "list", id] });
      queryClient.invalidateQueries({ queryKey: ["high-ticket", "summary", id] });
    },
    onError: () => setFeedback("erro ao sincronizar"),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="High Ticket (mentoria)"
        subtitle="Painel manual — registra vendas high ticket vindas deste funil. Nao influencia decisoes automaticas do agente, so consolida ROI."
      />

      {/* Card resumo consolidado */}
      <SummaryCard data={summary.data} loading={summary.isLoading} />

      {/* Ações */}
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={() => setShowForm(s => !s)}
          className="text-sm px-3 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          {showForm ? "cancelar" : "+ registrar venda high ticket"}
        </button>
        <button
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          className="text-sm px-3 py-2 bg-muted hover:bg-muted/70 rounded-md transition-colors disabled:opacity-50"
        >
          {sync.isPending ? "sincronizando..." : "🔄 sincronizar com vendas low"}
        </button>
        {feedback && <span className="text-xs text-muted-foreground">{feedback}</span>}
      </div>

      {showForm && (
        <NewSaleForm
          productId={id}
          onCreated={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["high-ticket", "list", id] });
            queryClient.invalidateQueries({ queryKey: ["high-ticket", "summary", id] });
          }}
        />
      )}

      {/* Lista de vendas */}
      <SalesTable
        items={list.data?.items ?? []}
        loading={list.isLoading}
        productId={id}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: ["high-ticket", "list", id] });
          queryClient.invalidateQueries({ queryKey: ["high-ticket", "summary", id] });
        }}
      />
    </div>
  );
}

// ─── Summary Card ───────────────────────────────────────────────────

function SummaryCard({
  data,
  loading,
}: {
  data: HighTicketSummaryResponse | undefined;
  loading: boolean;
}) {
  if (loading || !data) {
    return <div className="h-40 bg-card border border-border rounded-lg animate-pulse" />;
  }
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-medium">ROI consolidado (low + high)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Últimos {data.windowDays}d · spend de tráfego × revenue total
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Mini label="Spend tráfego" value={formatBRL(data.spend)} />
        <Mini
          label="Revenue total"
          value={formatBRL(data.totalRevenue)}
          tone="success"
          hint={`low ${formatBRL(data.lowTickets.revenue)} + high ${formatBRL(data.highTickets.revenue)}`}
        />
        <Mini
          label="Profit líquido"
          value={formatBRL(data.netProfit)}
          tone={data.netProfit > 0 ? "success" : data.netProfit < 0 ? "danger" : undefined}
        />
        <Mini
          label="ROI"
          value={data.consolidatedROI ? `${data.consolidatedROI.toFixed(2)}x` : "—"}
          tone={
            data.consolidatedROI && data.consolidatedROI >= 2
              ? "success"
              : data.consolidatedROI && data.consolidatedROI < 1
                ? "danger"
                : undefined
          }
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <Mini label="Vendas low" value={`${data.lowTickets.count}`} />
        <Mini
          label="Vendas high"
          value={`${data.highTickets.count}`}
          hint={data.unmatchedCount > 0 ? `${data.unmatchedCount} sem match` : "todas matched"}
        />
        <Mini
          label="Conv low → high"
          value={`${data.conversionLowToHigh.toFixed(1)}%`}
          tone={data.conversionLowToHigh >= 5 ? "success" : undefined}
        />
        <Mini
          label="LTV médio"
          value={formatBRL(data.avgLtvPerCustomer)}
          hint={`${data.uniqueCustomers} customers únicos`}
        />
      </div>
    </section>
  );
}

function Mini({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
  hint?: string;
}) {
  return (
    <div className="bg-muted/20 border border-border rounded px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`text-base font-medium tabular-nums mt-0.5 ${
          tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : ""
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

// ─── Form ───────────────────────────────────────────────────────────

function NewSaleForm({
  productId,
  onCreated,
}: {
  productId: string;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("17000");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.createHighTicketSale(productId, {
        customerEmail: email.trim(),
        amountGross: parseFloat(amount.replace(",", ".")),
        saleDate: new Date(date).toISOString(),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setEmail("");
      setAmount("17000");
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setError(null);
      onCreated();
    },
    onError: () => setError("erro ao salvar (verifique email e valor)"),
  });

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (!email || !amount) return;
        create.mutate();
      }}
      className="bg-card border border-border rounded-lg p-5 space-y-3"
    >
      <h3 className="text-sm font-medium">Registrar venda high ticket</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Email do customer" required>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
            placeholder="cliente@exemplo.com"
          />
        </Field>
        <Field label="Valor (R$)" required>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm tabular-nums"
            placeholder="17000"
          />
        </Field>
        <Field label="Data da venda" required>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
          />
        </Field>
        <Field label="Notas (opcional)">
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={500}
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
            placeholder="ex: live 12/05, fechou no PIX"
          />
        </Field>
      </div>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={create.isPending || !email || !amount}
          className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {create.isPending ? "salvando..." : "salvar"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

// ─── Lista ──────────────────────────────────────────────────────────

function SalesTable({
  items,
  loading,
  productId,
  onDeleted,
}: {
  items: HighTicketSaleItem[];
  loading: boolean;
  productId: string;
  onDeleted: () => void;
}) {
  const del = useMutation({
    mutationFn: (id: string) => api.deleteHighTicketSale(productId, id),
    onSuccess: onDeleted,
  });

  if (loading) {
    return <div className="h-40 bg-card border border-border rounded-lg animate-pulse" />;
  }
  if (items.length === 0) {
    return (
      <section className="border border-dashed border-border rounded-lg p-12 text-center">
        <p className="text-muted-foreground text-sm">Nenhuma venda high ticket registrada.</p>
        <p className="text-muted-foreground/70 text-xs mt-1">
          Quando vender high ticket para um buyer deste funil, registre aqui.
        </p>
      </section>
    );
  }

  const columns: Column<HighTicketSaleItem>[] = [
    {
      key: "customerEmail",
      label: "Email",
      sortable: true,
      sortValue: r => r.customerEmail,
      searchable: r => `${r.customerEmail} ${r.notes ?? ""}`,
      exportValue: r => r.customerEmail,
      render: r => <span className="truncate inline-block max-w-[220px]">{r.customerEmail}</span>,
    },
    {
      key: "saleDate",
      label: "Data",
      sortable: true,
      sortValue: r => r.saleDate,
      exportValue: r => r.saleDate.slice(0, 10),
      render: r => <span className="text-muted-foreground text-xs">{r.saleDate.slice(0, 10)}</span>,
    },
    {
      key: "amountGross",
      label: "Valor",
      align: "right",
      sortable: true,
      sortValue: r => r.amountGross,
      exportValue: r => r.amountGross,
      render: r => formatBRL(r.amountGross),
    },
    {
      key: "match",
      label: "Match",
      sortable: true,
      sortValue: r => (r.matchedSale ? 1 : 0),
      exportValue: r => (r.matchedSale ? "matched" : "sem match"),
      render: r =>
        r.matchedSale ? (
          <StatusBadge size="sm" tone="success" label="Matched" dot />
        ) : (
          <StatusBadge size="sm" tone="warning" label="Sem match" />
        ),
    },
    {
      key: "notes",
      label: "Notas",
      exportValue: r => r.notes,
      render: r => (
        <span className="text-xs text-muted-foreground truncate inline-block max-w-[200px]">
          {r.notes || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Acoes",
      align: "right",
      render: r => (
        <button
          onClick={() => {
            if (confirm(`Apagar venda de ${r.customerEmail}?`)) del.mutate(r.id);
          }}
          className="text-xs text-destructive hover:underline"
        >
          apagar
        </button>
      ),
    },
  ];

  return (
    <section>
      <SectionHeader title={`Vendas registradas (${items.length})`} />
      <DataTable
        columns={columns}
        data={items}
        keyOf={r => r.id}
        exportFilename="high-ticket-sales.csv"
        initialSort={{ key: "saleDate", dir: "desc" }}
      />
    </section>
  );
}
