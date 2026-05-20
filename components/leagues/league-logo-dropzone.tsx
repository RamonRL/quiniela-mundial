"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { compressImage, formatBytes } from "@/lib/client-image";
import { initials } from "@/lib/utils";

const MAX_RAW_INPUT_BYTES = 20 * 1024 * 1024;

type Props = {
  /** URL actual del logo, si la hay. */
  initialLogoUrl: string | null;
  /** Nombre actual de la liga — alimenta el fallback con iniciales. */
  fallbackName: string;
  /** Name del <input file> que viajará en el FormData. */
  inputName?: string;
  /** Tamaño en rem del avatar circular. */
  sizeClass?: string;
  /** Si `true`, el botón de submit del padre debe ignorar este compressing. */
  onCompressingChange?: (compressing: boolean) => void;
};

/**
 * Dropzone clickable para el logo de una quiniela. Mismo patrón que
 * el avatar del onboarding/perfil: el usuario suelta una imagen, se
 * comprime en cliente con `compressImage` (silent) y la versión
 * comprimida reemplaza el `File` del <input> vía `DataTransfer`,
 * para que el FormData del submit envíe ya el optimizado.
 *
 * El componente expone su estado `compressing` opcionalmente al padre
 * para que pueda bloquear el submit y evitar que el `File` crudo se
 * envíe por un click prematuro.
 */
export function LeagueLogoDropzone({
  initialLogoUrl,
  fallbackName,
  inputName = "logo",
  sizeClass = "size-28 sm:size-32",
  onCompressingChange,
}: Props) {
  const [preview, setPreview] = useState<string | null>(initialLogoUrl);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const display = fallbackName.trim() || "QM";

  async function pickFile(file: File) {
    setError(null);
    if (file.size > MAX_RAW_INPUT_BYTES) {
      setError(
        `La imagen pesa ${formatBytes(file.size)}. Demasiado grande, prueba con otra.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    onCompressingChange?.(true);
    try {
      const result = await compressImage(file, { maxDim: 400, quality: 0.85 });
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(result.file);
        fileInputRef.current.files = dt.files;
      }
      setPreview(URL.createObjectURL(result.file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar la imagen.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      onCompressingChange?.(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) pickFile(file);
        }}
        aria-label="Subir logo de la quiniela"
        className={`group relative shrink-0 ${sizeClass}`}
      >
        <Avatar
          className={`${sizeClass} border-2 border-[var(--color-border-strong)] shadow-[var(--shadow-elev-1)] transition-all group-hover:border-[var(--color-arena)] group-hover:shadow-[var(--shadow-arena)]`}
        >
          {preview ? <AvatarImage src={preview} alt={display} /> : null}
          <AvatarFallback className="font-display text-3xl tracking-tight">
            {initials(display)}
          </AvatarFallback>
        </Avatar>
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <span className="flex flex-col items-center gap-1 text-white">
            <Camera className="size-5" />
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em]">
              Logo
            </span>
          </span>
        </span>
        <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)] ring-4 ring-[var(--color-bg)]">
          <Camera className="size-3.5" />
        </span>
      </button>
      <input
        ref={fileInputRef}
        name={inputName}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickFile(f);
        }}
      />
      {error ? (
        <p className="text-xs text-[var(--color-danger)]">{error}</p>
      ) : null}
    </div>
  );
}
