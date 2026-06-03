"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPatchNote,
  updatePatchNote,
  type PatchNoteFormState,
} from "./actions";

const INITIAL: PatchNoteFormState = { ok: false };

type Mode = "create" | "edit";

export function NoteForm({
  mode,
  note,
  onSaved,
}: {
  mode: Mode;
  note?: {
    id: number;
    type: string;
    title: string;
    body: string;
    publishedAt: Date | null;
  };
  /** En modo edit, cierra el form al guardar con éxito. */
  onSaved?: () => void;
}) {
  const action = mode === "create" ? createPatchNote : updatePatchNote;
  const [state, dispatch, pending] = useActionState(action, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) {
      if (state.error) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Guardado.");
    if (mode === "create") {
      formRef.current?.reset();
    } else {
      onSaved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={dispatch} className="space-y-4">
      {note ? <input type="hidden" name="id" value={note.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="note-type" className="text-xs">Tipo</Label>
          <Select name="type" defaultValue={note?.type ?? "feature"}>
            <SelectTrigger id="note-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feature">Nuevo (feature)</SelectItem>
              <SelectItem value="improvement">Mejora</SelectItem>
              <SelectItem value="fix">Bug fix</SelectItem>
              <SelectItem value="note">Aviso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="note-title" className="text-xs">Título</Label>
          <Input
            id="note-title"
            name="title"
            required
            maxLength={120}
            placeholder="Ej. Nuevo modo paso a paso para jornadas"
            defaultValue={note?.title}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note-body" className="text-xs">Cuerpo</Label>
        <textarea
          id="note-body"
          name="body"
          required
          maxLength={2000}
          rows={4}
          placeholder="Qué cambia, por qué importa al usuario, cómo se usa…"
          defaultValue={note?.body}
          className="w-full resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm leading-relaxed shadow-sm focus:border-[var(--color-arena)] focus:outline-none focus:ring-1 focus:ring-[var(--color-arena)]"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="publish"
            value="1"
            defaultChecked={note ? note.publishedAt != null : true}
            className="size-4 accent-[var(--color-arena)]"
          />
          <span>Publicar (visible en el dashboard)</span>
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {mode === "create" ? "Crear nota" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
