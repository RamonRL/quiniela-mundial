"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { linkPlayers } from "./actions";

const SKIP = "skip";

type Row = {
  playerId: number;
  ourLabel: string;
  proposalApiId: number | null;
  proposalHow: string | null;
};

export function LinkForm({
  teamName,
  rows,
  apiOptions,
  apiUnmatched,
}: {
  teamName: string;
  rows: Row[];
  apiOptions: { id: number; label: string }[];
  apiUnmatched: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      rows.map((r) => [r.playerId, r.proposalApiId != null ? String(r.proposalApiId) : SKIP]),
    ),
  );

  const proposedCount = useMemo(
    () => rows.filter((r) => r.proposalApiId != null).length,
    [rows],
  );

  const save = () =>
    start(async () => {
      const fd = new FormData();
      let n = 0;
      for (const [playerId, apiId] of Object.entries(sel)) {
        if (apiId !== SKIP) {
          fd.set(`link:${playerId}`, apiId);
          n += 1;
        }
      }
      if (n === 0) {
        toast.error("No hay vínculos seleccionados.");
        return;
      }
      const r = await linkPlayers(fd);
      if (r.ok) {
        toast.success(r.message ?? "Vínculos guardados.");
        router.refresh();
      } else {
        toast.error(r.error ?? "No se pudo guardar.");
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {teamName} · {rows.length} sin vincular · {proposedCount} con propuesta
        </p>
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          <Check className="size-3.5" /> Guardar vínculos
        </Button>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.playerId}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <span className="min-w-44 font-display text-sm tracking-tight">{r.ourLabel}</span>
            <span className="text-[var(--color-muted-foreground)]">→</span>
            <div className="ml-auto flex items-center gap-2">
              {r.proposalHow ? (
                <Badge variant="outline" className="text-[0.6rem]">
                  {r.proposalHow}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[0.6rem] text-[var(--color-muted-foreground)]">
                  sin propuesta
                </Badge>
              )}
              <Select
                value={sel[r.playerId]}
                onValueChange={(v) => setSel((s) => ({ ...s, [r.playerId]: v }))}
              >
                <SelectTrigger className="h-9 w-64">
                  <SelectValue placeholder="Elegir jugador de API…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={SKIP}>— No vincular —</SelectItem>
                  {apiOptions.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {apiUnmatched.length > 0 ? (
        <details className="rounded-lg border border-dashed border-[var(--color-border)] p-3">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {apiUnmatched.length} jugadores de API-Football sin propuesta
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-[var(--color-muted-foreground)]">
            {apiUnmatched.map((a, i) => (
              <li key={i}>· {a}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
