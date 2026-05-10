"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ABTestItem } from "@/lib/api";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { StatusBadge, type Tone } from "@/components/ui/status-badge";

export default function ABTestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: running, isLoading: lr } = useQuery({
    queryKey: ["ab-tests", id, "running"],
    queryFn: () => api.listABTests(id, "running"),
    refetchInterval: 60_000,
  });
  const { data: history } = useQuery({
    queryKey: ["ab-tests", id, "history"],
    queryFn: () => api.listABTests(id),
  });

  const cancel = useMutation({
    mutationFn: (testId: string) => api.cancelABTest(testId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ab-tests", id] }),
  });

  const runningList = running?.tests ?? [];
  const concluded = (history?.tests ?? []).filter(
    t => t.status === "concluded" || t.status === "cancelled",
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="A/B tests"
        subtitle="Compara 2 anuncios no mesmo adset. Resolver decide winner via Z-test 95%, pausa o loser."
        actions={
          <button
            onClick={() => setShowForm(s => !s)}
            className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90"
          >
            {showForm ? "fechar" : "+ novo teste"}
          </button>
        }
      />

      {showForm && (
        <NewTestForm
          productId={id}
          onCreated={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["ab-tests", id] });
          }}
        />
      )}

      <section>
        <SectionHeader
          title={`Em execucao (${runningList.length})`}
          hint="Resolver roda a cada ciclo do agente. Decide quando minDays + minSpendPerVariant atingidos."
        />
        {lr ? (
          <div className="text-xs text-muted-foreground">carregando...</div>
        ) : runningList.length === 0 ? (
          <div className="text-xs text-muted-foreground italic border border-dashed border-border rounded-lg p-6 text-center">
            Nenhum teste rodando. Abra um clicando em &quot;novo teste&quot;.
          </div>
        ) : (
          <div className="space-y-2">
            {runningList.map(t => (
              <TestRow
                key={t.id}
                test={t}
                onCancel={() => {
                  if (confirm("Cancelar este teste?")) cancel.mutate(t.id);
                }}
                cancelling={cancel.isPending && cancel.variables === t.id}
              />
            ))}
          </div>
        )}
      </section>

      {concluded.length > 0 && (
        <section>
          <SectionHeader title={`Historico (${concluded.length})`} />
          <div className="space-y-2">
            {concluded.slice(0, 20).map(t => (
              <TestRow key={t.id} test={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TestRow({
  test,
  onCancel,
  cancelling,
}: {
  test: ABTestItem;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const tone: Tone =
    test.status === "running"
      ? "info"
      : test.status === "concluded"
        ? "success"
        : "muted";
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-medium">{test.name}</h3>
        <div className="flex items-center gap-2">
          <StatusBadge tone={tone} label={test.status} dot size="sm" />
          {test.status === "running" && onCancel && (
            <button
              onClick={onCancel}
              disabled={cancelling}
              className="text-[10px] text-destructive hover:underline disabled:opacity-50"
            >
              {cancelling ? "cancelando..." : "cancelar"}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Variante A</div>
          <div className="font-medium">{test.variantA.name}</div>
          <div className="text-muted-foreground tabular-nums">{test.variantA.metaAdId}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Variante B</div>
          <div className="font-medium">{test.variantB.name}</div>
          <div className="text-muted-foreground tabular-nums">{test.variantB.metaAdId}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>adset: <code>{test.adsetId}</code></span>
        <span>min {test.minDays}d</span>
        <span>min R${test.minSpendPerVariant.toFixed(0)}/variante</span>
        <span>desde {new Date(test.startDate).toLocaleDateString("pt-BR")}</span>
      </div>
      {test.winner && (
        <div className="text-xs">
          <strong className="text-success">Winner: {test.winner}</strong>
          {test.confidence !== null && (
            <span className="text-muted-foreground ml-2">
              {(test.confidence * 100).toFixed(0)}% confianca
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function NewTestForm({
  productId,
  onCreated,
}: {
  productId: string;
  onCreated: () => void;
}) {
  const { data: adsets } = useQuery({
    queryKey: ["adsets", productId],
    queryFn: () => api.listAdsets(productId),
  });
  const [name, setName] = useState("");
  const [adsetId, setAdsetId] = useState("");
  const [variantA, setVariantA] = useState({ name: "", metaAdId: "" });
  const [variantB, setVariantB] = useState({ name: "", metaAdId: "" });
  const [minDays, setMinDays] = useState("5");
  const [minSpend, setMinSpend] = useState("100");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.createABTest({
        productId,
        name: name.trim(),
        adsetId: adsetId.trim(),
        variantA: { name: variantA.name.trim(), metaAdId: variantA.metaAdId.trim() },
        variantB: { name: variantB.name.trim(), metaAdId: variantB.metaAdId.trim() },
        minDays: Number(minDays),
        minSpendPerVariant: Number(minSpend),
      }),
    onSuccess: () => {
      setError(null);
      onCreated();
    },
    onError: (err: Error) => setError(err.message || "falha"),
  });

  const valid =
    name.length > 2 &&
    adsetId &&
    variantA.name &&
    variantA.metaAdId &&
    variantB.name &&
    variantB.metaAdId &&
    variantA.metaAdId !== variantB.metaAdId;

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (valid) create.mutate();
      }}
      className="bg-card border border-border rounded-lg p-5 space-y-3"
    >
      <h3 className="text-sm font-medium">Novo A/B test</h3>
      <Field label="Nome do teste" required>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="ex: Hook prova vs hook dor"
          className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
        />
      </Field>
      <Field label="Adset" required>
        <select
          value={adsetId}
          onChange={e => setAdsetId(e.target.value)}
          required
          className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
        >
          <option value="">selecione...</option>
          {(adsets?.adsets ?? []).map(a => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.campaignName}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <fieldset className="space-y-2 border border-border/40 rounded p-3">
          <legend className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">
            Variante A
          </legend>
          <Field label="Nome">
            <input
              value={variantA.name}
              onChange={e => setVariantA(v => ({ ...v, name: e.target.value }))}
              placeholder="ex: hook prova"
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-xs"
            />
          </Field>
          <Field label="Meta Ad ID">
            <input
              value={variantA.metaAdId}
              onChange={e => setVariantA(v => ({ ...v, metaAdId: e.target.value }))}
              placeholder="120211..."
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-xs tabular-nums"
            />
          </Field>
        </fieldset>
        <fieldset className="space-y-2 border border-border/40 rounded p-3">
          <legend className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">
            Variante B
          </legend>
          <Field label="Nome">
            <input
              value={variantB.name}
              onChange={e => setVariantB(v => ({ ...v, name: e.target.value }))}
              placeholder="ex: hook dor"
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-xs"
            />
          </Field>
          <Field label="Meta Ad ID">
            <input
              value={variantB.metaAdId}
              onChange={e => setVariantB(v => ({ ...v, metaAdId: e.target.value }))}
              placeholder="120212..."
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-xs tabular-nums"
            />
          </Field>
        </fieldset>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mínimo de dias">
          <input
            type="number"
            min={1}
            max={30}
            value={minDays}
            onChange={e => setMinDays(e.target.value)}
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
          />
        </Field>
        <Field label="Mínimo R$ por variante">
          <input
            type="number"
            min={1}
            value={minSpend}
            onChange={e => setMinSpend(e.target.value)}
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
          />
        </Field>
      </div>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <div className="text-[11px] text-muted-foreground">
        Resolver decide winner com Z-test (95% confianca, min 20 conversoes/variante)
        depois que minDays e minSpend forem atingidos.
      </div>
      <button
        type="submit"
        disabled={!valid || create.isPending}
        className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {create.isPending ? "criando..." : "Abrir teste"}
      </button>
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
