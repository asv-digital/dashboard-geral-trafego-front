"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  ApiError,
  type GlobalSettings,
  type GlobalSettingsInput,
  type NotificationConfig,
  type NotificationConfigInput,
} from "@/lib/api";

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

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-heading font-semibold">Configurações</h1>

      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium">Usuário</h2>
        {me?.user && (
          <div className="mt-3 text-sm space-y-1">
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
              {me.user.role}
            </div>
          </div>
        )}
      </section>

      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium">Ad account Meta</h2>
        {account ? (
          <div className="mt-3 text-sm space-y-1">
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
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">carregando…</div>
        )}
      </section>

      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium mb-4">Meta + integrações globais</h2>
        <form onSubmit={handleGlobalSave} className="space-y-3">
          <TextField
            label="Meta access token"
            value={metaForm.metaAccessToken || ""}
            onChange={value => setGlobalField("metaAccessToken", value)}
            placeholder="EAAB..."
            type="password"
          />
          <TextField
            label="Data de criação do token"
            value={toDateTimeLocalInput(metaForm.metaTokenCreatedAt)}
            onChange={value => setGlobalField("metaTokenCreatedAt", value)}
            type="datetime-local"
          />
          <TextField
            label="Ad account ID"
            value={metaForm.metaAdAccountId || ""}
            onChange={value => setGlobalField("metaAdAccountId", value)}
            placeholder="act_..."
          />
          <TextField
            label="Meta App ID"
            value={metaForm.metaAppId || ""}
            onChange={value => setGlobalField("metaAppId", value)}
            placeholder="app id opcional"
          />
          <TextField
            label="Meta App Secret"
            value={metaForm.metaAppSecret || ""}
            onChange={value => setGlobalField("metaAppSecret", value)}
            placeholder="app secret opcional"
            type="password"
          />
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
            label="Audiência compradores ID"
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
            label="Nome da audiência quente"
            value={metaForm.metaAudienceWarmName || ""}
            onChange={value => setGlobalField("metaAudienceWarmName", value)}
            placeholder="Visitantes 30d"
          />
          <TextField
            label="Kirvano webhook token"
            value={metaForm.kirvanoWebhookToken || ""}
            onChange={value => setGlobalField("kirvanoWebhookToken", value)}
            placeholder="token opcional"
            type="password"
          />
          <TextField
            label="Anthropic API key"
            value={metaForm.anthropicApiKey || ""}
            onChange={value => setGlobalField("anthropicApiKey", value)}
            placeholder="sk-ant-..."
            type="password"
          />

          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <button
              type="submit"
              disabled={updateGlobalSettings.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {updateGlobalSettings.isPending ? "salvando…" : "Salvar audiência"}
            </button>
            {globalSaved && <span className="text-xs text-success">✓ salvo</span>}
            {globalSaveError && (
              <span className="text-xs text-destructive">{globalSaveError}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Essas credenciais agora abastecem preflight, planner, webhook e healthcheck.
          </div>
        </form>
      </section>

      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium mb-4">Notificações WhatsApp</h2>
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
      </section>

      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium mb-4">Log de notificações (últimas 50)</h2>
        {notificationLogs.length === 0 ? (
          <div className="text-xs text-muted-foreground">nenhuma notificação ainda</div>
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
      </section>

      <section className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium mb-3">Saúde do sistema</h2>
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
      </section>
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

function toDateTimeLocalInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
