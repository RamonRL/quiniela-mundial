"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Check, Loader2, X, ZoomIn, ZoomOut } from "lucide-react";

/**
 * Modal full-screen para recortar la foto de perfil antes de subirla.
 *
 * Mantiene siempre aspect ratio 1:1 — el output final es un JPEG 800×800
 * generado vía canvas, listo para pasarse a la server action. El zoom va
 * de 1 a 3 (la foto entera centrada en el cuadrado hasta zoom moderado).
 *
 * Soporta touch (pinch + drag) en móvil y wheel + drag en desktop, todo
 * gestionado por `react-easy-crop`.
 */

const OUTPUT_SIZE = 800;
const JPEG_QUALITY = 0.85;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.05;

export function AvatarCropDialog({
  open,
  sourceUrl,
  onCancel,
  onConfirm,
  pending = false,
}: {
  open: boolean;
  sourceUrl: string | null;
  onCancel: () => void;
  onConfirm: (file: File) => void | Promise<void>;
  /** El padre puede señalar que un upload está en curso para deshabilitar el botón. */
  pending?: boolean;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset zoom/pan al cambiar de imagen o reabrir el dialog.
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setError(null);
    }
  }, [sourceUrl, open]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!sourceUrl || !croppedArea) return;
    setGenerating(true);
    setError(null);
    try {
      const file = await renderCroppedFile(sourceUrl, croppedArea);
      await onConfirm(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar la imagen.");
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
      aria-label="Recortar foto de perfil"
      className="fixed inset-0 z-[80] flex flex-col bg-black/90 backdrop-blur-sm"
    >
      {/* Topbar */}
      <header className="shrink-0 border-b border-white/10 bg-black/30 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3 text-white">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 px-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] transition hover:bg-white/10 disabled:opacity-40"
          >
            <X className="size-3.5" /> Cancelar
          </button>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-white/70">
            Ajusta tu foto
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !croppedArea || !sourceUrl}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            {busy ? "Guardando…" : "Listo"}
          </button>
        </div>
      </header>

      {/* Canvas de crop */}
      <main className="relative flex-1">
        {sourceUrl ? (
          <Cropper
            image={sourceUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            minZoom={ZOOM_MIN}
            maxZoom={ZOOM_MAX}
            zoomSpeed={0.5}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        ) : null}
      </main>

      {/* Slider de zoom */}
      <footer className="shrink-0 border-t border-white/10 bg-black/30 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto w-full max-w-2xl px-4 py-3 text-white">
          <div className="flex items-center gap-3">
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
          <p className="mt-1 text-center font-mono text-[0.55rem] uppercase tracking-[0.22em] text-white/50">
            Arrastra para mover · pellizca o usa la rueda para hacer zoom
          </p>
          {error ? (
            <p className="mt-2 text-center text-xs text-[var(--color-danger)]">
              {error}
            </p>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

/**
 * Rasteriza el área recortada (en coordenadas de la imagen original) a un
 * canvas 800×800 y devuelve un `File` JPEG q=0.85. Listo para pasarse en
 * una FormData a la server action.
 */
async function renderCroppedFile(sourceUrl: string, area: Area): Promise<File> {
  const img = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  // Fondo blanco para que las imágenes con transparencia no salgan negras.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo generar la imagen recortada."));
          return;
        }
        resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      JPEG_QUALITY,
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
