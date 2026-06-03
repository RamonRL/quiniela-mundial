import { desc } from "drizzle-orm";
import { Megaphone } from "lucide-react";
import { db } from "@/lib/db";
import { patchNotes } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { NoteForm } from "./note-form";
import { NoteRow } from "./note-row";

export const metadata = { title: "Tablón de notas · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminNotasPage() {
  await requireAdmin();
  const rows = await db
    .select()
    .from(patchNotes)
    .orderBy(desc(patchNotes.publishedAt), desc(patchNotes.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Tablón de notas"
        description="Comunicaciones que aparecen en el dashboard de los usuarios: features nuevos, bugs arreglados, mejoras y avisos."
      />

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <header className="space-y-1 pb-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Nueva nota
          </p>
          <h2 className="font-display text-xl tracking-tight">Publicar una novedad</h2>
        </header>
        <NoteForm mode="create" />
      </section>

      <section className="space-y-3">
        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Historial
            </p>
            <h2 className="font-display text-xl tracking-tight">
              {rows.length} nota{rows.length === 1 ? "" : "s"} totales
            </h2>
          </div>
        </header>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="size-5" />}
            title="Aún sin notas"
            description="Publica la primera para que aparezca en el dashboard de los usuarios."
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((n) => (
              <NoteRow key={n.id} note={n} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
