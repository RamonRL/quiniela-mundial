"use client";

import { useState } from "react";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import { formatDateTime, cn } from "@/lib/utils";
import { deletePatchNote } from "./actions";
import { NoteForm } from "./note-form";

type Note = {
  id: number;
  type: string;
  title: string;
  body: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const TYPE_LABEL: Record<string, string> = {
  feature: "Nuevo",
  improvement: "Mejora",
  fix: "Bug fix",
  note: "Aviso",
};

export function NoteRow({ note }: { note: Note }) {
  const [editing, setEditing] = useState(false);
  const isPublished = note.publishedAt != null;

  return (
    <li
      className={cn(
        "rounded-xl border bg-[var(--color-surface)] p-4 transition",
        isPublished
          ? "border-[var(--color-arena)]/30"
          : "border-dashed border-[var(--color-border)] opacity-80",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[0.55rem]">
              {TYPE_LABEL[note.type] ?? note.type}
            </Badge>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.18em]",
                isPublished
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-muted-foreground)]",
              )}
            >
              {isPublished ? (
                <>
                  <Eye className="size-3" />
                  Publicada
                </>
              ) : (
                <>
                  <EyeOff className="size-3" />
                  Borrador
                </>
              )}
            </span>
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {isPublished
                ? formatDateTime(note.publishedAt!, { day: "2-digit", month: "short", year: "numeric" })
                : `creada ${formatDateTime(note.createdAt, { day: "2-digit", month: "short" })}`}
            </span>
          </div>
          <p className="font-display text-base tracking-tight">{note.title}</p>
          {!editing ? (
            <p className="whitespace-pre-line font-editorial text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {note.body}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil className="size-3.5" />
            {editing ? "Cerrar" : "Editar"}
          </Button>
          <DeleteButton
            action={deletePatchNote}
            id={note.id}
            confirmMessage={`¿Borrar la nota "${note.title}"? No se puede deshacer.`}
          />
        </div>
      </div>

      {editing ? (
        <div className="mt-4 border-t border-dashed border-[var(--color-border)] pt-4">
          <NoteForm mode="edit" note={note} onSaved={() => setEditing(false)} />
        </div>
      ) : null}
    </li>
  );
}
