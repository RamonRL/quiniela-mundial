"use client";

import { useState, useTransition } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteOwnLeague } from "@/lib/league-actions";

const CONFIRM_WORD = "ELIMINAR";

/**
 * Eliminar quiniela (solo el creador). En vez de un confirm() del navegador,
 * abre un modal con el estilo de la web donde el usuario debe escribir
 * "ELIMINAR" para confirmar — fricción deliberada por ser irreversible.
 */
export function DeleteLeagueDialog({
  leagueId,
  leagueName,
  memberCount,
}: {
  leagueId: number;
  leagueName: string;
  memberCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();

  const confirmable = value.trim().toUpperCase() === CONFIRM_WORD;

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) setValue("");
  }

  function onConfirm() {
    if (!confirmable) return;
    start(async () => {
      const fd = new FormData();
      fd.set("id", String(leagueId));
      // deleteOwnLeague redirige a /dashboard al terminar (navega fuera).
      await deleteOwnLeague(fd);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 hover:text-[var(--color-danger)]"
        >
          <Trash2 className="size-4" />
          <span>Eliminar</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]">
            <TriangleAlert className="size-5" />
          </div>
          <DialogTitle>Eliminar «{leagueName}»</DialogTitle>
          <DialogDescription>
            Esta acción es <strong className="font-semibold">irreversible</strong>.
            Se borra la quiniela y sus predicciones, y sus{" "}
            {memberCount === 1 ? "1 miembro pasará" : `${memberCount} miembros pasarán`}{" "}
            a la Quiniela Pública.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delete-confirm" className="text-sm">
            Escribe <span className="font-mono font-semibold text-[var(--color-danger)]">ELIMINAR</span>{" "}
            para confirmar
          </Label>
          <Input
            id="delete-confirm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="ELIMINAR"
            disabled={pending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && confirmable) {
                e.preventDefault();
                onConfirm();
              }
            }}
            className="font-mono tracking-[0.18em]"
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={pending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={!confirmable || pending}
            className="bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90"
          >
            <Trash2 className="size-4" />
            {pending ? "Eliminando…" : "Eliminar definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
