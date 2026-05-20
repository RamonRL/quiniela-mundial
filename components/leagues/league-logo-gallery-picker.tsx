"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { PRESET_LEAGUE_LOGOS } from "@/lib/league-logos";

type Props = {
  /** URL de logo inicial (preset o custom). Si es un preset, marca esa
   * tarjeta como seleccionada de entrada. */
  initialLogoUrl: string | null;
  /** Nombre del input oculto que viajará en el FormData. */
  inputName?: string;
  /** Si true, oculta el footer informativo (cuando el contenedor ya
   * incluye su propio texto explicativo). */
  hideHelper?: boolean;
};

/**
 * Grid compacto de logos preset para quinielas Free. Emite el `id`
 * del preset en un input oculto — el server action lo resuelve a la
 * URL canónica vía `presetUrlById()`.
 *
 * Las quinielas premium pueden usar este picker como alternativa al
 * dropzone de logo custom: el server action prioriza el `logo` File
 * si llega; si no, usa el `logoPresetId`.
 */
export function LeagueLogoGalleryPicker({
  initialLogoUrl,
  inputName = "logoPresetId",
  hideHelper,
}: Props) {
  const initialId =
    PRESET_LEAGUE_LOGOS.find((p) => p.url === initialLogoUrl)?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialId);

  return (
    <div className="space-y-2">
      <input type="hidden" name={inputName} value={selectedId ?? ""} />
      <div className="flex flex-wrap gap-2">
        {PRESET_LEAGUE_LOGOS.map((preset) => {
          const isSelected = selectedId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelectedId(preset.id)}
              aria-label={`Elegir logo ${preset.name}`}
              aria-pressed={isSelected}
              className={`group relative size-11 overflow-hidden rounded-full border transition-all sm:size-12 ${
                isSelected
                  ? "border-[var(--color-arena)] shadow-[var(--shadow-arena)] ring-2 ring-[var(--color-arena)]/30 ring-offset-2 ring-offset-[var(--color-bg)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-arena)]/60"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preset.url}
                alt={preset.name}
                className="size-full object-cover"
                loading="lazy"
              />
              {isSelected ? (
                <span
                  aria-hidden
                  className="absolute inset-0 grid place-items-center bg-black/30"
                >
                  <Check className="size-4 text-white" strokeWidth={3} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {!hideHelper ? (
        <p className="font-editorial text-[0.7rem] italic text-[var(--color-muted-foreground)]">
          Logo corporativo custom — incluido en los Pases Mundial 2026.
        </p>
      ) : null}
    </div>
  );
}
