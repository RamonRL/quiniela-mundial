"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LeagueLogoDropzone } from "@/components/leagues/league-logo-dropzone";
import { updateLeague, type LeagueFormState } from "@/lib/league-actions";

const initial: LeagueFormState = { ok: false };

type Props = {
  league: {
    id: number;
    name: string;
    logoUrl: string | null;
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

      <div className="grid items-start gap-6 sm:grid-cols-[auto_1fr] sm:gap-8">
        <LeagueLogoDropzone
          initialLogoUrl={league.logoUrl}
          fallbackName={name}
          onCompressingChange={setLogoBusy}
        />
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
          <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
            Pulsa el círculo para cambiar el logo. Si no subes una nueva
            imagen, el logo actual se conserva.
          </p>
        </div>
      </div>

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
