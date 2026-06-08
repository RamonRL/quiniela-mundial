"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { dismissPending, reconcileScorer } from "./actions";

/**
 * Una fila de goleador en espera: muestra el dato del proveedor y un
 * selector con los jugadores del equipo para asignarlo. Al confirmar,
 * el partido se re-puntúa.
 */
export function PendingScorerRow({
  pendingId,
  matchCode,
  playerName,
  minute,
  isOwnGoal,
  isPenalty,
  teamPlayers,
}: {
  pendingId: number;
  matchCode: string;
  playerName: string;
  minute: number | null;
  isOwnGoal: boolean;
  isPenalty: boolean;
  teamPlayers: { id: number; label: string }[];
}) {
  const [playerId, setPlayerId] = useState<string>("");
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{matchCode}</span>
      <span className="font-display text-sm tracking-tight">
        {playerName}
        {minute != null ? <span className="text-[var(--color-muted-foreground)]"> · {minute}&apos;</span> : null}
      </span>
      {isOwnGoal ? <Badge variant="outline">autogol</Badge> : null}
      {isPenalty ? <Badge variant="outline">penalti</Badge> : null}

      <div className="ml-auto flex items-center gap-2">
        <Select value={playerId} onValueChange={setPlayerId}>
          <SelectTrigger className="h-9 w-56">
            <SelectValue placeholder="Asignar jugador…" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {teamPlayers.length === 0 ? (
              <SelectItem value="none" disabled>
                Sin plantilla cargada para este equipo
              </SelectItem>
            ) : (
              teamPlayers.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          disabled={pending || !playerId || playerId === "none"}
          onClick={() =>
            start(async () => {
              const fd = new FormData();
              fd.set("pendingId", String(pendingId));
              fd.set("playerId", playerId);
              const r = await reconcileScorer(fd);
              if (r.ok) toast.success(r.message ?? "Reconciliado.");
              else toast.error(r.error ?? "No se pudo reconciliar.");
            })
          }
        >
          <Check className="size-3.5" />
          Asignar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          title="Descartar (dato erróneo del proveedor)"
          onClick={() =>
            start(async () => {
              const fd = new FormData();
              fd.set("pendingId", String(pendingId));
              const r = await dismissPending(fd);
              if (r.ok) toast.success("Descartado.");
              else toast.error(r.error ?? "No se pudo descartar.");
            })
          }
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
