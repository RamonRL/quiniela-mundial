import { readdir } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { CalendarDays, ExternalLink, FileText, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata = { title: "Playbook marketing · Admin" };
export const dynamic = "force-dynamic";

const ROOT = path.resolve(process.cwd(), "docs/marketing");

export default async function PlaybookIndexPage() {
  await requireAdmin();

  let files: string[];
  try {
    files = await readdir(ROOT);
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Admin"
          title="Playbook marketing"
          description="Plan diario de los 21 días previos al kickoff."
        />
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          Carpeta <code>docs/marketing</code> no disponible en este entorno.
        </p>
      </div>
    );
  }

  const htmls = files.filter((f) => f.endsWith(".html")).sort();
  const indexHtml = htmls.includes("index.html") ? "index.html" : null;
  const dayPattern = /^dia-(\d+)\.html$/;
  const days = htmls
    .filter((f) => dayPattern.test(f))
    .sort((a, b) => {
      const na = Number(a.match(dayPattern)![1]);
      const nb = Number(b.match(dayPattern)![1]);
      return na - nb;
    });
  const extras = htmls.filter(
    (f) => f !== "index.html" && !dayPattern.test(f),
  );
  const pdfs = files.filter((f) => f.endsWith(".pdf")).sort();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Playbook marketing"
        description="Plan diario de los 21 días previos al kickoff. Solo visible para admins — abre los HTML en una pestaña nueva."
      />

      {indexHtml ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl tracking-tight">Índice general</h2>
          <Link
            href={`/admin/playbook/${indexHtml}`}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between gap-3 rounded-lg border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] px-4 py-3 transition hover:border-[var(--color-arena)] hover:bg-[color-mix(in_oklch,var(--color-arena)_10%,var(--color-surface))]"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md border border-[var(--color-arena)]/40 bg-[var(--color-surface)] text-[var(--color-arena)]">
                <Sparkles className="size-4" />
              </span>
              <div className="leading-tight">
                <p className="font-display text-base tracking-tight">
                  Ver el playbook completo
                </p>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                  index.html
                </p>
              </div>
            </div>
            <ExternalLink className="size-4 shrink-0 text-[var(--color-arena)] transition group-hover:translate-x-0.5" />
          </Link>
        </section>
      ) : null}

      {days.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl tracking-tight">Días</h2>
            <Badge variant="outline">
              {days.length} {days.length === 1 ? "ficha" : "fichas"}
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {days.map((f) => {
              const n = Number(f.match(dayPattern)![1]);
              return (
                <Link
                  key={f}
                  href={`/admin/playbook/${f}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 transition hover:border-[var(--color-arena)]/50 hover:bg-[var(--color-surface-2)]"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-arena)]">
                    <CalendarDays className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm tracking-tight">
                      Día {String(n).padStart(2, "0")}
                    </p>
                    <p className="truncate font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {f}
                    </p>
                  </div>
                  <ExternalLink className="size-3.5 shrink-0 text-[var(--color-muted-foreground)] transition group-hover:text-[var(--color-arena)]" />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {extras.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl tracking-tight">Recursos</h2>
          <ul className="space-y-1.5">
            {extras.map((f) => (
              <li key={f}>
                <Link
                  href={`/admin/playbook/${f}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm transition hover:border-[var(--color-arena)]/50 hover:bg-[var(--color-surface-2)]"
                >
                  <FileText className="size-3.5 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-arena)]" />
                  <span className="font-mono text-xs uppercase tracking-[0.18em]">
                    {f.replace(".html", "")}
                  </span>
                  <ExternalLink className="size-3 text-[var(--color-muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-arena)]" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pdfs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl tracking-tight">PDF</h2>
          <ul className="space-y-1.5">
            {pdfs.map((f) => (
              <li key={f}>
                <Link
                  href={`/admin/playbook/${f}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm transition hover:border-[var(--color-arena)]/50 hover:bg-[var(--color-surface-2)]"
                >
                  <FileText className="size-3.5 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-arena)]" />
                  <span className="font-mono text-xs uppercase tracking-[0.18em]">
                    {f}
                  </span>
                  <ExternalLink className="size-3 text-[var(--color-muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-arena)]" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
