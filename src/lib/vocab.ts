/**
 * Vocabulario canonico PT-BR.
 * NUNCA usar "Sales", "Profit", "CM", "Revenue" etc no UI.
 * Sempre os termos abaixo.
 */

export const VOCAB = {
  // Financeiro
  spend: "Gasto",
  revenue: "Receita bruta",
  netRevenue: "Receita liquida",
  profit: "Lucro",
  margin: "Margem",
  contributionMargin: "Margem de contribuicao",

  // Vendas
  sales: "Vendas",
  customers: "Clientes",
  conversions: "Conversoes",

  // Performance
  cpa: "CPA",
  cpm: "CPM",
  ctr: "CTR",
  roas: "ROAS",
  hookRate: "Hook rate",
  holdRate: "Hold rate",
  frequency: "Frequencia",

  // Estrutura
  campaign: "Campanha",
  adset: "Adset",
  ad: "Anuncio",
  creative: "Criativo",
  asset: "Conteudo",
  audience: "Audiencia",
  placement: "Placement",

  // Ciclo
  active: "Ativo",
  paused: "Pausado",
  archived: "Arquivado",
  scaling: "Escalando",
  testing: "Testando",
  fatigued: "Fadigado",
  killed: "Cortado",

  // Estagios produto
  testing_stage: "Teste",
  validation: "Validacao",
  scale: "Escala",
  evergreen: "Evergreen",
  launch: "Lancamento",

  // Status saude
  healthy: "Saudavel",
  attention: "Atencao",
  risk: "Risco",
  critical: "Critico",
  unknown: "Sem dados",
} as const;

export type VocabKey = keyof typeof VOCAB;

export function v(key: VocabKey): string {
  return VOCAB[key];
}
