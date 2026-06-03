"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { upsertMatch, type FormState } from "../actions";

const initial: FormState = { ok: false };

type Team = { id: number; code: string; name: string };
type Group = { id: number; code: string; name: string };

export type MatchSeed = {
  id: number;
  code: string;
  stage: "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
  groupId: number | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  scheduledAt: Date | string;
  venue: string | null;
};

type Props = {
  matchdayId: number;
  /** Stage canónico de la jornada — sólo se usa en modo crear. */
  stage: "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
  teams: Team[];
  groups: Group[];
  /** Si pasas `match`, el dialog entra en modo edición y prefilla todo. */
  match?: MatchSeed;
  /** Permite usar un trigger custom (ej. icono lápiz por fila). */
  trigger?: ReactNode;
};

/**
 * `<input type="datetime-local">` espera "YYYY-MM-DDTHH:mm" en la zona
 * horaria del navegador. Para edición, convertimos la Date guardada (UTC
 * en DB) al equivalente local que representa el mismo instante.
 */
function toLocalInputValue(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

export function MatchDialog({ matchdayId, stage, teams, groups, match, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(upsertMatch, initial);
  if (state.ok) setOpen(false);

  const editing = match != null;
  const effectiveStage = editing ? match.stage : stage;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus />
            Añadir partido
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${match.code}` : "Nuevo partido"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Cambia equipos, grupo, hora o sede. Las predicciones de los participantes se mantienen — sólo cambia el contexto."
              : "Define equipos, sede y hora. El admin puede dejar selecciones vacías hasta que terminen las rondas previas."}
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={match.id} /> : null}
          <input type="hidden" name="matchdayId" value={matchdayId} />
          <input type="hidden" name="stage" value={effectiveStage} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                name="code"
                defaultValue={match?.code}
                placeholder="M01"
                required
                maxLength={16}
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="groupId">Grupo (si fase grupos)</Label>
              <Select name="groupId" defaultValue={match?.groupId?.toString()}>
                <SelectTrigger id="groupId">
                  <SelectValue placeholder="Sin grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" textValue="Sin grupo">
                    Sin grupo
                  </SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="homeTeamId">Local</Label>
              <Select
                name="homeTeamId"
                defaultValue={match?.homeTeamId?.toString()}
              >
                <SelectTrigger id="homeTeamId">
                  <SelectValue placeholder="Sin definir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" textValue="Sin definir">
                    Sin definir
                  </SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="awayTeamId">Visitante</Label>
              <Select
                name="awayTeamId"
                defaultValue={match?.awayTeamId?.toString()}
              >
                <SelectTrigger id="awayTeamId">
                  <SelectValue placeholder="Sin definir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" textValue="Sin definir">
                    Sin definir
                  </SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="scheduledAt">Hora del partido</Label>
              <Input
                id="scheduledAt"
                name="scheduledAt"
                type="datetime-local"
                required
                defaultValue={match ? toLocalInputValue(match.scheduledAt) : undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="venue">Sede</Label>
              <Input
                id="venue"
                name="venue"
                placeholder="MetLife Stadium"
                defaultValue={match?.venue ?? ""}
              />
            </div>
          </div>
          {state.error ? (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              <Save />
              {pending ? "Guardando…" : editing ? "Guardar cambios" : "Guardar partido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
