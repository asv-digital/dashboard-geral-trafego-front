"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ProductAutomationConfig } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";

type EditableAutomationConfig = Omit<
  ProductAutomationConfig,
  "id" | "productId" | "createdAt" | "updatedAt"
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
