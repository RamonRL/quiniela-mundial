"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importPlayers, type FormState } from "./actions";

const initial: FormState = { ok: false };

const exampleText = `Unai Simón, 23, POR
Pau Cubarsí, 5, DEF
Rodri, 16, MED
Lamine Yamal, 19, DEL`;

export function ImportForm({ teamId, teamName }: { teamId: number; teamName: string }) {
  const [state, action, pending] = useActionState(importPlayers, initial);
  const [text, setText] = useState("");
  if (state.ok) {
    setTimeout(() => setText(""), 0);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar plantilla en bulk</CardTitle>
        <CardDescription>
          Pega aquí los 26 jugadores de <strong>{teamName}</strong>. Una línea por jugador.
          Formato: <code>Nombre, Dorsal, Posición</code>. Las separaciones por coma, tabulador o
          punto y coma funcionan. Dorsal y posición son opcionales.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="teamId" value={teamId} />
          <div className="space-y-1.5">
            <Label htmlFor="payload">Lista de jugadores</Label>
            <Textarea
              id="payload"
              name="payload"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={exampleText}
              rows={14}
              className="font-mono text-sm"
            />
          </div>
          {state.error ? (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          ) : null}
          {state.ok ? (
            <p className="text-sm text-[var(--color-success)]">Plantilla importada.</p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              <Upload />
              {pending ? "Importando…" : "Importar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
