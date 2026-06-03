"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { createTeam, deleteTeam, updateTeam, type FormState } from "./actions";

const initial: FormState = { ok: false };

type Group = { id: number; code: string; name: string };
type Team = {
  id: number;
  code: string;
  name: string;
  groupId: number | null;
  flagUrl: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  team?: Team;
  groups: Group[];
};

export function TeamForm({ open, onOpenChange, team, groups }: Props) {
  const editing = !!team;
  const [state, action, pending] = useActionState(
    editing ? updateTeam : createTeam,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(team?.flagUrl ?? null);

  if (state.ok) {
    formRef.current?.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar selección" : "Nueva selección"}</DialogTitle>
          <DialogDescription>
            Código FIFA de 3 letras, nombre completo y bandera (PNG cuadrada recomendado).
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={action} className="space-y-4">
          {team ? <input type="hidden" name="id" value={team.id} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                name="code"
                defaultValue={team?.code}
                required
                maxLength={3}
                minLength={2}
                placeholder="ESP"
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="groupId">Grupo</Label>
              <Select name="groupId" defaultValue={team?.groupId?.toString() ?? ""}>
                <SelectTrigger id="groupId">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={team?.name}
              required
              placeholder="España"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flag">Bandera</Label>
            <div className="flex items-center gap-3">
              {preview ? (
                <span className="grid size-12 place-items-center overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="preview" className="size-full object-cover" />
                </span>
              ) : null}
              <Input
                id="flag"
                name="flag"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPreview(URL.createObjectURL(f));
                }}
              />
            </div>
          </div>
          {state.error ? (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          ) : null}
          <DialogFooter className="gap-2">
            {editing ? (
              <DeleteTeamButton teamId={team!.id} onDeleted={() => onOpenChange(false)} />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              <Save />
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTeamButton({
  teamId,
  onDeleted,
}: {
  teamId: number;
  onDeleted: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "¿Eliminar selección? También se borrarán sus jugadores y predicciones asociadas.",
          )
        ) {
          return;
        }
        start(async () => {
          const fd = new FormData();
          fd.set("id", teamId.toString());
          await deleteTeam(fd);
          onDeleted();
        });
      }}
    >
      <Trash2 />
      {pending ? "Eliminando…" : "Eliminar"}
    </Button>
  );
}
