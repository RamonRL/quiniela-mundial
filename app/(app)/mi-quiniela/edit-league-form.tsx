"use client";

import { useActionState, useState } from "react";
import { Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LeagueLogoDropzone } from "@/components/leagues/league-logo-dropzone";
import { LeagueLogoGalleryPicker } from "@/components/leagues/league-logo-gallery-picker";
import { updateLeague, type LeagueFormState } from "@/lib/league-actions";

const initial: LeagueFormState = { ok: false };

type Props = {
  league: {
    id: number;
    name: string;
    logoUrl: string | null;
    isPremium: boolean;
  };
};

/**
 * Form de edición de una quiniela privada. Solo se renderiza desde
 * /mi-quiniela cuando `isOwner === true`. Cambia el nombre y/o el
 * logo (dropzone con compresión silent vía LeagueLogoDropzone).
 *
 * El botón Guardar queda disabled si el form está pendiente o si
 * `compressing` está en true — la versión optimizada del logo aún
 * no ha llegado al <input file>.
 */
export function EditLeagueForm({ league }: Props) {
  const [state, action, pending] = useActionState(updateLeague, initial);
  const [name, setName] = useState(league.name);
  const [logoBusy, setLogoBusy] = useState(false);

  return (
    <form
      action={action}
      className="space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <input type="hidden" name="id" value={league.id} />
      <header className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--color-border)] pb-3 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        <span>Editar quiniela</span>
      </header>

      <div className="space-y-3">
        <Label htmlFor="league-name">Nombre · máx 25 caracteres</Label>
        <Input
          id="league-name"
          name="name"
          required
          maxLength={25}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-3 border-t border-dashed border-[var(--color-border)] pt-4">
        <Label>Logo · galería</Label>
        <LeagueLogoGalleryPicker initialLogoUrl={league.logoUrl} />
      </div>

      {league.isPremium ? (
        <div className="space-y-3 border-t border-dashed border-[var(--color-arena)]/40 pt-4">
          <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
            <Sparkles className="size-3.5" />
            <span>Logo corporativo · Pase Mundial 2026</span>
          </div>
          <div className="flex items-start gap-4">
            <LeagueLogoDropzone
              initialLogoUrl={league.logoUrl}
              fallbackName={name}
              onCompressingChange={setLogoBusy}
            />
            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              Pulsa el círculo para subir tu logo (PNG/JPG). Sobrescribe la
              elección de la galería al guardar.
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-[var(--color-border)] p-3 font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          ¿Logo corporativo custom? Está incluido en los{" "}
          <Link href="/precios" className="text-[var(--color-arena)] underline-offset-2 hover:underline">
            Pases Mundial 2026
          </Link>
          .
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-[var(--color-border)] pt-4">
        <Button type="submit" disabled={pending || logoBusy}>
          <Save />
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        {state.error ? (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-[var(--color-success)]">
            {state.message ?? "Guardado."}
          </p>
        ) : null}
      </div>
    </form>
  );
}
