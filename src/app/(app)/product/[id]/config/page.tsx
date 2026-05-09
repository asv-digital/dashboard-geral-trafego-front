"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ProductAutomationConfig } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBRL } from "@/lib/format";
import { Trash2 } from "lucide-react";

type EditableAutomationConfig = Omit<
  ProductAutomationConfig,
  "id" | "productId" | "createdAt" | "updatedAt" | "calibratedFromRealData" | "calibratedAt"
>;

export default function ConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id),
  });

  const [draft, setDraft] = useState<Partial<EditableAutomationConfig>>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const automationConfig = data?.product?.automationConfig;
  const baseForm = automationConfig ? toEditableAutomationConfig(automationConfig) : null;
  const form = baseForm ? { ...baseForm, ...draft } : null;

  const mutation = useMutation({
    mutationFn: (payload: EditableAutomationConfig) =>
      api.updateAutomationConfig(id, payload),
    onSuccess: () => {
      setSaved(true);
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      window.setTimeout(() => setSaved(false), 2000);
    },
    onError: err => {
      setSaveError(err instanceof Error ? err.message : "falha ao salvar config");
    },
  });

  const setField = <K extends keyof EditableAutomationConfig>(
    key: K,
    value: EditableAutomationConfig[K]
  ) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (form) {
      mutation.mutate(form);
    }
  };

  if (!form) {
    return <div className="p-8 text-muted-foreground">carregando…</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <PageHeader
        title="Config de automacao"
        subtitle="Thresholds derivados da economia do produto. Sobrescreva manualmente se souber o que esta fazendo."
      />

      <SupervisedModeCard productId={id} />

      <NichesCard productId={id} />

      <MonthlyGoalsCard productId={id} />

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <Section title="Auto-pause">
          <Toggle
            label="Pausar sem vendas"
            value={form.autoPauseNoSales}
            onChange={value => setField("autoPauseNoSales", value)}
          />
          <NumField
            label="Limite de gasto sem venda (R$)"
            value={form.autoPauseSpendLimit}
            onChange={value => setField("autoPauseSpendLimit", value)}
          />
          <Toggle
            label="Pausar por breakeven"
            value={form.autoPauseBreakeven}
            onChange={value => setField("autoPauseBreakeven", value)}
          />
          <NumField
            label="Breakeven CPA (R$)"
            value={form.breakevenCPA}
            onChange={value => setField("breakevenCPA", value)}
          />
          <NumField
            label="Dias mínimos antes de pausar por breakeven"
            value={form.breakevenMinDays}
            onChange={value => setField("breakevenMinDays", value)}
          />
        </Section>

        <Section title="Auto-scale">
          <Toggle
            label="Escalar winners automaticamente"
            value={form.autoScaleWinners}
            onChange={value => setField("autoScaleWinners", value)}
          />
          <NumField
            label="CPA threshold para scale (R$)"
            value={form.autoScaleCPAThreshold}
            onChange={value => setField("autoScaleCPAThreshold", value)}
          />
          <NumField
            label="Percentual de scale (%)"
            value={form.autoScalePercent}
            onChange={value => setField("autoScalePercent", value)}
          />
          <NumField
            label="Dias mínimos antes de scale"
            value={form.autoScaleMinDays}
            onChange={value => setField("autoScaleMinDays", value)}
          />
          <NumField
            label="Budget máximo por adset (R$)"
            value={form.autoScaleMaxBudget}
            onChange={value => setField("autoScaleMaxBudget", value)}
          />
        </Section>

        <Section title="Criativos + frequência">
          <Toggle
            label="Rotação automática de criativos exaustos"
            value={form.autoRotateCreatives}
            onChange={value => setField("autoRotateCreatives", value)}
          />
          <NumField
            label="CPA pause threshold (R$)"
            value={form.cpaPauseThreshold}
            onChange={value => setField("cpaPauseThreshold", value)}
          />
          <Toggle
            label="Pausar por frequência alta"
            value={form.autoPauseFrequency}
            onChange={value => setField("autoPauseFrequency", value)}
          />
          <NumField
            label="Freq cap prospecção"
            value={form.frequencyLimitProspection}
            onChange={value => setField("frequencyLimitProspection", value)}
          />
          <NumField
            label="Freq cap remarketing"
            value={form.frequencyLimitRemarketing}
            onChange={value => setField("frequencyLimitRemarketing", value)}
          />
        </Section>

        <Section title="Budget caps/pisos">
          <NumField
            label="Cap prospecção (R$)"
            value={form.budgetCapProspection}
            onChange={value => setField("budgetCapProspection", value)}
          />
          <NumField
            label="Cap remarketing (R$)"
            value={form.budgetCapRemarketing}
            onChange={value => setField("budgetCapRemarketing", value)}
          />
          <NumField
            label="Cap ASC (R$)"
            value={form.budgetCapASC}
            onChange={value => setField("budgetCapASC", value)}
          />
          <NumField
            label="Piso prospecção (R$)"
            value={form.budgetFloorProspection}
            onChange={value => setField("budgetFloorProspection", value)}
          />
          <NumField
            label="Piso remarketing (R$)"
            value={form.budgetFloorRemarketing}
            onChange={value => setField("budgetFloorRemarketing", value)}
          />
        </Section>

        <Section title="Outros">
          <Toggle
            label="Respeitar learning phase (72h)"
            value={form.respectLearningPhase}
            onChange={value => setField("respectLearningPhase", value)}
          />
          <NumField
            label="Horas de learning phase"
            value={form.learningPhaseHours}
            onChange={value => setField("learningPhaseHours", value)}
          />
          <Toggle
            label="Dayparting ativo"
            value={form.daypartingEnabled}
            onChange={value => setField("daypartingEnabled", value)}
          />
          <Toggle
            label="Notificar ações automáticas no WhatsApp"
            value={form.notifyOnAutoAction}
            onChange={value => setField("notifyOnAutoAction", value)}
          />
        </Section>

        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? "salvando…" : "Salvar"}
          </button>
          {saved && <span className="text-xs text-success">✓ salvo</span>}
          {saveError && <span className="text-xs text-destructive">{saveError}</span>}
        </div>
      </form>
    </div>
  );
}

function toEditableAutomationConfig(
  config: ProductAutomationConfig
): EditableAutomationConfig {
  return {
    autoPauseNoSales: config.autoPauseNoSales,
    autoPauseSpendLimit: config.autoPauseSpendLimit,
    autoPauseBreakeven: config.autoPauseBreakeven,
    breakevenCPA: config.breakevenCPA,
    breakevenMinDays: config.breakevenMinDays,
    autoScaleWinners: config.autoScaleWinners,
    autoScaleCPAThreshold: config.autoScaleCPAThreshold,
    autoScalePercent: config.autoScalePercent,
    autoScaleMinDays: config.autoScaleMinDays,
    autoScaleMaxBudget: config.autoScaleMaxBudget,
    respectLearningPhase: config.respectLearningPhase,
    learningPhaseHours: config.learningPhaseHours,
    autoRotateCreatives: config.autoRotateCreatives,
    cpaPauseThreshold: config.cpaPauseThreshold,
    notifyOnAutoAction: config.notifyOnAutoAction,
    autoPauseFrequency: config.autoPauseFrequency,
    frequencyLimitProspection: config.frequencyLimitProspection,
    frequencyLimitRemarketing: config.frequencyLimitRemarketing,
    budgetCapProspection: config.budgetCapProspection,
    budgetCapRemarketing: config.budgetCapRemarketing,
    budgetCapASC: config.budgetCapASC,
    budgetFloorProspection: config.budgetFloorProspection,
    budgetFloorRemarketing: config.budgetFloorRemarketing,
    daypartingEnabled: config.daypartingEnabled,
  };
}

function SupervisedModeCard({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.getProduct(productId),
  });
  const supervisedMode = !!data?.product?.supervisedMode;
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);

  const mutation = useMutation({
    mutationFn: (next: boolean) => api.updateProduct(productId, { supervisedMode: next }),
    onSuccess: () => {
      setPendingValue(null);
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "pulse", productId] });
    },
    onError: () => setPendingValue(null),
  });

  const handleToggle = (next: boolean) => {
    if (next === supervisedMode) return;
    if (next === true) {
      const ok = window.confirm(
        "Ligar SUPERVISED MODE?\n\nO agente vai parar de executar acoes (pause/scale/rebalance) automaticamente, mas continua coletando dado e sugerindo decisoes.\n\nIdeal pra observar campanhas existentes sem risco antes de delegar.",
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(
        "DESLIGAR supervised mode?\n\nA partir de agora o agente vai EXECUTAR acoes (pausar adsets ruins, escalar winners, rotacionar criativos exaustos) nas campanhas whitelisted.\n\nTem certeza?",
      );
      if (!ok) return;
    }
    setPendingValue(next);
    mutation.mutate(next);
  };

  const displayValue = pendingValue !== null ? pendingValue : supervisedMode;

  return (
    <section className="mt-6 bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-medium">Modo de operacao</h3>
            <StatusBadge
              tone={displayValue ? "warning" : "success"}
              label={displayValue ? "Supervisionado" : "Autonomo"}
              dot
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xl">
            {displayValue
              ? "Agente coleta dado e sugere acoes mas NAO executa nada no Meta. Ideal pra observar campanhas existentes antes de delegar."
              : "Agente executa pause/scale/rebalance autonomamente conforme thresholds abaixo. So liga isto quando confiar nas regras."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(!displayValue)}
          disabled={mutation.isPending}
          className={
            displayValue
              ? "px-4 py-2 text-sm bg-success/10 text-success border border-success/40 rounded-md hover:bg-success/20 transition-colors disabled:opacity-50"
              : "px-4 py-2 text-sm bg-warning/10 text-warning border border-warning/40 rounded-md hover:bg-warning/20 transition-colors disabled:opacity-50"
          }
        >
          {mutation.isPending
            ? "salvando…"
            : displayValue
              ? "Desligar supervised mode"
              : "Ligar supervised mode"}
        </button>
      </div>
    </section>
  );
}

function NichesCard({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.getProduct(productId),
  });
  const product = data?.product;
  const current = product?.niches?.split(",").map(s => s.trim()).filter(Boolean) ?? [];
  const [draft, setDraft] = useState(current.join(", "));
  const [saved, setSaved] = useState(false);

  const update = useMutation({
    mutationFn: (niches: string) => api.updateProduct(productId, { niches }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
    },
  });

  return (
    <section className="mt-6 bg-card border border-border rounded-lg p-5 space-y-3">
      <div>
        <h3 className="text-base font-medium">Sub-nichos (opcional)</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Quando o produto serve multiplos nichos (ex: advocacia, contabilidade, engenharia), o
          planner gera 1 estrutura de campanha POR nicho. Se vazio, planner trata como funil unico.
        </p>
      </div>
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Nichos (separados por virgula)</label>
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="ex: advocacia, contabilidade, engenharia"
            className="w-full mt-1 px-2.5 py-1.5 bg-input border border-border rounded text-sm"
          />
        </div>
        <button
          onClick={() => update.mutate(draft.trim() || "")}
          disabled={update.isPending}
          className="px-4 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {update.isPending ? "salvando…" : "Salvar"}
        </button>
        {saved && <span className="text-xs text-success self-center">salvo</span>}
      </div>
      {current.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
          {current.map(n => (
            <span key={n} className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
              {n}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function MonthlyGoalsCard({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["monthly-goals", productId],
    queryFn: () => api.listMonthlyGoals(productId),
  });

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [targetSales, setTargetSales] = useState("");
  const [targetCpa, setTargetCpa] = useState("");
  const [targetRoas, setTargetRoas] = useState("");
  const [error, setError] = useState<string | null>(null);

  const upsert = useMutation({
    mutationFn: () =>
      api.upsertMonthlyGoal(productId, {
        month,
        targetSales: parseInt(targetSales, 10),
        targetCpa: targetCpa ? parseFloat(targetCpa.replace(",", ".")) : undefined,
        targetRoas: targetRoas ? parseFloat(targetRoas.replace(",", ".")) : undefined,
      }),
    onSuccess: () => {
      setError(null);
      setTargetSales("");
      setTargetCpa("");
      setTargetRoas("");
      queryClient.invalidateQueries({ queryKey: ["monthly-goals", productId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "monthly-pace", productId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "pulse", productId] });
    },
    onError: () => setError("falha ao salvar meta"),
  });

  const del = useMutation({
    mutationFn: (goalId: string) => api.deleteMonthlyGoal(productId, goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-goals", productId] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "monthly-pace", productId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSales || parseInt(targetSales, 10) <= 0) {
      setError("targetSales obrigatorio");
      return;
    }
    upsert.mutate();
  };

  const goals = data?.goals ?? [];

  return (
    <section className="mt-6 bg-card border border-border rounded-lg p-5 space-y-4">
      <div>
        <h3 className="text-base font-medium">Metas mensais (pacing)</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Sobral way: meta mensal direciona quao agressivo o agente escala. Sem meta, agente roda apenas com regras tecnicas.
          Cadastra a meta de vendas do mes — o agente compara com vendas reais e ajusta dinamicamente o threshold de scale.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-1">
          <label className="text-xs text-muted-foreground">Mes</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="w-full mt-1 px-2.5 py-1.5 bg-input border border-border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Vendas alvo</label>
          <input
            type="number"
            min="1"
            value={targetSales}
            onChange={e => setTargetSales(e.target.value)}
            placeholder="120"
            className="w-full mt-1 px-2.5 py-1.5 bg-input border border-border rounded text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">CPA alvo (R$, opcional)</label>
          <input
            type="text"
            inputMode="decimal"
            value={targetCpa}
            onChange={e => setTargetCpa(e.target.value)}
            placeholder="ex: 75"
            className="w-full mt-1 px-2.5 py-1.5 bg-input border border-border rounded text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">ROAS alvo (opcional)</label>
          <input
            type="text"
            inputMode="decimal"
            value={targetRoas}
            onChange={e => setTargetRoas(e.target.value)}
            placeholder="ex: 1.6"
            className="w-full mt-1 px-2.5 py-1.5 bg-input border border-border rounded text-sm tabular-nums"
          />
        </div>
        <button
          type="submit"
          disabled={upsert.isPending}
          className="px-4 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {upsert.isPending ? "salvando…" : "Salvar / Atualizar"}
        </button>
      </form>
      {error && <div className="text-xs text-destructive">{error}</div>}

      <div className="border border-border rounded">
        {isLoading ? (
          <div className="p-4 text-xs text-muted-foreground">carregando…</div>
        ) : goals.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground italic">
            Nenhuma meta cadastrada. Sem meta, agente roda em modo &quot;regras tecnicas puras&quot; (sem ajuste de pacing).
          </div>
        ) : (
          <div className="divide-y divide-border">
            {goals.map(g => (
              <div key={g.id} className="px-3 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-primary">{g.month}</span>
                  <span className="tabular-nums">
                    <strong className="text-foreground">{g.targetSales}</strong> vendas
                  </span>
                  {g.targetCpa != null && (
                    <span className="text-muted-foreground tabular-nums">CPA &lt; {formatBRL(g.targetCpa)}</span>
                  )}
                  {g.targetRoas != null && (
                    <span className="text-muted-foreground tabular-nums">ROAS &gt; {g.targetRoas.toFixed(2)}x</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Apagar meta de ${g.month}?`)) del.mutate(g.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        {children}
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-muted-foreground flex-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        step="any"
        className="w-28 px-3 py-1.5 bg-input border border-border rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={event => onChange(event.target.checked)}
        className="w-4 h-4 accent-primary"
      />
    </label>
  );
}
