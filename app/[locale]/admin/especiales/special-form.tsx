"use client";

import { useActionState, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { upsertSpecial, type FormState } from "./actions";

const initial: FormState = { ok: false };

const TYPE_OPTIONS: { value: SpecialType; label: string; sample: { options?: string; points: string } }[] = [
  {
    value: "yes_no",
    label: "Sí / No",
    sample: { points: '{"correct": 3}' },
  },
  {
    value: "number_range",
    label: "Número con tolerancia",
    sample: { options: '{"tolerance": 5}', points: '{"correct": 5}' },
  },
  {
    value: "single_choice",
    label: "Elección única",
    sample: { options: '{"values": ["A", "B", "C"]}', points: '{"correct": 4}' },
  },
  {
    value: "player",
    label: "Jugador",
    sample: { options: '{"positionFilter": "GK"}', points: '{"correct": 6}' },
  },
  {
    value: "team_with_round",
    label: "Equipo + ronda",
    sample: {
      options: '{"teamCodes":["USA","CAN","MEX"],"rounds":["group","r32","r16","qf","sf","final","champion"]}',
      points: '{"maxPoints":8,"perRound":{"r32":1,"r16":2,"qf":4,"sf":6,"final":7,"champion":8}}',
    },
  },
];

type SpecialType = "yes_no" | "single_choice" | "team_with_round" | "number_range" | "player";

type Existing = {
  id: number;
  key: string;
  question: string;
  type: SpecialType;
  optionsJson: unknown;
  pointsConfigJson: unknown;
  closesAt: string; // ISO
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  special?: Existing;
};

function toLocalInputValue(iso: string): string {
  // ISO → "YYYY-MM-DDTHH:mm" in local time for datetime-local input
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SpecialForm({ open, onOpenChange, special }: Props) {
  const editing = !!special;
  const [state, action, pending] = useActionState(upsertSpecial, initial);
  const [type, setType] = useState<SpecialType>(special?.type ?? "yes_no");
  if (state.ok) onOpenChange(false);

  const sample = TYPE_OPTIONS.find((o) => o.value === type)?.sample;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar especial" : "Nueva predicción especial"}</DialogTitle>
          <DialogDescription>
            Define una pregunta, su tipo y la fórmula de puntos. Las opciones varían según el
            tipo — usa el ejemplo de abajo como plantilla.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {special ? <input type="hidden" name="id" value={special.id} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                name="key"
                defaultValue={special?.key}
                required
                pattern="[a-z0-9_]+"
                placeholder="hat_trick_in_final"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo</Label>
              <Select
                name="type"
                value={type}
                onValueChange={(v) => setType(v as SpecialType)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="question">Pregunta</Label>
            <Input
              id="question"
              name="question"
              defaultValue={special?.question}
              required
              maxLength={200}
              placeholder="¿Habrá un hat-trick en la final?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="closesAt">Cierre de predicción</Label>
            <Input
              id="closesAt"
              name="closesAt"
              type="datetime-local"
              defaultValue={special ? toLocalInputValue(special.closesAt) : ""}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="optionsJson">Opciones (JSON, opcional)</Label>
            <Textarea
              id="optionsJson"
              name="optionsJson"
              defaultValue={
                special?.optionsJson ? JSON.stringify(special.optionsJson, null, 2) : ""
              }
              rows={3}
              className="font-mono text-xs"
              placeholder={sample?.options ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pointsConfigJson">Puntos (JSON)</Label>
            <Textarea
              id="pointsConfigJson"
              name="pointsConfigJson"
              defaultValue={
                special
                  ? JSON.stringify(special.pointsConfigJson, null, 2)
                  : sample?.points ?? '{"correct": 3}'
              }
              rows={4}
              className="font-mono text-xs"
              required
              placeholder={sample?.points ?? '{"correct": 3}'}
            />
          </div>

          {state.error ? (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              <Save />
              {pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear especial"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewSpecialButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Nueva especial
      </Button>
      <SpecialForm open={open} onOpenChange={setOpen} />
    </>
  );
}
