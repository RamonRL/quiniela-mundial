"use client";

import { useActionState, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resolveSpecial, type FormState } from "./actions";

const initial: FormState = { ok: false };

type Props = {
  special: {
    id: number;
    type: "yes_no" | "single_choice" | "team_with_round" | "number_range" | "player";
    optionsJson: unknown;
    resolvedValueJson: unknown;
  };
};

export function ResolveSpecialForm({ special }: Props) {
  const [state, action, pending] = useActionState(resolveSpecial, initial);
  const [json, setJson] = useState(
    special.resolvedValueJson
      ? JSON.stringify(special.resolvedValueJson, null, 2)
      : defaultTemplate(special.type),
  );

  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3">
        <input type="hidden" name="specialId" value={special.id} />
        <div className="space-y-1.5">
          <Label className="text-xs">Valor resuelto (JSON)</Label>
          <Textarea
            name="resolvedJson"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={4}
            className="font-mono text-xs"
          />
        </div>
        {state.error ? (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-[var(--color-success)]">Guardado y puntos recalculados.</p>
        ) : null}
        <div className="flex justify-between gap-2">
          <form
            action={async (fd) => {
              fd.set("specialId", special.id.toString());
              fd.set("resolvedJson", "{}");
              fd.set("clear", "1");
              await resolveSpecial(initial, fd);
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              <Trash2 className="size-3.5" />
              Limpiar
            </Button>
          </form>
          <Button type="submit" disabled={pending}>
            <Save />
            {pending ? "Guardando…" : "Resolver"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function defaultTemplate(type: Props["special"]["type"]): string {
  switch (type) {
    case "yes_no":
      return JSON.stringify({ value: true }, null, 2);
    case "number_range":
      return JSON.stringify({ value: 0 }, null, 2);
    case "single_choice":
      return JSON.stringify({ value: "" }, null, 2);
    case "team_with_round":
      return JSON.stringify({ teamCode: "USA", round: "qf" }, null, 2);
    case "player":
      return JSON.stringify({ playerId: 0 }, null, 2);
  }
}
