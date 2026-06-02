"use client";

import { useActionState, useState } from "react";
import { CalendarPlus, Save } from "lucide-react";
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
import { upsertMatchday, type FormState } from "./actions";

const initial: FormState = { ok: false };

const stages = [
  { v: "group", l: "Fase de grupos" },
  { v: "r32", l: "Dieciseisavos (R32)" },
  { v: "r16", l: "Octavos" },
  { v: "qf", l: "Cuartos" },
  { v: "sf", l: "Semifinales" },
  { v: "third", l: "Tercer puesto" },
  { v: "final", l: "Final" },
];

export function MatchdayDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(upsertMatchday, initial);
  if (state.ok) setOpen(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarPlus />
          Nueva jornada
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva jornada</DialogTitle>
          <DialogDescription>
            El cierre de predicciones se deriva automáticamente del primer
            partido de la jornada — no hace falta fijar fecha aquí.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              placeholder="Jornada 1 fase de grupos"
              required
              maxLength={60}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stage">Fase</Label>
              <Select name="stage" defaultValue="group">
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.v} value={s.v}>
                      {s.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orderIndex">Orden</Label>
              <Input id="orderIndex" name="orderIndex" type="number" defaultValue={0} />
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
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
