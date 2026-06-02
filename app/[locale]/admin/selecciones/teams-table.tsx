"use client";

import Link from "next/link";
import { useState } from "react";
import { TeamFlag } from "@/components/brand/team-flag";
import { ArrowUpRight, Check, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TeamForm } from "./team-form";

type Group = { id: number; code: string; name: string };
type Team = {
  id: number;
  code: string;
  name: string;
  groupId: number | null;
  flagUrl: string | null;
};
type TeamStats = {
  total: number;
  missingJersey: number;
  missingPhoto: number;
  missingPosition: number;
};

export function TeamsTable({
  teams,
  groups,
  stats,
}: {
  teams: Team[];
  groups: Group[];
  stats: Record<number, TeamStats>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team | undefined>(undefined);
  const groupById = new Map(groups.map((g) => [g.id, g]));

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {teams.length} de 48 selecciones cargadas.
        </p>
        <Button
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          <Plus />
          Añadir selección
        </Button>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Bandera</TableHead>
              <TableHead className="w-20">Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead className="w-20 text-center">Jugadores</TableHead>
              <TableHead className="w-24 text-center">Dorsales</TableHead>
              <TableHead className="w-24 text-center">Posiciones</TableHead>
              <TableHead className="w-24 text-center">Fotos</TableHead>
              <TableHead className="w-16 text-right">Editar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((t) => {
              const s = stats[t.id] ?? {
                total: 0,
                missingJersey: 0,
                missingPhoto: 0,
                missingPosition: 0,
              };
              const allJerseys = s.total > 0 && s.missingJersey === 0;
              const allPhotos = s.total > 0 && s.missingPhoto === 0;
              const allPositions = s.total > 0 && s.missingPosition === 0;
              return (
                <TableRow key={t.id}>
                  <TableCell>
                    <TeamFlag code={t.code} size={36} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{t.code}</TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/jugadores?team=${t.id}`}
                      className="group inline-flex items-center gap-1.5 underline-offset-4 hover:text-[var(--color-arena)] hover:underline"
                    >
                      {t.name}
                      <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    {t.groupId ? (
                      <Badge variant="outline">{groupById.get(t.groupId)?.name ?? "?"}</Badge>
                    ) : (
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        Sin asignar
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono tabular text-sm">
                    {s.total}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusIcon
                      ok={allJerseys}
                      empty={s.total === 0}
                      missing={s.missingJersey}
                      label="dorsal"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusIcon
                      ok={allPositions}
                      empty={s.total === 0}
                      missing={s.missingPosition}
                      label="posición"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusIcon
                      ok={allPhotos}
                      empty={s.total === 0}
                      missing={s.missingPhoto}
                      label="foto"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(t);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {teams.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-sm text-[var(--color-muted-foreground)]"
                >
                  Aún no hay selecciones. Añade la primera para empezar.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <TeamForm open={open} onOpenChange={setOpen} team={editing} groups={groups} />
    </>
  );
}

function StatusIcon({
  ok,
  empty,
  missing,
  label,
}: {
  ok: boolean;
  empty: boolean;
  missing: number;
  label: string;
}) {
  if (empty) {
    return (
      <span className="text-xs text-[var(--color-muted-foreground)]" title="Sin jugadores">
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs",
        ok
          ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
          : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
      )}
      title={ok ? `Todos con ${label}` : `${missing} sin ${label}`}
    >
      {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
      {ok ? null : <span className="font-mono tabular">{missing}</span>}
    </span>
  );
}
