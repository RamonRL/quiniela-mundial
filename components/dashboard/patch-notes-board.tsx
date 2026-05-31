import { desc, isNotNull } from "drizzle-orm";
import { Bug, Megaphone, Sparkles, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { patchNotes } from "@/lib/db/schema";
import { formatDate, cn } from "@/lib/utils";

/**
 * Tablón compacto de novedades de Quiniela Mundial: las 5 últimas notas
 * publicadas (publishedAt no null) ordenadas de la más reciente a la
 * más antigua. El admin las gestiona desde /admin/notas.
 *
 * Si no hay ninguna nota publicada el componente devuelve `null` y no
 * añade ruido al dashboard.
 */

type NoteType = "feature" | "fix" | "improvement" | "note";

const TYPE_META: Record<
  NoteType,
  { label: string; icon: typeof Sparkles; className: string }
> = {
  feature: {
    label: "Nuevo",
    icon: Sparkles,
    className:
      "border-[var(--color-arena)]/50 bg-[color-mix(in_oklch,var(--color-arena)_10%,transparent)] text-[var(--color-arena)]",
  },
  improvement: {
    label: "Mejora",
    icon: Wrench,
    className:
      "border-[var(--color-pitch)]/50 bg-[color-mix(in_oklch,var(--color-pitch)_10%,transparent)] text-[var(--color-pitch)]",
  },
  fix: {
    label: "Bug fix",
    icon: Bug,
    className:
      "border-[var(--color-success)]/50 bg-[color-mix(in_oklch,var(--color-success)_10%,transparent)] text-[var(--color-success)]",
  },
  note: {
    label: "Aviso",
    icon: Megaphone,
    className:
      "border-[var(--color-border-strong)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]",
  },
};

const MAX_NOTES = 5;

export async function PatchNotesBoard() {
  const rows = await db
    .select({
      id: patchNotes.id,
      type: patchNotes.type,
      title: patchNotes.title,
      body: patchNotes.body,
      publishedAt: patchNotes.publishedAt,
    })
    .from(patchNotes)
    .where(isNotNull(patchNotes.publishedAt))
    .orderBy(desc(patchNotes.publishedAt))
    .limit(MAX_NOTES);

  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          Novedades de la app
        </p>
        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
          Tablón de Quiniela Mundial
        </h2>
      </header>
      <ol className="space-y-2">
        {rows.map((n) => {
          const meta = TYPE_META[n.type as NoteType] ?? TYPE_META.note;
          const Icon = meta.icon;
          return (
            <li
              key={n.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em]",
                    meta.className,
                  )}
                >
                  <Icon className="size-3" />
                  {meta.label}
                </span>
                {n.publishedAt ? (
                  <time
                    dateTime={new Date(n.publishedAt).toISOString()}
                    className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]"
                  >
                    {formatDate(n.publishedAt, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                ) : null}
              </div>
              <p className="font-display text-base tracking-tight">{n.title}</p>
              <p className="mt-1 whitespace-pre-line font-editorial text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {n.body}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
