"use client";

import { useActionState, useState, useTransition } from "react";
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
import { POSITIONS, POSITION_LABEL, normalizePosition } from "@/lib/position";
import { deletePlayer, upsertPlayer, type FormState } from "./actions";

const initial: FormState = { ok: false };

type Player = {
  id: number;
  teamId: number;
  name: string;
  position: string | null;
  jerseyNumber: number | null;
  photoUrl: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  teamId: number;
  player?: Player;
};

export function PlayerForm({ open, onOpenChange, teamId, player }: Props) {
  const editing = !!player;
  const [state, action, pending] = useActionState(upsertPlayer, initial);
  const [preview, setPreview] = useState<string | null>(player?.photoUrl ?? null);
  if (state.ok) onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar jugador" : "Nuevo jugador"}</DialogTitle>
          <DialogDescription>
            Nombre completo, posición y dorsal. Foto opcional (PNG/JPG cuadrada).
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {player ? <input type="hidden" name="id" value={player.id} /> : null}
          <input type="hidden" name="teamId" value={teamId} />
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={player?.name}
              required
              maxLength={80}
              placeholder="Lamine Yamal"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="jerseyNumber">Dorsal</Label>
              <Input
                id="jerseyNumber"
                name="jerseyNumber"
                type="number"
                min={1}
                max={99}
                defaultValue={player?.jerseyNumber ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position">Posición</Label>
              <Select
                name="position"
                defaultValue={normalizePosition(player?.position) ?? ""}
              >
                <SelectTrigger id="position">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p} · {POSITION_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="photo">Foto</Label>
            <div className="flex items-center gap-3">
              {preview ? (
                <span className="grid size-12 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="preview" className="size-full object-cover" />
                </span>
              ) : null}
              <Input
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPreview(URL.createObjectURL(f));
                }}
              />
            </div>
          </div>
          {state.error ? <p className="text-sm text-[var(--color-danger)]">{state.error}</p> : null}
          <DialogFooter className="gap-2">
            {editing ? (
              <DeletePlayerButton playerId={player!.id} onDeleted={() => onOpenChange(false)} />
            ) : null}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
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

function DeletePlayerButton({
  playerId,
  onDeleted,
}: {
  playerId: number;
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
        if (!confirm("¿Eliminar este jugador?")) return;
        start(async () => {
          const fd = new FormData();
          fd.set("id", playerId.toString());
          await deletePlayer(fd);
          onDeleted();
        });
      }}
    >
      <Trash2 />
      {pending ? "Eliminando…" : "Eliminar"}
    </Button>
  );
}
