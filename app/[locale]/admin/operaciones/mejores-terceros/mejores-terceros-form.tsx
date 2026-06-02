"use client";

import { useActionState, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamFlag } from "@/components/brand/team-flag";
import { saveBestThirds, type FormState } from "./actions";

const initial: FormState = { ok: false };

export type ThirdOption = {
  teamId: number;
  teamCode: string;
  teamName: string;
  groupCode: string;
  points: number;
  goalDiff: number;
  goalsFor: number;
};

export type ThirdSlot = {
  matchCode: string;
  side: "home" | "away";
  pool: string[];
};

export function MejoresTercerosForm({
  options,
  slots,
  initial: initialAssignments,
}: {
  options: ThirdOption[];
  slots: ThirdSlot[];
  initial: Record<string, number | null>;
}) {
  const [assignments, setAssignments] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const [code, teamId] of Object.entries(initialAssignments)) {
      if (teamId != null) out[code] = teamId;
    }
    return out;
  });
  const [state, action, pending] = useActionState(saveBestThirds, initial);

  const optionByTeamId = useMemo(
    () => new Map(options.map((o) => [o.teamId, o])),
    [options],
  );

  // teamIds ya asignados (para deshabilitarlos en otros dropdowns).
  const usedTeamIds = useMemo(() => new Set(Object.values(assignments)), [assignments]);

  function setSlot(matchCode: string, value: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      if (value === "none") {
        delete next[matchCode];
      } else {
        const tid = Number(value);
        // Si este team ya estaba en otro slot, quitarlo.
        for (const [code, oldTid] of Object.entries(next)) {
          if (oldTid === tid && code !== matchCode) delete next[code];
        }
        next[matchCode] = tid;
      }
      return next;
    });
  }

  const allAssigned = slots.every((s) => assignments[s.matchCode] != null);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify({ assignments })} />

      {/* Tabla de los 8 mejores terceros (referencia) */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-arena)]">
          8 mejores terceros (criterio FIFA)
        </h2>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Selección</TableHead>
                <TableHead className="w-20">Grupo</TableHead>
                <TableHead className="w-20 text-right">Pts</TableHead>
                <TableHead className="w-20 text-right">DG</TableHead>
                <TableHead className="w-20 text-right">GF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.map((o, i) => (
                <TableRow key={o.teamId}>
                  <TableCell className="font-mono tabular text-xs text-[var(--color-muted-foreground)]">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <TeamFlag code={o.teamCode} size={20} />
                      <span className="font-medium">{o.teamName}</span>
                      <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        {o.teamCode}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs uppercase tracking-[0.18em]">
                      {o.groupCode}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-display tabular text-base">
                    {o.points}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular text-sm">
                    {o.goalDiff > 0 ? `+${o.goalDiff}` : o.goalDiff}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular text-sm">
                    {o.goalsFor}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Asignación slot a slot */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-arena)]">
          Asignación de slots
        </h2>
        <p className="mt-1 font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          Cada slot de R32 sólo admite terceras de los grupos del pool indicado.
          Cada selección debe ir a un único slot.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {slots.map((slot) => {
            const valid = options.filter((o) => slot.pool.includes(o.groupCode));
            const value = assignments[slot.matchCode];
            return (
              <div
                key={slot.matchCode}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
              >
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
                    {slot.matchCode}
                  </p>
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Pool {slot.pool.join("·")}
                  </p>
                </div>
                <div className="mt-2">
                  <Select
                    value={value != null ? String(value) : "none"}
                    onValueChange={(v) => setSlot(slot.matchCode, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— sin asignar —</SelectItem>
                      {valid.map((o) => {
                        const usedElsewhere =
                          usedTeamIds.has(o.teamId) && value !== o.teamId;
                        return (
                          <SelectItem
                            key={o.teamId}
                            value={String(o.teamId)}
                            disabled={usedElsewhere}
                          >
                            {o.teamCode} · {o.teamName} ({o.groupCode}
                            {usedElsewhere ? " · ya asignado" : ""})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {value != null ? (
                  <div className="mt-2 inline-flex items-center gap-2">
                    <TeamFlag
                      code={optionByTeamId.get(value)?.teamCode}
                      size={20}
                    />
                    <span className="text-sm font-medium">
                      {optionByTeamId.get(value)?.teamName}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {state.error ? <p className="text-sm text-[var(--color-danger)]">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-[var(--color-success)]">{state.message}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending || !allAssigned}>
          <Save />
          {pending ? "Guardando…" : allAssigned ? "Guardar y abrir bracket" : "Faltan slots"}
        </Button>
      </div>
    </form>
  );
}
