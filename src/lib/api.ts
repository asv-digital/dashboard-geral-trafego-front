const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

type QueryValue = string | number | boolean | null | undefined;

interface ApiErrorBody {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export type ProductStage = "launch" | "evergreen" | "escalavel" | "nicho";
export type ProductStatus = "active" | "paused" | "archived";
export type CampaignStatus = "Ativa" | "Pausada" | "Arquivada";
export type AssetType = "image" | "video" | "copy" | "headline" | "hook";
export type AssetStatus = "uploaded" | "ready" | "failed" | "retired";
export type PreflightStatus = "ok" | "warning" | "error";

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  status: ProductStatus;
  stage: ProductStage;
  dailyBudgetTarget: number;
  supervisedMode: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface ProductAutomationConfig {
  id: string;
  productId: string;
  autoPauseNoSales: boolean;
  autoPauseSpendLimit: number;
  autoPauseBreakeven: boolean;
  breakevenCPA: number;
  breakevenMinDays: number;
  autoScaleWinners: boolean;
  autoScaleCPAThreshold: number;
  autoScalePercent: number;
  autoScaleMinDays: number;
  autoScaleMaxBudget: number;
  respectLearningPhase: boolean;
  learningPhaseHours: number;
  autoRotateCreatives: boolean;
  cpaPauseThreshold: number;
  notifyOnAutoAction: boolean;
  autoPauseFrequency: boolean;
  frequencyLimitProspection: number;
  frequencyLimitRemarketing: number;
  budgetCapProspection: number;
  budgetCapRemarketing: number;
  budgetCapASC: number;
  budgetFloorProspection: number;
  budgetFloorRemarketing: number;
  daypartingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AutomationConfigInput = Partial<
  Omit<ProductAutomationConfig, "id" | "productId" | "createdAt" | "updatedAt">
>;

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: ProductStatus;
  stage: ProductStage;
  priceGross: number;
  gatewayFeeRate: number;
  netPerSale: number;
  dailyBudgetTarget: number;
  dailyBudgetFloor: number;
  dailyBudgetCap: number;
  kirvanoProductId: string;
  landingUrl: string;
  defaultHeadline: string;
  defaultDescription: string | null;
  defaultCTA: string;
  autoActivate: boolean;
  supervisedMode: boolean;
  automationConfig: ProductAutomationConfig | null;
}

export interface NewProductInput {
  slug: string;
  name: string;
  description?: string;
  stage: ProductStage;
  priceGross: number;
  gatewayFeeRate: number;
  dailyBudgetTarget: number;
  kirvanoProductId: string;
  landingUrl: string;
  defaultHeadline: string;
  defaultDescription?: string;
  defaultCTA: string;
  autoActivate: boolean;
  supervisedMode: boolean;
}

export interface CampaignListItem {
  id: string;
  productId: string;
  name: string;
  type: string;
  // M2 — flag ASC nativo (Advantage+ Shopping Campaign). Substitui detecao por nome.
  isASC: boolean;
  audience: string | null;
  dailyBudget: number;
  startDate: string;
  status: CampaignStatus;
  metaCampaignId: string | null;
  createdInMetaAt: string | null;
  learningPhaseEnd: string | null;
  isInLearningPhase: boolean;
  totalInvestment: number;
  totalSales: number;
  totalRevenue: number;
  cpa: number | null;
  roas: number | null;
}

export interface MetricCampaignRef {
  name: string;
  type: string;
}

export interface MetricItem {
  id: string;
  productId: string;
  campaignId: string;
  date: string;
  adSet: string | null;
  investment: number;
  impressions: number;
  clicks: number;
  // sales = melhor estimativa (kirvano > pixel fallback). Display only.
  sales: number;
  // C8 — venda autoritativa via webhook Kirvano (decisao automatica).
  salesKirvano: number;
  // C8 — venda atribuida por Pixel/Insights (observabilidade only).
  salesPixel: number;
  frequency: number;
  hookRate: number | null;
  observations: string | null;
  landingPageViews: number | null;
  initiateCheckouts: number | null;
  addToCart: number | null;
  costPerPageView: number | null;
  costPerCheckout: number | null;
  costPerLandingPageView: number | null;
  clickToPageViewRate: number | null;
  pageViewToCheckout: number | null;
  checkoutToSaleRate: number | null;
  outboundClicks: number | null;
  outboundCtr: number | null;
  threeSecondViews: number | null;
  videoPlays: number | null;
  thruplayViews: number | null;
  thruplayRate: number | null;
  campaign?: MetricCampaignRef | null;
}

export interface MetricsOverview {
  totalSpend: number;
  totalSales: number;
  totalRevenue: number;
  avgCpa: number | null;
  avgRoas: number | null;
  avgCtr: number | null;
  avgCpm: number | null;
  avgFrequency: number | null;
  hookRate: number | null;
  outboundCtr: number | null;
  impressions: number;
  clicks: number;
}

export interface SaleSummary {
  totalSales: number;
  totalGross: number;
  totalNet: number;
  avgPrice: number;
}

export interface ActionLogItem {
  id: string;
  productId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  details: string | null;
  reasoning: string | null;
  inputSnapshot: unknown;
  outcome: unknown;
  source: string;
  executedAt: string;
}

export interface ActionSummaryItem {
  action: string;
  count: number;
}

export interface CreativeItem {
  id: string;
  productId: string;
  campaignId: string | null;
  name: string;
  // M4 — metaAdId estavel (populado no creative-performance no primeiro match).
  metaAdId: string | null;
  type: string;
  status: string;
  ctr: number | null;
  hookRate: number | null;
  cpa: number | null;
  thruplayRate: number | null;
  campaign?: { name: string } | null;
}

// C5/D1/D5 — Sale com enrichment fields + capiResponse pra observabilidade.
export interface SaleItem {
  id: string;
  productId: string;
  campaignId: string | null;
  date: string;
  amountGross: number;
  amountNet: number;
  status: "approved" | "pending" | "refunded" | "chargeback";
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  metaCampaignId: string | null;
  metaAdsetId: string | null;
  metaAdId: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerName: string | null;
  kirvanoTxId: string;
  capiSent: boolean;
  capiSentAt: string | null;
  capiEventId: string | null;
  capiResponse: {
    eventsReceived?: number;
    fbtraceId?: string;
    diagnostics?: unknown;
    error?: string;
  } | null;
  fbc: string | null;
  fbp: string | null;
  clientIp: string | null;
  clientUserAgent: string | null;
  eventSourceUrl: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalPnlProduct {
  productId: string;
  slug: string;
  name: string;
  status: ProductStatus;
  stage: ProductStage;
  dailyBudgetTarget: number;
  spend: number;
  salesCount: number;
  revenue: number;
  grossRevenue: number;
  profit: number;
  cpa: number;
  roas: number;
}

export interface GlobalPnlTotals {
  spend: number;
  sales: number;
  revenue: number;
  profit: number;
}

export interface GlobalPnlResponse {
  days: number;
  products: GlobalPnlProduct[];
  totals: GlobalPnlTotals;
}

export interface ActivityItem extends ActionLogItem {
  product?: {
    slug: string;
    name: string;
  } | null;
}

export interface HeartbeatItem {
  productId: string;
  lastCollectionAt: string | null;
  lastSnapshotAt: string | null;
  lastAutomationAt: string | null;
  consecutiveFailures: number;
  lastError: string | null;
  updatedAt: string;
  product?: {
    id: string;
    slug: string;
    name: string;
    status: ProductStatus;
  } | null;
}

export interface AssetItem {
  id: string;
  productId: string;
  type: AssetType;
  name: string;
  originalUrl: string | null;
  r2Key: string | null;
  content: string | null;
  metaMediaId: string | null;
  metaCreativeId: string | null;
  status: AssetStatus;
  mimeType: string | null;
  sizeBytes: number | null;
  tags: string | null;
  uploadedBy: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerCampaignPlan {
  name: string;
  type: string;
  audience: string | null;
  usesAdvantage?: boolean;
  dailyBudget: number;
  funnelStage?: string;
  copyAngle?: string;
  objective?: string;
  strategyNote?: string;
  creativeSlotLimit?: number;
}

export interface PlannerCreatedCampaign {
  name: string;
  metaCampaignId: string;
  dbCampaignId: string;
  status: "Ativa" | "Pausada";
  adsCreated: number;
}

export interface PlannerFailedCampaign {
  name: string;
  reason: string;
  metaCampaignId?: string;
}

export interface PlannerPreviewResponse {
  ok: boolean;
  planned: PlannerCampaignPlan[];
  warnings?: string[];
  preflight?: PreflightResponse;
  error?: string;
}

export interface PlannerCommitResponse {
  ok: boolean;
  created?: PlannerCreatedCampaign[];
  failed?: PlannerFailedCampaign[];
  warnings?: string[];
  preflight?: PreflightResponse;
  error?: string;
}

export interface PlacementItem {
  platform: string;
  position: string;
  impressions: number;
  spend: number;
  clicks: number;
  conversions: number;
  cpm: number;
  cpa: number | null;
  ctr: number | null;
}

export interface PreflightCheck {
  id: string;
  label: string;
  status: PreflightStatus;
  message: string;
  hint?: string;
}

export interface PreflightResponse {
  productId: string;
  status: PreflightStatus;
  errorCount: number;
  warningCount: number;
  checks: PreflightCheck[];
}

export interface NotificationConfig {
  id?: string;
  whatsappProvider?: string | null;
  whatsappInstanceId?: string | null;
  whatsappToken?: string | null;
  whatsappPhone?: string | null;
  enabled: boolean;
  notifyAutoActions: boolean;
  notifyCreativeActions: boolean;
  notifyLearningPhase: boolean;
  notifyAlerts: boolean;
  notifyDailySummary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type NotificationConfigInput = Partial<
  Omit<NotificationConfig, "id" | "createdAt" | "updatedAt">
>;

export interface NotificationLogItem {
  id: string;
  productId: string | null;
  type: string;
  message: string;
  channel: string;
  status: string;
  error: string | null;
  createdAt: string;
}

export interface GlobalSettings {
  id?: string;
  metaAccessToken?: string | null;
  metaTokenCreatedAt?: string | null;
  metaAdAccountId?: string | null;
  metaAppId?: string | null;
  metaAppSecret?: string | null;
  metaPixelId?: string | null;
  metaPageId?: string | null;
  metaAudienceBuyersId?: string | null;
  metaAudienceWarmId?: string | null;
  metaAudienceWarmName?: string | null;
  kirvanoWebhookToken?: string | null;
  anthropicApiKey?: string | null;
  updatedAt?: string;
}

export type GlobalSettingsInput = Partial<
  Omit<GlobalSettings, "id" | "updatedAt">
>;

export interface HealthComponentStatus {
  status: "ok" | "warning" | "error" | "not_configured";
  latency_ms?: number;
  error?: string;
  token_expires_in_days?: number;
  message?: string;
  status_key?: string;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "critical";
  components: Record<string, HealthComponentStatus>;
  uptime_ms: number;
  timestamp: string;
  version: string;
}

export interface AgentAccountStatus {
  ok: boolean;
  status_code: number | null;
  status_key: string;
  active: boolean;
  message: string;
  disable_reason?: number | null;
  name?: string | null;
  currency?: string | null;
  checked_at: string;
  source: "meta_api" | "cache" | "error";
  error?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.body && typeof init.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const body = (await res
      .json()
      .catch(() => ({ error: `http_${res.status}` }))) as ApiErrorBody;
    throw new ApiError(
      res.status,
      typeof body.error === "string" ? body.error : `http_${res.status}`,
      body
    );
  }

  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public body: ApiErrorBody
  ) {
    super(code);
  }
}

function qs(params: Record<string, QueryValue>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      q.set(key, String(value));
    }
  }
  const search = q.toString();
  return search ? `?${search}` : "";
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  login: (email: string, password: string) =>
    request<{ user: AuthUser; expiresAt: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: AuthUser }>("/auth/me"),

  listProducts: () => request<{ products: ProductListItem[] }>("/products"),
  getProduct: (id: string) => request<{ product: ProductDetail }>(`/products/${id}`),
  createProduct: (data: NewProductInput) =>
    request<{ product: ProductDetail }>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateProduct: (id: string, data: Partial<NewProductInput>) =>
    request<{ product: ProductDetail }>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  archiveProduct: (id: string) =>
    request<{ ok: boolean }>(`/products/${id}`, { method: "DELETE" }),

  listCampaigns: (productId: string) =>
    request<{ campaigns: CampaignListItem[] }>(`/campaigns${qs({ productId })}`),
  getCampaign: (id: string) => request<{ campaign: CampaignListItem }>(`/campaigns/${id}`),

  metricsOverview: (productId: string, dateFrom?: string, dateTo?: string) =>
    request<{ overview: MetricsOverview }>(
      `/metrics/overview${qs({ productId, dateFrom, dateTo })}`
    ),
  listMetrics: (
    productId: string,
    params: { dateFrom?: string; dateTo?: string; campaignId?: string } = {}
  ) =>
    request<{ metrics: MetricItem[] }>(`/metrics${qs({ productId, ...params })}`),

  listSales: (
    productId: string,
    params: { dateFrom?: string; dateTo?: string; status?: string } = {}
  ) => request<{ sales: SaleItem[] }>(`/sales${qs({ productId, ...params })}`),
  salesSummary: (productId: string, dateFrom?: string, dateTo?: string) =>
    request<{ summary: SaleSummary }>(
      `/sales/summary${qs({ productId, dateFrom, dateTo })}`
    ),

  agentStatus: () => request<Record<string, unknown>>("/agent/status"),
  agentAccount: () => request<AgentAccountStatus>("/agent/account"),
  agentHeartbeats: () => request<{ heartbeats: HeartbeatItem[] }>("/agent/heartbeats"),
  runAgentAll: () =>
    request<{ ok: boolean; results: unknown[] }>("/agent/run", { method: "POST" }),
  runAgentProduct: (productId: string) =>
    request<{ ok: boolean; result: unknown }>(`/agent/run/${productId}`, {
      method: "POST",
    }),

  listActions: (
    productId: string,
    params: { limit?: number; offset?: number; action?: string } = {}
  ) => request<{ actions: ActionLogItem[]; total: number }>(`/actions${qs({ productId, ...params })}`),
  actionsSummary: (productId: string, days = 7) =>
    request<{ summary: ActionSummaryItem[] }>(`/actions/summary${qs({ productId, days })}`),

  listCreatives: (productId: string) =>
    request<{ creatives: CreativeItem[] }>(`/creatives${qs({ productId })}`),

  globalPnl: (days = 7) => request<GlobalPnlResponse>(`/global/pnl${qs({ days })}`),
  globalActivity: () => request<{ activity: ActivityItem[] }>("/global/activity"),
  globalHeartbeats: () => request<{ heartbeats: HeartbeatItem[] }>("/global/heartbeats"),
  getGlobalSettings: () => request<{ settings: GlobalSettings | null }>("/global/settings"),
  updateGlobalSettings: (data: GlobalSettingsInput) =>
    request<{ settings: GlobalSettings }>("/global/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  preflight: (productId: string) => request<PreflightResponse>(`/preflight/${productId}`),

  pauseCampaignMeta: (productId: string, metaCampaignId: string) =>
    request<{ ok: boolean }>("/meta-actions/campaigns/pause", {
      method: "POST",
      body: JSON.stringify({ productId, metaCampaignId }),
    }),
  activateCampaignMeta: (productId: string, metaCampaignId: string) =>
    request<{ ok: boolean }>("/meta-actions/campaigns/activate", {
      method: "POST",
      body: JSON.stringify({ productId, metaCampaignId }),
    }),
  updateCampaignBudgetMeta: (
    productId: string,
    metaCampaignId: string,
    dailyBudget: number
  ) =>
    request<{ ok: boolean }>("/meta-actions/campaigns/budget", {
      method: "PATCH",
      body: JSON.stringify({ productId, metaCampaignId, dailyBudget }),
    }),

  listAssets: (productId: string) =>
    request<{ assets: AssetItem[] }>(`/assets${qs({ productId })}`),
  createTextAsset: (
    productId: string,
    data: {
      type: "copy" | "headline" | "hook";
      name: string;
      text: string;
      tags?: string;
    }
  ) =>
    request<{ asset: AssetItem }>("/assets", {
      method: "POST",
      body: JSON.stringify({
        productId,
        type: data.type,
        name: data.name,
        text: data.text,
        tags: data.tags,
      }),
    }),
  archiveAsset: (id: string) =>
    request<{ ok: boolean }>(`/assets/${id}`, { method: "DELETE" }),

  plannerPreview: (productId: string) =>
    request<PlannerPreviewResponse>(`/planner/preview/${productId}`),
  plannerCommit: (productId: string) =>
    request<PlannerCommitResponse>(`/planner/commit/${productId}`, {
      method: "POST",
    }),

  listPlacements: (productId: string, days = 7) =>
    request<{ placements: PlacementItem[] }>(`/placements${qs({ productId, days })}`),

  getNotificationConfig: () => request<{ config: NotificationConfig | null }>("/notifications/config"),
  updateNotificationConfig: (data: NotificationConfigInput) =>
    request<{ config: NotificationConfig }>("/notifications/config", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  testNotification: () =>
    request<{ ok: boolean }>("/notifications/test", { method: "POST" }),
  notificationLog: () => request<{ logs: NotificationLogItem[] }>("/notifications/log"),

  updateAutomationConfig: (productId: string, data: AutomationConfigInput) =>
    request<{ automationConfig: ProductAutomationConfig }>(
      `/products/${productId}/automation-config`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    ),

  // Analytics elite-grade
  hitRate: (productId: string, days = 30) =>
    request<HitRateResponse>(`/analytics/hit-rate/${productId}${qs({ days })}`),
  profitWaterfall: (productId: string, days = 7) =>
    request<ProfitWaterfallResponse>(`/analytics/profit-waterfall/${productId}${qs({ days })}`),
  paybackCohort: (productId: string, days = 30) =>
    request<PaybackCohortResponse>(`/analytics/payback-cohort/${productId}${qs({ days })}`),
  ltvCohort: (productId: string, days = 90) =>
    request<LtvCohortResponse>(`/analytics/ltv-cohort/${productId}${qs({ days })}`),
  awarenessAnalytics: (productId: string, days = 30) =>
    request<AwarenessResponse>(`/analytics/awareness/${productId}${qs({ days })}`),
};

export type AwarenessStage = "unaware" | "problem" | "solution" | "product" | "most_aware";

export interface HitRateResponse {
  windowDays: number;
  totalLaunched: number;
  winners: number;
  losers: number;
  pendingEvaluation: number;
  hitRatePct: number;
  benchmark: { elite: number; mediano: number };
  topWinners: Array<{
    id: string;
    name: string;
    type: string;
    cpa: number | null;
    hookRate: number | null;
    ctr: number | null;
    daysActive: number;
  }>;
  worstLosers: Array<{
    id: string;
    name: string;
    type: string;
    cpa: number | null;
    hookRate: number | null;
    ctr: number | null;
    daysActive: number;
  }>;
}

export interface ProfitWaterfallResponse {
  windowDays: number;
  steps: Array<{ label: string; value: number; pct: number }>;
  contributionMargin: number;
  contributionMarginPct: number;
  roas: number | null;
  spend: number;
  grossRevenue: number;
}

export interface PaybackCohortResponse {
  windowDays: number;
  rows: Array<{
    cohortDate: string;
    spend: number;
    cumRevenueD1: number;
    cumRevenueD7: number;
    cumRevenueD14: number;
    cumRevenueD30: number;
    paybackDay: number | null;
  }>;
  avgPaybackDays: number | null;
}

export interface LtvCohortResponse {
  windowDays: number;
  rows: Array<{
    cohortWeek: string;
    buyers: number;
    ltvD7: number;
    ltvD14: number;
    ltvD30: number;
    ltvD60: number;
  }>;
}

export interface AwarenessResponse {
  rows: Array<{
    stage: string;
    creativeCount: number;
    avgCpa: number | null;
    avgHookRate: number | null;
    winnerRate: number;
  }>;
  taggedCount: number;
  untaggedCount: number;
}
