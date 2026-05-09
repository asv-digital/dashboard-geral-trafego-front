"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";

export default function MethodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id),
  });

  const cfg = product.data?.product?.automationConfig;
  const p = product.data?.product;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Metodo do agente"
        subtitle="Regras Pedro Sobral aplicadas neste produto. O que o agente vai fazer e por que. Valores derivados automaticamente da economia (preco, net, stage)."
      />

      {!cfg || !p ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {cfg.calibratedFromRealData && (
            <div className="bg-success/10 border border-success/40 rounded-lg p-4 flex items-start gap-3">
              <span className="text-success text-base leading-none mt-0.5">✓</span>
              <div className="text-sm">
                <div className="font-medium text-success">
                  Calibrado com dados reais
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Thresholds ajustados a partir de campanhas top performer da conta:
                  Advogados R$ 52 CPA · Contadores R$ 69 · Mirror Winners R$ 88 · ROAS top 2.13x.
                  Versao teorica conservadora foi substituida.
                  {cfg.calibratedAt && (
                    <span className="ml-1">
                      ({new Date(cfg.calibratedAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filosofia */}
          <Quote
            text="Métrica do dia mente, média de 7 fala verdade."
            author="Pedro Sobral"
          />

          {/* Economia base */}
          <Section title="0. Economia do produto" desc="Tudo deriva daqui.">
            <Stats
              items={[
                { label: "Preço bruto", value: formatBRL(p.priceGross) },
                {
                  label: "Taxa gateway",
                  value: `${(p.gatewayFeeRate * 100).toFixed(1)}%`,
                },
                { label: "Net por venda (= breakeven CPA)", value: formatBRL(p.netPerSale) },
                { label: "Daily budget alvo", value: formatBRL(p.dailyBudgetTarget) },
                { label: "Stage", value: p.stage },
              ]}
            />
          </Section>

          {/* R1 — teto diário */}
          <Rule
            number="R1"
            title="Teto diário (orçamento)"
            description="Se o gasto do dia ultrapassar o teto target do produto, o agente pausa adsets pra estancar. <10% overshoot = soft pause (top 50% por gasto). >10% = pausa todos."
            currentValues={[
              { label: "Target diário", value: formatBRL(p.dailyBudgetTarget) },
              { label: "Modo soft (até)", value: `${formatBRL(p.dailyBudgetTarget * 1.1)} (+10%)` },
            ]}
          />

          {/* R2 — learning phase */}
          <Rule
            number="R2"
            title="Learning phase intocável"
            description="Princípio Sobral: 'quem mexe muito em campanha, mata campanha'. Adset em learning não recebe pause/scale automático. Saída quando atinge sinal mínimo de vendas pós-72h OU timeout (combinação tempo + sinal)."
            currentValues={[
              {
                label: "Janela learning",
                value: `${cfg.learningPhaseHours}h`,
              },
              {
                label: "Respeita?",
                value: cfg.respectLearningPhase ? "✓ sim" : "✗ desativado",
              },
              { label: "Pós-learning grace", value: "48h" },
            ]}
          />

          {/* R3 — ASC */}
          <Rule
            number="R3"
            title="ASC (Advantage+) campanha-level"
            description="Campanhas Advantage+ Shopping são tratadas no nível campanha (não adset). Meta IA gerencia audiência/criativo/placement. Regras de auto-pause aplicam mas mais conservadoras."
          />

          {/* R4 — auto-pause sem venda */}
          <Rule
            number="R4"
            title="Auto-pause sem venda (lifetime + streak)"
            description="2 cenários: (a) lifetime sem venda E gasto > limit, (b) streak ≥ 2 dias seguidos sem venda com gasto acumulado > limit. Streak captura adset que vendeu 1× e morreu (loser silencioso)."
            currentValues={[
              {
                label: "Auto-pause sem venda",
                value: cfg.autoPauseNoSales ? "✓ ativo" : "✗ off",
              },
              {
                label: "Limite de spend",
                value: formatBRL(cfg.autoPauseSpendLimit),
              },
            ]}
          />

          {/* R5 — frequency */}
          <Rule
            number="R5"
            title="Frequency cap religioso"
            description="Sobral: 'cada décimo acima do limite corrói ROAS exponencial'. Auto-pause se frequência média 2 dias > limit + sem vendas recentes ou CPA > breakeven."
            currentValues={[
              {
                label: "Limite prospecção",
                value: cfg.frequencyLimitProspection.toFixed(1),
              },
              {
                label: "Limite remarketing",
                value: cfg.frequencyLimitRemarketing.toFixed(1),
              },
            ]}
          />

          {/* R6 — breakeven */}
          <Rule
            number="R6"
            title="Auto-pause breakeven"
            description="Pausa adset se CPA médio > breakeven CPA por N dias seguidos. Pula se CPM em spike (mercado, não criativo). Sobral: 'paciência > ansiedade — só pausa quando sinal é forte'."
            currentValues={[
              { label: "Breakeven CPA", value: formatBRL(cfg.breakevenCPA) },
              { label: "Min dias seguidos", value: `${cfg.breakevenMinDays}d` },
            ]}
          />

          {/* R7 — scale */}
          <Rule
            number="R7"
            title="Auto-scale winner (+20% / 72h)"
            description="Sobral: 'mais agressivo que +20% a cada 3 dias reseta learning'. Cooldown 72h via ActionLog. Quality gate: hookRate, outboundCTR e frequência abaixo do limite. CPA stability gate (CV ≤ 0.4) bloqueia volátil. Threshold ajusta por pacing mensal."
            currentValues={[
              { label: "Threshold scale CPA", value: formatBRL(cfg.autoScaleCPAThreshold) },
              { label: "Min dias com CPA bom", value: `${cfg.autoScaleMinDays}d` },
              { label: "% por scale", value: `+${cfg.autoScalePercent}%` },
              { label: "Teto budget", value: formatBRL(cfg.autoScaleMaxBudget) },
              { label: "Cooldown", value: "72h" },
            ]}
          />

          {/* R8 — scale-down */}
          <Rule
            number="R8"
            title="Scale-down (desescalar antes de quebrar)"
            description="Diferencial sênior. Detecta slope CPA ≥ +5%/dia em 5d MAS CPA atual < breakeven. Reduz budget 15% pra preservar margem antes do adset quebrar (R6 ainda não dispara). Cirúrgico, não destrutivo. Cooldown 48h."
            currentValues={[
              { label: "Slope mínimo", value: "+5%/dia" },
              { label: "Redução", value: "−15%" },
              { label: "Cooldown", value: "48h" },
              { label: "Floor budget", value: formatBRL(20) },
            ]}
          />

          {/* Dayparting */}
          <Rule
            number="DP"
            title="Dayparting (off-peak)"
            description="Reduz budget pela metade em horas off-peak (ROI historicamente baixo). Protege peak commercial 11-22h BRT (Brasil). Madrugada profunda 3-5h sempre off-peak. Volume mínimo 50 vendas pra confiar na curva."
            currentValues={[
              {
                label: "Dayparting",
                value: cfg.daypartingEnabled ? "✓ ativo" : "✗ off",
              },
              { label: "Peak protegido", value: "11-22h BRT" },
              { label: "Sempre off-peak", value: "3-5h BRT" },
            ]}
          />

          {/* Pacing mensal */}
          <Rule
            number="MP"
            title="Pacing mensal (MonthlyGoal)"
            description="Lê meta mensal e ajusta autoScaleCPAThreshold dinâmico. Atrás da meta = mais agressivo (+10-20% no threshold). Adiante = mais conservador (-10%). Sem MonthlyGoal cadastrada = comportamento neutro."
            currentValues={[
              { label: "Atrás da meta", value: "threshold ×1.10 a ×1.20" },
              { label: "No ritmo", value: "threshold ×1.00" },
              { label: "Adiante", value: "threshold ×0.90" },
            ]}
          />

          {/* Awareness */}
          <Rule
            number="AW"
            title="Awareness × Audiência (Schwartz)"
            description="Cada criativo pode ser tagueado em 5 stages (unaware/problem/solution/product/most_aware). Cold = problem-aware ideal. Cold + product/most_aware = MISMATCH GRAVE (CPA explode). Decision Queue lista mismatches pra mover criativo ou trocar copy."
          />

          {/* CAPI / atribuição */}
          <Rule
            number="AT"
            title="Atribuição & Tracking"
            description="Janela 7-day click + 1-day view explícita (padrão Meta pós-iOS14). Decisões usam salesKirvano (autoritativo via webhook) — Pixel só pra observabilidade. CAPI dedup via kirvanoTxId (event_id batendo Pixel browser na thank-you-page)."
            currentValues={[
              { label: "Janela atribuição", value: "7d_click + 1d_view" },
              { label: "Source of truth", value: "Kirvano webhook" },
              { label: "CAPI match quality", value: "8-9 (com fbc/fbp/IP)" },
            ]}
          />

          {/* Footer */}
          <div className="border-t border-border pt-6 mt-8">
            <p className="text-xs text-muted-foreground">
              Toda decisão automática gera entry em <strong>ActionLog</strong> com{" "}
              <code className="text-primary">reasoning</code> em PT-BR explicando a regra
              aplicada. Veja na aba <strong>Tempo real</strong> ou expanda &quot;por quê?&quot;
              em cada evento.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">{desc}</p>
      {children}
    </section>
  );
}

function Rule({
  number,
  title,
  description,
  currentValues,
}: {
  number: string;
  title: string;
  description: string;
  currentValues?: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary shrink-0">
          {number}
        </span>
        <h3 className="text-base font-medium">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      {currentValues && currentValues.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
          {currentValues.map((v, i) => (
            <div key={i} className="bg-muted/20 border border-border rounded px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {v.label}
              </div>
              <div className="text-sm font-medium tabular-nums mt-0.5">{v.value}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Stats({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {items.map((v, i) => (
        <div key={i} className="bg-muted/20 border border-border rounded px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{v.label}</div>
          <div className="text-sm font-medium tabular-nums mt-0.5">{v.value}</div>
        </div>
      ))}
    </div>
  );
}

function Quote({ text, author }: { text: string; author: string }) {
  return (
    <blockquote className="border-l-2 border-primary pl-4 py-2 italic text-muted-foreground">
      <span className="text-base text-foreground">&ldquo;{text}&rdquo;</span>
      <div className="text-xs text-muted-foreground mt-1 not-italic">— {author}</div>
    </blockquote>
  );
}
