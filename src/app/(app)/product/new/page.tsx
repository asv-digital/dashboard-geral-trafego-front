"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type NewProductInput, type ProductStage } from "@/lib/api";

interface NewProductFormState {
  slug: string;
  name: string;
  description: string;
  stage: ProductStage;
  priceGross: string;
  gatewayFeeRate: string;
  dailyBudgetTarget: string;
  kirvanoProductId: string;
  landingUrl: string;
  defaultHeadline: string;
  defaultDescription: string;
  defaultCTA: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<NewProductFormState>({
    slug: "",
    name: "",
    description: "",
    stage: "launch",
    priceGross: "",
    gatewayFeeRate: "0.035",
    dailyBudgetTarget: "",
    kirvanoProductId: "",
    landingUrl: "",
    defaultHeadline: "",
    defaultDescription: "",
    defaultCTA: "LEARN_MORE",
  });
  const [autoActivate, setAutoActivate] = useState(false);
  const [supervisedMode, setSupervisedMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof NewProductFormState>(
    key: K,
    value: NewProductFormState[K]
  ) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: NewProductInput = {
        slug: form.slug,
        name: form.name,
        description: form.description || undefined,
        stage: form.stage,
        priceGross: Number(form.priceGross),
        gatewayFeeRate: Number(form.gatewayFeeRate),
        dailyBudgetTarget: Number(form.dailyBudgetTarget),
        kirvanoProductId: form.kirvanoProductId,
        landingUrl: form.landingUrl,
        defaultHeadline: form.defaultHeadline,
        defaultDescription: form.defaultDescription || undefined,
        defaultCTA: form.defaultCTA,
        autoActivate,
        supervisedMode,
      };

      const result = await api.createProduct(payload);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      router.replace(`/product/${result.product.id}`);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(
          requestError.body.message?.toString() ||
            requestError.body.error?.toString() ||
            requestError.message
        );
      } else if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Falha ao criar produto");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-heading font-semibold">Novo produto</h1>
      <p className="text-sm text-muted-foreground mt-1">
        O agente vai derivar breakeven, scale threshold, caps e pisos
        automaticamente da economia que você preencher.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Section title="Identificação">
          <Field
            label="Slug (url-safe)"
            value={form.slug}
            onChange={value => setField("slug", value)}
            placeholder="56-skills"
            required
          />
          <Field
            label="Nome"
            value={form.name}
            onChange={value => setField("name", value)}
            required
          />
          <Field
            label="Descrição"
            value={form.description}
            onChange={value => setField("description", value)}
          />
          <SelectField
            label="Stage"
            value={form.stage}
            onChange={value => setField("stage", value)}
            options={[
              { value: "launch", label: "Launch (primeiros 14 dias)" },
              {
                value: "evergreen",
                label: "Evergreen (rodando há mais de 30 dias)",
              },
              {
                value: "escalavel",
                label: "Escalável (budget alto, público grande)",
              },
              { value: "nicho", label: "Nicho (budget baixo, público pequeno)" },
            ]}
          />
        </Section>

        <Section title="Economia">
          <Field
            label="Preço bruto (R$)"
            type="number"
            value={form.priceGross}
            onChange={value => setField("priceGross", value)}
            required
          />
          <Field
            label="Taxa gateway (ex: 0.035 = 3.5%)"
            type="number"
            value={form.gatewayFeeRate}
            onChange={value => setField("gatewayFeeRate", value)}
          />
        </Section>

        <Section title="Orçamento">
          <Field
            label="Budget diário alvo (R$)"
            type="number"
            value={form.dailyBudgetTarget}
            onChange={value => setField("dailyBudgetTarget", value)}
            required
          />
        </Section>

        <Section title="Integrações & conteúdo default">
          <Field
            label="Kirvano product ID"
            value={form.kirvanoProductId}
            onChange={value => setField("kirvanoProductId", value)}
            required
          />
          <Field
            label="Landing URL"
            type="url"
            value={form.landingUrl}
            onChange={value => setField("landingUrl", value)}
            required
          />
          <Field
            label="Headline default"
            value={form.defaultHeadline}
            onChange={value => setField("defaultHeadline", value)}
            required
          />
          <Field
            label="Descrição default"
            value={form.defaultDescription}
            onChange={value => setField("defaultDescription", value)}
          />
        </Section>

        <Section title="Autonomia">
          <CheckboxField
            label="Auto-activate campanhas criadas pelo planner"
            description="Se ligado, o planner ativa no Meta imediatamente após criar. Se desligado, cria pausadas e você revisa antes."
            checked={autoActivate}
            onChange={setAutoActivate}
          />
          <CheckboxField
            label="Modo supervisionado"
            description="Freio de emergência: agente para de executar ações no produto (pause/scale/rebalance) até você desligar. Default OFF."
            checked={supervisedMode}
            onChange={setSupervisedMode}
          />
        </Section>

        {error && <div className="text-xs text-destructive">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "criando…" : "Criar produto"}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-3 bg-card border border-border rounded-lg p-5">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        step={type === "number" ? "any" : undefined}
        className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: ProductStage;
  onChange: (value: ProductStage) => void;
  options: { value: ProductStage; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value as ProductStage)}
        className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="mt-1 w-4 h-4 accent-primary"
      />
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
    </label>
  );
}
