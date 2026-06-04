"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Check, Loader2, X, ZoomIn, ZoomOut } from "lucide-react";

/**
 * Diálogo full-screen para recortar una imagen antes de subirla. Misma estética
 * y gestos que el cropper de la foto de perfil (`avatar-crop-dialog`), pero
 * generalizado:
 *   - `shape="round"` + aspect 1 → logo CUADRADO de la liga (como el avatar).
 *   - `shape="rect"` + `aspectRange` → logo de MARCA rectangular, con un control
 *     para ajustar la proporción dentro de límites (más permisivo en horizontal).
 *
 * Salida SIEMPRE PNG preservando transparencia (sin relleno blanco) — clave para
 * logos corporativos con fondo transparente.
 */

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.05;
const ASPECT_STEP = 0.05;

export type CropLabels = {
  title: string;
  cancel: string;
  done: string;
  saving: string;
  dragHint: string;
  aspectLabel?: string;
};

export function LogoCropDialog({
  open,
  sourceUrl,
  onCancel,
  onConfirm,
  pending = false,
  shape = "round",
  aspect: fixedAspect = 1,
  aspectRange,
  outputHeight = 360,
  labels,
}: {
  open: boolean;
  sourceUrl: string | null;
  onCancel: () => void;
  onConfirm: (file: File) => void | Promise<void>;
  pending?: boolean;
  shape?: "round" | "rect";
  aspect?: number;
  /** Si se pasa, muestra un slider para ajustar la proporción (rect). */
  aspectRange?: { min: number; max: number };
  /** Alto del PNG de salida; el ancho se deriva del aspect (rect) o = alto (round). */
  outputHeight?: number;
  labels: CropLabels;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(
    aspectRange ? (aspectRange.min + aspectRange.max) / 2 : fixedAspect,
  );
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAspect(aspectRange ? (aspectRange.min + aspectRange.max) / 2 : fixedAspect);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl, open]);

  const onCropComplete = useCallback((_a: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!sourceUrl || !croppedArea) return;
    setGenerating(true);
    setError(null);
    try {
      const outH = outputHeight;
      const outW = Math.round(shape === "round" ? outH : outH * aspect);
      const file = await renderCroppedPng(sourceUrl, croppedArea, outW, outH);
      await onConfirm(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar la imagen.");
    } finally {
      setGenerating(false);
    }
  }

  if (!open) return null;
  const busy = generating || pending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
      className="fixed inset-0 z-[80] flex flex-col bg-black/90 backdrop-blur-sm"
    >
      <header className="shrink-0 border-b border-white/10 bg-black/30 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3 text-white">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 px-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] transition hover:bg-white/10 disabled:opacity-40"
          >
            <X className="size-3.5" /> {labels.cancel}
          </button>
          <p className="truncate font-mono text-[0.6rem] uppercase tracking-[0.22em] text-white/70">
            {labels.title}
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !croppedArea || !sourceUrl}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            {busy ? labels.saving : labels.done}
          </button>
        </div>
      </header>

      <main className="relative flex-1">
        {sourceUrl ? (
          <Cropper
            image={sourceUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={shape}
            showGrid={shape === "rect"}
            minZoom={ZOOM_MIN}
            maxZoom={ZOOM_MAX}
            zoomSpeed={0.5}
            restrictPosition
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        ) : null}
      </main>

      <footer className="shrink-0 space-y-3 border-t border-white/10 bg-black/30 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 text-white">
          <ZoomOut className="size-4 text-white/70" />
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            value={zoom}
            disabled={busy}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="flex-1 accent-[var(--color-arena)]"
          />
          <ZoomIn className="size-4 text-white/70" />
        </div>
        {aspectRange ? (
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3 text-white">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white/60">
              {labels.aspectLabel ?? "Ancho"}
            </span>
            <input
              type="range"
              min={aspectRange.min}
              max={aspectRange.max}
              step={ASPECT_STEP}
              value={aspect}
              disabled={busy}
              onChange={(e) => setAspect(Number(e.target.value))}
              aria-label={labels.aspectLabel ?? "Proporción"}
              className="flex-1 accent-[var(--color-arena)]"
            />
          </div>
        ) : null}
        <p className="mx-auto max-w-2xl text-center font-mono text-[0.55rem] uppercase tracking-[0.22em] text-white/50">
          {labels.dragHint}
        </p>
        {error ? (
          <p className="text-center text-xs text-[var(--color-danger)]">{error}</p>
        ) : null}
      </footer>
    </div>
  );
}

/**
 * Rasteriza el área recortada a un PNG (preservando transparencia) del tamaño
 * pedido y devuelve un File listo para subir.
 */
async function renderCroppedPng(
  sourceUrl: string,
  area: Area,
  outW: number,
  outH: number,
): Promise<File> {
  const img = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  // Sin relleno → se preserva la transparencia del PNG original.
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("No se pudo generar la imagen."));
        resolve(new File([blob], "logo.png", { type: "image/png" }));
      },
      "image/png",
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = src;
  });
}
