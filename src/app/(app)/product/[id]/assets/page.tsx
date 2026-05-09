"use client";

import { use, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Trash2, Upload, Pencil, RotateCw, X, Check } from "lucide-react";
import { api, type AssetItem } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type Tone } from "@/components/ui/status-badge";

type UploadType = "image" | "video";

const STATUS_TONE: Record<string, Tone> = {
  ready: "success",
  uploaded: "warning",
  failed: "danger",
  retired: "muted",
};

const STATUS_LABEL: Record<string, string> = {
  ready: "Pronto",
  uploaded: "Subindo",
  failed: "Falhou",
  retired: "Arquivado",
};

// Limites Meta: visivel sem reticencias
const HEADLINE_MAX_VISIBLE = 40;
const COPY_MAX_VISIBLE = 125;
const HOOK_RECOMMENDED = 60;

export default function AssetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<UploadType>("video");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["assets", id],
    queryFn: () => api.listAssets(id),
    refetchInterval: 10_000,
  });

  const archiveMutation = useMutation({
    mutationFn: (assetId: string) => api.archiveAsset(assetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets", id] }),
    onError: err => {
      setError(err instanceof Error ? err.message : "falha ao arquivar asset");
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      await api.uploadAsset(id, file, uploadType, file.name);
      await queryClient.invalidateQueries({ queryKey: ["assets", id] });
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const assets = data?.assets ?? [];
  const media = assets.filter(asset => asset.type === "video" || asset.type === "image");

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Conteudo"
        subtitle="Sobe o criativo (video ou imagem). IA gera copy + headline + hook automaticamente. Voce edita se quiser ajustar."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={uploadType}
              onChange={event =>
                setUploadType(event.target.value === "image" ? "image" : "video")
              }
              className="px-3 py-2 bg-input border border-border rounded-md text-sm"
            >
              <option value="video">video</option>
              <option value="image">imagem</option>
            </select>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              {uploading ? "enviando…" : "Upload"}
              <input
                ref={fileRef}
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                accept={uploadType === "video" ? "video/*" : "image/*"}
                className="hidden"
              />
            </label>
          </div>
        }
      />

      {error && <div className="text-xs text-destructive">{error}</div>}

      {media.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum criativo ainda.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Sobe um video ou imagem. A IA gera os textos automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {media.map(asset => (
            <CreativeCard
              key={asset.id}
              asset={asset}
              productId={id}
              onArchive={() => archiveMutation.mutate(asset.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreativeCard({
  asset,
  productId,
  onArchive,
}: {
  asset: AssetItem;
  productId: string;
  onArchive: () => void;
}) {
  const queryClient = useQueryClient();
  const [genError, setGenError] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: () => api.generateAssetText(asset.id),
    onSuccess: () => {
      setGenError(null);
      queryClient.invalidateQueries({ queryKey: ["assets", productId] });
    },
    onError: err => {
      setGenError(err instanceof Error ? err.message : "falha ao gerar");
    },
  });

  const hasText =
    !!asset.generatedCopy && !!asset.generatedHeadline && !!asset.generatedHook;

  return (
    <article className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0 md:gap-4">
        {/* Preview */}
        <div className="md:p-3">
          <div className="aspect-video bg-muted md:rounded-md overflow-hidden flex items-center justify-center text-[10px] text-muted-foreground uppercase">
            {asset.originalUrl ? (
              asset.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.originalUrl}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={asset.originalUrl}
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                />
              )
            ) : (
              asset.type
            )}
          </div>
          <div className="px-3 md:px-0 mt-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{asset.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge
                  size="sm"
                  tone={STATUS_TONE[asset.status] ?? "muted"}
                  label={STATUS_LABEL[asset.status] ?? asset.status}
                />
                {asset.metaMediaId && (
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Meta sync
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onArchive}
              className="text-muted-foreground hover:text-destructive shrink-0"
              title="Arquivar criativo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {asset.error && (
            <div className="px-3 md:px-0 text-[10px] text-destructive mt-1">{asset.error}</div>
          )}
        </div>

        {/* Textos */}
        <div className="px-4 pb-4 md:py-4 md:pl-0 md:pr-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
              Textos para anuncio
            </h3>
            <button
              onClick={() => generate.mutate()}
              disabled={generate.isPending || asset.status !== "ready"}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
              title={asset.status !== "ready" ? "Aguarde processamento da midia" : undefined}
            >
              {hasText ? (
                <RotateCw className={`w-3 h-3 ${generate.isPending ? "animate-spin" : ""}`} />
              ) : (
                <Sparkles className={`w-3 h-3 ${generate.isPending ? "animate-pulse" : ""}`} />
              )}
              {generate.isPending
                ? "gerando…"
                : hasText
                  ? "Regenerar com IA"
                  : "Gerar com IA"}
            </button>
          </div>

          {genError && (
            <div className="text-[11px] text-destructive">
              {genError === "llm_not_configured" || genError === "anthropic_not_configured"
                ? "Provider de IA nao configurado. Setta GOOGLE_AI_API_KEY ou anthropicApiKey."
                : genError === "asset_type_not_supported"
                  ? "Tipo de asset nao suportado."
                  : `Falha: ${genError}`}
            </div>
          )}

          <TextField
            label="Copy principal"
            limit={COPY_MAX_VISIBLE}
            limitLabel={`max ${COPY_MAX_VISIBLE} char visivel antes do "ver mais"`}
            value={asset.generatedCopy}
            assetId={asset.id}
            field="copy"
            productId={productId}
            multiline
          />

          <TextField
            label="Headline"
            limit={HEADLINE_MAX_VISIBLE}
            limitLabel={`max ${HEADLINE_MAX_VISIBLE} char visivel`}
            value={asset.generatedHeadline}
            assetId={asset.id}
            field="headline"
            productId={productId}
          />

          <TextField
            label="Hook (3 primeiros segundos)"
            limit={HOOK_RECOMMENDED}
            limitLabel={`recomendado < ${HOOK_RECOMMENDED} char`}
            value={asset.generatedHook}
            assetId={asset.id}
            field="hook"
            productId={productId}
          />

          {asset.textGeneratedAt && (
            <div className="text-[10px] text-muted-foreground">
              gerado em{" "}
              {new Date(asset.textGeneratedAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function TextField({
  label,
  limit,
  limitLabel,
  value,
  assetId,
  field,
  productId,
  multiline = false,
}: {
  label: string;
  limit: number;
  limitLabel: string;
  value: string | null;
  assetId: string;
  field: "copy" | "headline" | "hook";
  productId: string;
  multiline?: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => api.updateAssetText(assetId, { [field]: draft }),
    onSuccess: () => {
      setEditing(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["assets", productId] });
    },
    onError: err => {
      setError(err instanceof Error ? err.message : "falha ao salvar");
    },
  });

  const startEdit = () => {
    setDraft(value ?? "");
    setError(null);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const len = (editing ? draft : value ?? "").length;
  const overLimit = len > limit;
  const empty = !value && !editing;

  return (
    <div className="border border-border rounded-md p-2.5 bg-background/40">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[10px]"
          >
            <Pencil className="w-2.5 h-2.5" />
            editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-1.5 space-y-1.5">
          {multiline ? (
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={3}
              className="w-full px-2.5 py-1.5 bg-input border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-input border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[10px] tabular-nums ${
                draft.length > limit ? "text-warning" : "text-muted-foreground"
              }`}
            >
              {draft.length}c · {limitLabel}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={cancel}
                disabled={save.isPending}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 border border-border rounded hover:bg-muted text-muted-foreground"
              >
                <X className="w-2.5 h-2.5" />
                cancelar
              </button>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending || draft.trim() === ""}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
              >
                <Check className="w-2.5 h-2.5" />
                {save.isPending ? "salvando…" : "salvar"}
              </button>
            </div>
          </div>
          {error && <div className="text-[10px] text-destructive">{error}</div>}
        </div>
      ) : empty ? (
        <div className="text-xs text-muted-foreground italic mt-1">
          (vazio — clique em &quot;Gerar com IA&quot; acima ou &quot;editar&quot; pra preencher manual)
        </div>
      ) : (
        <div className="mt-1 space-y-1">
          <div className="text-sm leading-snug whitespace-pre-wrap">{value}</div>
          <div className="flex items-center gap-2 text-[10px]">
            <span
              className={`tabular-nums ${overLimit ? "text-warning" : "text-muted-foreground"}`}
            >
              {len}c
            </span>
            {overLimit && (
              <span className="text-warning">⚠ {limitLabel}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
