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
};

/**
 * Grid de logos preset para que las quinielas Free elijan uno desde
 * el onboarding o desde /mi-quiniela. Emite el `id` del preset en
 * un input oculto — el server action lo resuelve a la URL canónica
 * vía `presetUrlById()`.
 *
 * Las quinielas premium pueden usar este picker como alternativa al
 * dropzone de logo custom: el server action prioriza el `logo`
 * File si llega; si no, usa el `logoPresetId`.
 */
export function LeagueLogoGalleryPicker({
  initialLogoUrl,
  inputName = "logoPresetId",
}: Props) {
  const initialId =
    PRESET_LEAGUE_LOGOS.find((p) => p.url === initialLogoUrl)?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialId);

  return (
    <div className="space-y-3">
      <input type="hidden" name={inputName} value={selectedId ?? ""} />
      <div className="grid grid-cols-5 gap-3 sm:grid-cols-5">
        {PRESET_LEAGUE_LOGOS.map((preset) => {
          const isSelected = selectedId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelectedId(preset.id)}
              aria-label={`Elegir logo ${preset.name}`}
              aria-pressed={isSelected}
              className={`group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all ${
                isSelected
                  ? "border-[var(--color-arena)] shadow-[var(--shadow-arena)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-arena)]/60 hover:-translate-y-0.5"
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
                  className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
        Elige un logo de la galería.{" "}
        <span className="font-mono not-italic uppercase tracking-[0.18em]">
          Para subir tu logo corporativo, hace falta un Pase Mundial 2026 →
        </span>
      </p>
    </div>
  );
}
