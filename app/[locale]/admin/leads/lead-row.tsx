"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  updateCommercialLead,
  type LeagueFormState,
} from "@/lib/league-actions";

const initialState: LeagueFormState = { ok: false };

type LeadStatus = "new" | "contacted" | "won" | "lost";

const STATUS_OPTIONS: { id: LeadStatus; label: string }[] = [
  { id: "new", label: "Nuevo" },
  { id: "contacted", label: "Contactado" },
  { id: "won", label: "Ganado" },
  { id: "lost", label: "Perdido" },
];

type Props = {
  lead: {
    id: number;
    status: LeadStatus | string;
    notes: string | null;
    message: string | null;
  };
};

export function LeadRow({ lead }: Props) {
  const [state, action, pending] = useActionState(updateCommercialLead, initialState);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LeadStatus>(
    (STATUS_OPTIONS.find((o) => o.id === lead.status)?.id ?? "new") as LeadStatus,
  );

  return (
    <div className="space-y-1.5">
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="id" value={lead.id} />
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus)}
          className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-arena)]"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "…" : "OK"}
        </Button>
        {open ? null : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] hover:text-[var(--color-arena)]"
          >
            +
          </button>
        )}
      </form>
      {open ? (
        <form action={action} className="space-y-1.5">
          <input type="hidden" name="id" value={lead.id} />
          <input type="hidden" name="status" value={status} />
          {lead.message ? (
            <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 font-editorial text-[0.7rem] italic leading-snug text-[var(--color-muted-foreground)]">
              {lead.message}
            </p>
          ) : null}
          <textarea
            name="notes"
            rows={2}
            defaultValue={lead.notes ?? ""}
            placeholder="Notas internas…"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-arena)]"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              Guardar
            </Button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]"
            >
              cerrar
            </button>
          </div>
        </form>
      ) : null}
      {state.error ? (
        <p className="text-[0.65rem] text-[var(--color-danger)]">{state.error}</p>
      ) : null}
    </div>
  );
}
