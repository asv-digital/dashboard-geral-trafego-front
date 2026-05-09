"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  ApiError,
  type GlobalSettings,
  type GlobalSettingsInput,
  type NotificationConfig,
  type NotificationConfigInput,
} from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Accordion } from "@/components/ui/accordion";
import { StatusBadge, type Tone } from "@/components/ui/status-badge";

const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  whatsappProvider: "zappfy",
  whatsappInstanceId: "",
  whatsappToken: "",
  whatsappPhone: "",
  enabled: true,
  notifyAutoActions: true,
  notifyCreativeActions: true,
  notifyLearningPhase: true,
  notifyAlerts: true,
  notifyDailySummary: true,
};

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  metaAccessToken: "",
  metaTokenCreatedAt: "",
  metaAdAccountId: "",
  metaAppId: "",
  metaAppSecret: "",
  metaPixelId: "",
  metaPageId: "",
  metaAudienceBuyersId: "",
  metaAudienceWarmId: "",
  metaAudienceWarmName: "Visitantes 30d",
  kirvanoWebhookToken: "",
  anthropicApiKey: "",
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.me(),
  });
  const isOwner = me?.user.role === "owner";
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.health(),
  });
  const { data: account } = useQuery({
    queryKey: ["agent", "account"],
    queryFn: () => api.agentAccount(),
  });
  const { data: globalSettings } = useQuery({
    queryKey: ["global", "settings"],
    queryFn: () => api.getGlobalSettings(),
    enabled: isOwner,
  });
  const { data: notif } = useQuery({
    queryKey: ["notifications", "config"],
    queryFn: () => api.getNotificationConfig(),
    enabled: isOwner,
  });
  const { data: logs } = useQuery({
    queryKey: ["notifications", "log"],
    queryFn: () => api.notificationLog(),
    enabled: isOwner,
  });

  const [draft, setDraft] = useState<NotificationConfigInput>({});
  const [globalDraft, setGlobalDraft] = useState<GlobalSettingsInput>({});
  const [saved, setSaved] = useState(false);
  const [globalSaved, setGlobalSaved] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [globalSaveError, setGlobalSaveError] = useState<string | null>(null);

  const form: NotificationConfig = {
    ...DEFAULT_NOTIFICATION_CONFIG,
    ...(notif?.config ?? {}),
    ...draft,
  };
  const metaForm: GlobalSettings = {
    ...DEFAULT_GLOBAL_SETTINGS,
    ...(globalSettings?.settings ?? {}),
    ...globalDraft,
  };

  const update = useMutation({
    mutationFn: (data: NotificationConfigInput) => api.updateNotificationConfig(data),
    onSuccess: () => {
      setSaved(true);
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["notifications", "config"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
      window.setTimeout(() => setSaved(false), 2000);
    },
    onError: err => {
      setSaveError(err instanceof Error ? err.message : "falha ao salvar notificações");
    },
  });

  const testMutation = useMutation({
    mutationFn: () => api.testNotification(),
    onSuccess: () => {
      setTestFeedback("teste enviado");
      queryClient.invalidateQueries({ queryKey: ["notifications", "log"] });
    },
    onError: testError => {
      if (testError instanceof ApiError || testError instanceof Error) {
        setTestFeedback(testError.message);
      } else {
        setTestFeedback("falha ao enviar teste");
      }
    },
  });

  const updateGlobalSettings = useMutation({
    mutationFn: (data: GlobalSettingsInput) => api.updateGlobalSettings(data),
    onSuccess: () => {
      setGlobalSaved(true);
      setGlobalSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["global", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["agent", "account"] });
      window.setTimeout(() => setGlobalSaved(false), 2000);
    },
    onError: err => {
      setGlobalSaveError(err instanceof Error ? err.message : "falha ao salvar credenciais globais");
    },
  });

  const setField = <K extends keyof NotificationConfigInput>(
    key: K,
    value: NotificationConfigInput[K]
  ) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const setGlobalField = <K extends keyof GlobalSettingsInput>(
    key: K,
    value: GlobalSettingsInput[K]
  ) => {
    setGlobalDraft(current => ({ ...current, [key]: value }));
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    update.mutate({
      whatsappProvider: form.whatsappProvider?.trim() || null,
      whatsappInstanceId: form.whatsappInstanceId?.trim() || null,
      whatsappToken: form.whatsappToken?.trim() || null,
      whatsappPhone: form.whatsappPhone?.trim() || null,
      enabled: form.enabled,
      notifyAutoActions: form.notifyAutoActions,
      notifyCreativeActions: form.notifyCreativeActions,
      notifyLearningPhase: form.notifyLearningPhase,
      notifyAlerts: form.notifyAlerts,
      notifyDailySummary: form.notifyDailySummary,
    });
  };

  const handleGlobalSave = (event: React.FormEvent) => {
    event.preventDefault();
    updateGlobalSettings.mutate({
      metaAccessToken: metaForm.metaAccessToken?.trim() || null,
      metaTokenCreatedAt: metaForm.metaTokenCreatedAt
        ? new Date(metaForm.metaTokenCreatedAt).toISOString()
        : null,
      metaAdAccountId: metaForm.metaAdAccountId?.trim() || null,
      metaAppId: metaForm.metaAppId?.trim() || null,
      metaAppSecret: metaForm.metaAppSecret?.trim() || null,
      metaPixelId: metaForm.metaPixelId?.trim() || null,
      metaPageId: metaForm.metaPageId?.trim() || null,
      metaAudienceBuyersId: metaForm.metaAudienceBuyersId?.trim() || null,
      metaAudienceWarmId: metaForm.metaAudienceWarmId?.trim() || null,
      metaAudienceWarmName: metaForm.metaAudienceWarmName?.trim() || null,
      kirvanoWebhookToken: metaForm.kirvanoWebhookToken?.trim() || null,
      anthropicApiKey: metaForm.anthropicApiKey?.trim() || null,
    });
  };

  const notificationLogs = logs?.logs ?? [];

  if (me?.user && !isOwner) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="bg-card border border-border rounded-lg p-5 space-y-2">
          <h1 className="text-xl font-heading font-semibold">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Apenas o perfil owner pode editar credenciais globais e notificações.
          </p>
        </div>
      </div>
    );
  }

  // Status calculados pra cada accordion
  const metaAdAccountStatus: { tone: Tone; label: string } = account?.active
    ? { tone: "success", label: "Conta ativa" }
    : account
      ? { tone: "danger", label: account.status_key }
      : { tone: "muted", label: "Carregando" };
  const pixelPageStatus: { tone: Tone; label: string } =
    metaForm.metaPixelId && metaForm.metaPageId
      ? { tone: "success", label: "Configurado" }
      : { tone: "warning", label: "Incompleto" };
  const integrationsStatus: { tone: Tone; label: string } =
    metaForm.kirvanoWebhookToken && metaForm.anthropicApiKey
      ? { tone: "success", label: "Configurado" }
      : { tone: "warning", label: "Parcial" };
  const whatsappStatus: { tone: Tone; label: string } =
    form.whatsappToken && form.whatsappPhone
      ? { tone: "success", label: "Configurado" }
      : { tone: "muted", label: "Nao configurado" };
  const healthStatus: { tone: Tone; label: string } = health
    ? health.status === "healthy"
      ? { tone: "success", label: "Saudavel" }
      : health.status === "degraded"
        ? { tone: "warning", label: "Degradado" }
        : { tone: "danger", label: "Critico" }
    : { tone: "muted", label: "Carregando" };

  return (
    <div className="p-6 md:p-8 space-y-4 max-w-3xl">
      <PageHeader
        title="Configuracoes"
        subtitle="Credenciais, integracoes e saude do sistema. Agrupado por tema — clica pra expandir."
      />

      {/* Conta Meta — sempre aberto pra ver status */}
      <Accordion
        title="Conta Meta Ads"
        description="Status da conta de anuncios + access token"
        status={metaAdAccountStatus.tone}
        statusLabel={metaAdAccountStatus.label}
        defaultOpen
      >
        <div className="space-y-4">
          {account && (
            <div className="text-sm space-y-1 p-3 bg-background/40 border border-border rounded">
              <div>
                <span className="text-muted-foreground">Status: </span>
                <span className={account.active ? "text-success" : "text-destructive"}>
                  {account.status_key}
                </span>
              </div>
            <div>
              <span className="text-muted-foreground">Conta: </span>
              {account.name || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Moeda: </span>
              {account.currency || "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{account.message}</div>
          </div>
          )}

          <form onSubmit={handleGlobalSave} className="space-y-3">
            <TextField
              label="Meta access token"
              value={metaForm.metaAccessToken || ""}
              onChange={value => setGlobalField("metaAccessToken", value)}
              placeholder="EAAB..."
              type="password"
            />
            <TextField
              label="Data de criacao do token"
              value={toDateTimeLocalInput(metaForm.metaTokenCreatedAt)}
              onChange={value => setGlobalField("metaTokenCreatedAt", value)}
              type="datetime-local"
            />
            <TokenExpiryBadge createdAt={metaForm.metaTokenCreatedAt} />
            <TextField
              label="Ad account ID"
              value={metaForm.metaAdAccountId || ""}
              onChange={value => setGlobalField("metaAdAccountId", value)}
              placeholder="act_..."
            />
            <SaveBar
              pending={updateGlobalSettings.isPending}
              saved={globalSaved}
              error={globalSaveError}
              label="Salvar conta + token"
            />
          </form>
        </div>
      </Accordion>

      {/* Pixel + Page + Audiences */}
      <Accordion
        title="Pixel + Page + Audiences"
        description="Configuracoes que abastecem o Planner e o tracking"
        status={pixelPageStatus.tone}
        statusLabel={pixelPageStatus.label}
      >
        <form onSubmit={handleGlobalSave} className="space-y-3">
          <TextField
            label="Pixel ID default"
            value={metaForm.metaPixelId || ""}
            onChange={value => setGlobalField("metaPixelId", value)}
            placeholder="238..."
          />
          <TextField
            label="Page ID default"
            value={metaForm.metaPageId || ""}
            onChange={value => setGlobalField("metaPageId", value)}
            placeholder="615..."
          />
          <TextField
            label="Audiencia compradores ID"
            value={metaForm.metaAudienceBuyersId || ""}
            onChange={value => setGlobalField("metaAudienceBuyersId", value)}
            placeholder="238..."
          />
          <TextField
            label="Audience quente ID"
            value={metaForm.metaAudienceWarmId || ""}
            onChange={value => setGlobalField("metaAudienceWarmId", value)}
            placeholder="ex: 2384..."
          />
          <TextField
            label="Nome da audiencia quente"
            value={metaForm.metaAudienceWarmName || ""}
            onChange={value => setGlobalField("metaAudienceWarmName", value)}
            placeholder="Visitantes 30d"
          />
          <SaveBar
            pending={updateGlobalSettings.isPending}
            saved={globalSaved}
            error={globalSaveError}
            label="Salvar Pixel + Page + Audiences"
          />
        </form>
      </Accordion>

      {/* App Meta + Integracoes (Kirvano + IA) */}
      <Accordion
        title="App Meta + Integracoes (Kirvano, IA)"
        description="Meta App ID/Secret (CAPI), Kirvano webhook token, IA"
        status={integrationsStatus.tone}
        statusLabel={integrationsStatus.label}
      >
        <form onSubmit={handleGlobalSave} className="space-y-3">
          <TextField
            label="Meta App ID"
            value={metaForm.metaAppId || ""}
            onChange={value => setGlobalField("metaAppId", value)}
            placeholder="app id (opcional pra CAPI)"
          />
          <TextField
            label="Meta App Secret"
            value={metaForm.metaAppSecret || ""}
            onChange={value => setGlobalField("metaAppSecret", value)}
            placeholder="app secret (opcional)"
            type="password"
          />
          <TextField
            label="Kirvano webhook token"
            value={metaForm.kirvanoWebhookToken || ""}
            onChange={value => setGlobalField("kirvanoWebhookToken", value)}
            placeholder="token (preenchido)"
            type="password"
          />
          <TextField
            label="Anthropic API key (legado — ative GOOGLE_AI_API_KEY no env do back pra usar Gemini gratis)"
            value={metaForm.anthropicApiKey || ""}
            onChange={value => setGlobalField("anthropicApiKey", value)}
            placeholder="sk-ant-..."
            type="password"
          />
          <SaveBar
            pending={updateGlobalSettings.isPending}
            saved={globalSaved}
            error={globalSaveError}
            label="Salvar integracoes"
          />
        </form>
      </Accordion>

      {/* Notificacoes WhatsApp */}
      <Accordion
        title="Notificacoes WhatsApp"
        description="Alertas em tempo real via Zappfy/Z-API"
        status={whatsappStatus.tone}
        statusLabel={whatsappStatus.label}
      >
        <form onSubmit={handleSave} className="space-y-3">
          <TextField
            label="Provider"
            value={form.whatsappProvider || ""}
            onChange={value => setField("whatsappProvider", value)}
            placeholder="zappfy"
          />
          <TextField
            label="Instance ID"
            value={form.whatsappInstanceId || ""}
            onChange={value => setField("whatsappInstanceId", value)}
            placeholder="instância"
          />
          <TextField
            label="Token"
            value={form.whatsappToken || ""}
            onChange={value => setField("whatsappToken", value)}
            placeholder="token do provider"
            type="password"
          />
          <TextField
            label="Telefone destino"
            value={form.whatsappPhone || ""}
            onChange={value => setField("whatsappPhone", value)}
            placeholder="5511999999999"
          />
          <Toggle
            label="Notificações globais ativas"
            value={form.enabled}
            onChange={value => setField("enabled", value)}
          />
          <Toggle
            label="Ações automáticas (pause/scale/rebalance)"
            value={form.notifyAutoActions}
            onChange={value => setField("notifyAutoActions", value)}
          />
          <Toggle
            label="Ações de criativo"
            value={form.notifyCreativeActions}
            onChange={value => setField("notifyCreativeActions", value)}
          />
          <Toggle
            label="Saída de learning phase"
            value={form.notifyLearningPhase}
            onChange={value => setField("notifyLearningPhase", value)}
          />
          <Toggle
            label="Alertas críticos"
            value={form.notifyAlerts}
            onChange={value => setField("notifyAlerts", value)}
          />
          <Toggle
            label="Daily summary (8h BRT)"
            value={form.notifyDailySummary}
            onChange={value => setField("notifyDailySummary", value)}
          />

          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <button
              type="submit"
              disabled={update.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {update.isPending ? "salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTestFeedback(null);
                testMutation.mutate();
              }}
              disabled={testMutation.isPending}
              className="px-4 py-2 bg-muted text-foreground rounded-md text-sm font-medium hover:bg-muted/70 disabled:opacity-50 transition-colors"
            >
              {testMutation.isPending ? "enviando…" : "Enviar teste"}
            </button>
            {saved && <span className="text-xs text-success">✓ salvo</span>}
            {saveError && <span className="text-xs text-destructive">{saveError}</span>}
            {testMutation.isSuccess && (
              <span className="text-xs text-success">✓ disparado</span>
            )}
            {testMutation.isError && testFeedback && (
              <span className="text-xs text-destructive">{testFeedback}</span>
            )}
            {!testMutation.isError && testFeedback && !testMutation.isPending && (
              <span className="text-xs text-success">{testFeedback}</span>
            )}
          </div>
        </form>
      </Accordion>

      <Accordion
        title="Log de notificacoes"
        description={`Ultimas ${notificationLogs.length} notificacoes disparadas`}
        status={notificationLogs.length > 0 ? "info" : "muted"}
        statusLabel={notificationLogs.length > 0 ? `${notificationLogs.length} logs` : "vazio"}
      >
        {notificationLogs.length === 0 ? (
          <div className="text-xs text-muted-foreground">nenhuma notificacao ainda</div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {notificationLogs.map(log => (
              <div key={log.id} className="text-xs border-b border-border/40 pb-2">
                <div className="flex justify-between">
                  <span className="font-mono text-primary">{log.type}</span>
                  <span
                    className={log.status === "sent" ? "text-success" : "text-destructive"}
                  >
                    {log.status}
                  </span>
                </div>
                <div className="text-muted-foreground mt-1 whitespace-pre-wrap">
                  {log.message.slice(0, 200)}
                </div>
                <div className="text-muted-foreground/60 mt-1">
                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        )}
      </Accordion>

      <Accordion
        title="Saude do sistema"
        description="Status de cada componente em tempo real"
        status={healthStatus.tone}
        statusLabel={healthStatus.label}
        defaultOpen
      >
        {health ? (
          <div className="space-y-1">
            <div className="text-sm">
              <span className="text-muted-foreground">Overall: </span>
              <span
                className={
                  health.status === "healthy"
                    ? "text-success"
                    : health.status === "degraded"
                      ? "text-warning"
                      : "text-destructive"
                }
              >
                {health.status}
              </span>
            </div>
            {Object.entries(health.components).map(([key, component]) => (
              <div
                key={key}
                className="text-xs flex justify-between py-1 border-b border-border/40"
              >
                <span className="text-muted-foreground">{key}</span>
                <span
                  className={
                    component.status === "ok"
                      ? "text-success"
                      : component.status === "warning"
                        ? "text-warning"
                        : component.status === "error"
                          ? "text-destructive"
                          : "text-muted-foreground"
                  }
                >
                  {component.status}
                </span>
                {(component.message || component.error || component.status_key) && (
                  <div className="col-span-2 text-[11px] text-muted-foreground pt-1">
                    {component.status_key ? `${component.status_key}: ` : ""}
                    {component.message || component.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">carregando…</div>
        )}
      </Accordion>

      <Accordion title="Usuario" description="Conta logada">
        {me?.user && (
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Nome: </span>
              {me.user.name}
            </div>
            <div>
              <span className="text-muted-foreground">Email: </span>
              {me.user.email}
            </div>
            <div>
              <span className="text-muted-foreground">Role: </span>
              <StatusBadge tone="info" label={me.user.role} size="sm" />
            </div>
          </div>
        )}
      </Accordion>
    </div>
  );
}

function SaveBar({
  pending,
  saved,
  error,
  label,
}: {
  pending: boolean;
  saved: boolean;
  error: string | null;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-3 border-t border-border">
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {pending ? "salvando…" : label}
      </button>
      {saved && <span className="text-xs text-success">salvo</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
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
    <label className="flex items-center justify-between cursor-pointer">
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

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete ?? (type === "password" ? "new-password" : undefined)}
        className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

// D3 — UI sync do alerta de token Meta. Token long-lived expira em 60d.
// Cores: verde >10d, amarelo 4-10d, laranja 1-3d, vermelho expirado.
// Calcula em useEffect pra respeitar react-hooks/purity (Date.now impuro).
function TokenExpiryBadge({ createdAt }: { createdAt?: string | null }) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const handle = setInterval(() => setNow(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(handle);
  }, []);
  if (!createdAt) {
    return (
      <div className="text-xs text-muted-foreground">
        Sem data de criação. Configure pra receber alertas de expiração.
      </div>
    );
  }
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;
  const ageDays = (now - created.getTime()) / (1000 * 60 * 60 * 24);
  const daysToExpire = 60 - ageDays;

  let label: string;
  let cls: string;
  if (daysToExpire <= 0) {
    label = `Token VENCEU há ${Math.abs(Math.round(daysToExpire))} dia(s) — coletor não funciona`;
    cls = "bg-red-500/10 text-red-500 border-red-500/30";
  } else if (daysToExpire <= 3) {
    label = `Token vence em ${Math.ceil(daysToExpire)} dia(s) — TROCAR HOJE`;
    cls = "bg-orange-500/10 text-orange-500 border-orange-500/30";
  } else if (daysToExpire <= 10) {
    label = `Token vence em ${Math.ceil(daysToExpire)} dia(s) — programe a troca`;
    cls = "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
  } else {
    label = `Token saudável (${Math.ceil(daysToExpire)} dia(s) até expirar)`;
    cls = "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
  }
  return (
    <div className={`text-xs px-3 py-2 rounded-md border ${cls}`}>{label}</div>
  );
}

function toDateTimeLocalInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
