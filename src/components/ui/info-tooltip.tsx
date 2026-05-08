"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tooltip simples acionado por hover/focus. Usa Glossary mapping pra termos
 * canonicos (Hook rate, Frequencia, etc) ou texto custom.
 */

const GLOSSARY: Record<string, string> = {
  hookRate:
    "Hook rate = % de quem assistiu ao menos 3 segundos do video. Sobral chama de metrica numero 1: se nao prende em 3s, criativo morreu.",
  holdRate:
    "Hold rate = thruplay views / 3s views. Mede quanto da audiencia que parou no hook chega ate 75% do video.",
  cpm:
    "CPM = custo por 1000 impressoes. Sobe quando o leilao esquenta (concorrencia, fadiga). Subir 30%+ em 7d e sinal precoce.",
  ctr:
    "CTR = cliques no link / impressoes. Mede qualidade do anuncio + alinhamento copy↔audiencia.",
  frequency:
    "Frequencia = impressoes / pessoas alcancadas. Alvo: < 2.5 prospec­cao, < 3.5 remarketing. Acima disso fadiga.",
  cpa:
    "CPA = custo por aquisicao. CPA acima do break-even (= net por venda) = lucro negativo.",
  roas:
    "ROAS = receita bruta / spend. Vaidade isolado, util com lucro. ROAS 1.6x e meta saudavel pra low ticket.",
  pacing:
    "Pacing = quantas vendas/mes voce ja fez vs meta. Direciona quao agressivo o agente escala (atras = mais agressivo, adiante = mais conservador).",
  awareness:
    "Stages of Awareness (Eugene Schwartz). Cold = Unaware/Problem. Warm = Solution. Hot = Product/Most aware. Copy avancada em audiencia fria explode CPA.",
  contributionMargin:
    "Margem de contribuicao = receita liquida + upsells − spend Meta − impostos. So conta dinheiro real, descontando refund/chargeback/gateway/comissao.",
  fatigue:
    "Fadiga = queda sustentada de hookRate ao longo dos dias (regressao linear). 'Days to death' = projecao de quando vai cruzar o piso minimo.",
  scaleDown:
    "Scale-down = reduzir 15% do budget antes de pausar quando hook rate cai consistentemente. Evita perder dado por pause prematuro.",
};

export function InfoTooltip({
  term,
  text,
  className,
}: {
  term?: keyof typeof GLOSSARY | string;
  text?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const content = text ?? (term && GLOSSARY[term as keyof typeof GLOSSARY]);
  if (!content) return null;

  return (
    <span
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="info"
        className="text-muted-foreground/60 hover:text-muted-foreground inline-flex items-center"
        onClick={e => {
          e.preventDefault();
          setOpen(o => !o);
        }}
      >
        <Info className="w-3 h-3" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1 w-64 px-3 py-2 rounded-md bg-popover text-popover-foreground border border-border text-[11px] leading-relaxed shadow-lg pointer-events-none"
        >
          {content}
        </span>
      )}
    </span>
  );
}
