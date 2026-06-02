"use client";

import { useActionState, useState } from "react";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";
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
import { createLeague, type CreateLeagueResult } from "@/lib/league-actions";
import { PREDICTION_MODE_META } from "@/lib/prediction-modes";

const initial: CreateLeagueResult = { ok: false };

export function CreateLeagueDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("completo");
  const [state, action, pending] = useActionState(createLeague, initial);
  if (state.ok && state.league && open) {
    toast.success(
      `Creada "${state.league.name}". Código: ${state.league.joinCode ?? "—"}`,
      { duration: 6000 },
    );
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Nueva liga
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva quiniela privada</DialogTitle>
          <DialogDescription>
            Recibirás un código de 4 dígitos y un invite link, ambos fijos
            para siempre. Te quedarás inscrito en la quiniela y será tu
            liga activa.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre · máx 25 caracteres</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={25}
              placeholder="QUINIELA MUNDIAL 2026"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mode">Modo de predicción</Label>
            <input type="hidden" name="mode" value={mode} />
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completo">
                  {PREDICTION_MODE_META.completo.label} — {PREDICTION_MODE_META.completo.tagline}
                </SelectItem>
                <SelectItem value="marcador">
                  {PREDICTION_MODE_META.marcador.label} — {PREDICTION_MODE_META.marcador.tagline}
                </SelectItem>
                <SelectItem value="solo_ganador">
                  {PREDICTION_MODE_META.solo_ganador.label} — {PREDICTION_MODE_META.solo_ganador.tagline}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state.error ? (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              <Save />
              {pending ? "Creando…" : "Crear quiniela"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
