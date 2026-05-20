"use client";

import { useActionState, useState } from "react";
import { Megaphone, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateLeagueAnnouncement,
  type LeagueFormState,
} from "@/lib/league-actions";

const initial: LeagueFormState = { ok: false };

type Props = {
  leagueId: number;
  initialValue: string | null;
};

/**
 * Editor del anuncio fijado de la liga. Premium-only — el server action
 * lo refuerza pero el caller ya solo monta este form para owners
 * premium. Cuerpo opcional (vacío = limpia el anuncio).
 */
export function AnnouncementForm({ leagueId, initialValue }: Props) {
  const [state, action, pending] = useActionState(
    updateLeagueAnnouncement,
    initial,
  );
  const [value, setValue] = useState(initialValue ?? "");

  return (
    <form
      action={action}
      className="space-y-3 rounded-xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] p-5"
    >
      <input type="hidden" name="id" value={leagueId} />
      <header className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
        <Megaphone className="size-3.5" />
        <span>Anuncio fijado · Pase Mundial 2026</span>
      </header>
      <textarea
        name="announcement"
        rows={2}
        maxLength={280}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ej. 'El ganador se lleva 200€ en Amazon. Fecha de entrega: 25/07.'"
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-arena)]"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          Lo verán todos los miembros como banner en /mi-quiniela.
          {" "}
          <span className="font-mono not-italic uppercase tracking-[0.18em]">
            {value.length}/280
          </span>
        </p>
        <Button type="submit" size="sm" disabled={pending}>
          <Save className="size-3.5" />
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      {state.error ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      {state.ok && state.message ? (
        <p className="text-sm text-[var(--color-success)]">{state.message}</p>
      ) : null}
    </form>
  );
}
