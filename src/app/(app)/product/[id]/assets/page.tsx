"use client";

import { use, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload } from "lucide-react";
import { api, type AssetItem } from "@/lib/api";

type UploadType = "image" | "video";
type TextAssetType = "copy" | "headline" | "hook";

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
  const [textType, setTextType] = useState<TextAssetType>("copy");
  const [textName, setTextName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [textError, setTextError] = useState<string | null>(null);

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

  const textMutation = useMutation({
    mutationFn: () =>
      api.createTextAsset(id, {
        type: textType,
        name: textName.trim() || defaultTextAssetName(textType),
        text: textContent.trim(),
      }),
    onSuccess: async () => {
      setTextError(null);
      setTextName("");
      setTextContent("");
      await queryClient.invalidateQueries({ queryKey: ["assets", id] });
    },
    onError: createError => {
      setTextError(createError instanceof Error ? createError.message : "falha ao salvar texto");
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("productId", id);
      form.append("type", uploadType);
      form.append("name", file.name);

      const response = await fetch("/api/assets", {
        method: "POST",
        credentials: "include",
        body: form,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `http ${response.status}`);
      }

      await queryClient.invalidateQueries({ queryKey: ["assets", id] });
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "falha no upload"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!textContent.trim()) {
      setTextError("texto obrigatório");
      return;
    }
    setTextError(null);
    textMutation.mutate();
  };

  const assets = data?.assets ?? [];
  const media = assets.filter(asset => asset.type === "video" || asset.type === "image");
  const texts = assets.filter(
    asset =>
      asset.type === "copy" || asset.type === "headline" || asset.type === "hook"
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-heading font-semibold">Conteudo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suba criativos aqui — o agente usa no launch e no rebalance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={uploadType}
            onChange={event => setUploadType(parseUploadType(event.target.value))}
            className="px-3 py-2 bg-input border border-border rounded-md text-sm"
          >
            <option value="video">vídeo</option>
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
      </header>

      {error && <div className="text-xs text-destructive">{error}</div>}

      <section className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
            Biblioteca de texto
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Headlines, copies e hooks alimentam o planner e a montagem dos anúncios.
          </p>
        </div>

        <form onSubmit={handleTextSubmit} className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Tipo</span>
              <select
                value={textType}
                onChange={event => setTextType(parseTextType(event.target.value))}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
              >
                <option value="copy">copy</option>
                <option value="headline">headline</option>
                <option value="hook">hook</option>
              </select>
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-xs text-muted-foreground">Nome interno</span>
              <input
                type="text"
                value={textName}
                onChange={event => setTextName(event.target.value)}
                placeholder={defaultTextAssetName(textType)}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Texto</span>
            <textarea
              value={textContent}
              onChange={event => setTextContent(event.target.value)}
              rows={4}
              placeholder={
                textType === "headline"
                  ? "Ex: Método simples para destravar suas vendas"
                  : textType === "hook"
                    ? "Ex: Se o seu CPA disparou, olha isso"
                    : "Escreva a copy principal do anúncio"
              }
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={textMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {textMutation.isPending ? "salvando…" : "Salvar texto"}
            </button>
            {textMutation.isSuccess && (
              <span className="text-xs text-success">texto salvo</span>
            )}
            {textError && <span className="text-xs text-destructive">{textError}</span>}
          </div>
        </form>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Mídia ({media.length})
        </h3>
        {media.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
            Nenhum vídeo/imagem ainda
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {media.map(asset => (
              <MediaAssetCard
                key={asset.id}
                asset={asset}
                onArchive={assetId => archiveMutation.mutate(assetId)}
              />
            ))}
          </div>
        )}
      </section>

      {texts.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Textos ({texts.length})
          </h3>
          <div className="space-y-2">
            {texts.map(asset => (
              <div key={asset.id} className="bg-card border border-border rounded-lg p-3 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{asset.name}</span>
                  <span className="text-muted-foreground uppercase">{asset.type}</span>
                </div>
                {asset.content && (
                  <div className="text-muted-foreground mt-1">{asset.content}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function parseUploadType(value: string): UploadType {
  return value === "image" ? "image" : "video";
}

function parseTextType(value: string): TextAssetType {
  if (value === "headline" || value === "hook") return value;
  return "copy";
}

function defaultTextAssetName(type: TextAssetType): string {
  if (type === "headline") return "Headline principal";
  if (type === "hook") return "Hook de abertura";
  return "Copy principal";
}

function MediaAssetCard({
  asset,
  onArchive,
}: {
  asset: AssetItem;
  onArchive: (assetId: string) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center text-[10px] text-muted-foreground uppercase">
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
      <div className="mt-3 text-xs font-medium truncate">{asset.name}</div>
      <div className="flex items-center justify-between mt-1">
        <StatusChip status={asset.status} />
        <button
          onClick={() => onArchive(asset.id)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {asset.status === "uploaded" && (
        <div className="text-[10px] text-warning mt-1">
          aguardando sync com Meta no próximo launch/sync
        </div>
      )}
      {asset.error && <div className="text-[10px] text-destructive mt-1">{asset.error}</div>}
    </div>
  );
}

function StatusChip({ status }: { status: AssetItem["status"] }) {
  const tone =
    status === "ready"
      ? "text-success"
      : status === "uploaded"
        ? "text-warning"
        : status === "failed"
          ? "text-destructive"
          : "text-muted-foreground";

  return <span className={`text-[10px] uppercase ${tone}`}>{status}</span>;
}
