import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, teams } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shell/page-header";
import { TeamFlag } from "@/components/brand/team-flag";
import { EmptyState } from "@/components/shell/empty-state";
import { DeleteButton } from "@/components/admin/delete-button";
import { cn, formatDateTime } from "@/lib/utils";
import { deleteMatch } from "@/app/[locale]/admin/calendario/actions";

export const metadata = { title: "Resultados · Admin" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programado",
  live: "En vivo",
  finished: "Final",
};

const STAGE_LABEL: Record<string, string> = {
  group: "Grupos",
  r32: "R32",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semis",
  third: "3er puesto",
  final: "Final",
};

type FilterValue = "all" | "scheduled" | "live" | "finished";

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filterRaw = params.status ?? "all";
  const filter: FilterValue =
    filterRaw === "scheduled" || filterRaw === "live" || filterRaw === "finished"
      ? filterRaw
      : "all";

  const [matchRows, allTeams, [counts]] = await Promise.all([
    filter === "all"
      ? db.select().from(matches).orderBy(asc(matches.scheduledAt))
      : db
          .select()
          .from(matches)
          .where(eq(matches.status, filter))
          .orderBy(asc(matches.scheduledAt)),
    db.select().from(teams),
    db
      .select({
        total: sql<number>`count(*)::int`,
        scheduled: sql<number>`count(*) filter (where status = 'scheduled')::int`,
        live: sql<number>`count(*) filter (where status = 'live')::int`,
        finished: sql<number>`count(*) filter (where status = 'finished')::int`,
      })
      .from(matches),
  ]);
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  const filters: { value: FilterValue; label: string; count: number }[] = [
    { value: "all", label: "Todos", count: counts?.total ?? 0 },
    { value: "live", label: "En vivo", count: counts?.live ?? 0 },
    { value: "scheduled", label: "Programados", count: counts?.scheduled ?? 0 },
    { value: "finished", label: "Finalizados", count: counts?.finished ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Resultados de partidos"
        description="Resultados y goleadores. Al guardar, recálculo automático."
      />

      {/* Quick stats — siempre con conteo total, no afectado por el filtro */}
      <section className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Partidos" value={counts?.total ?? 0} />
        <StatTile label="Finalizados" value={counts?.finished ?? 0} accent />
        <StatTile label="En vivo" value={counts?.live ?? 0} pulse />
        <StatTile label="Pendientes" value={counts?.scheduled ?? 0} />
      </section>

      {/* Filter pills · estado del partido. Ruta `?status=…` para que sea
          shareable y stateless. */}
      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por estado">
        {filters.map((f) => {
          const active = filter === f.value;
          const href = f.value === "all" ? "/admin/partidos" : `/admin/partidos?status=${f.value}`;
          return (
            <Link
              key={f.value}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] text-[var(--color-arena)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
              )}
            >
              <span>{f.label}</span>
              <span
                className={cn(
                  "rounded-sm px-1 font-mono text-[0.6rem] tabular",
                  active
                    ? "bg-[var(--color-arena)]/15 text-[var(--color-arena)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]",
                )}
              >
                {f.count}
              </span>
            </Link>
          );
        })}
      </nav>

      {matchRows.length === 0 ? (
        counts?.total === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="size-5" />}
            title="No hay partidos"
            description={
              <>
                Empieza por crear las jornadas y los partidos en{" "}
                <Link href="/admin/calendario" className="underline">
                  Calendario
                </Link>
                .
              </>
            }
          />
        ) : (
          <EmptyState
            icon={<ClipboardCheck className="size-5" />}
            title="Sin partidos en este filtro"
            description={`No hay partidos con estado "${filters.find((f) => f.value === filter)?.label.toLowerCase()}" ahora mismo.`}
          />
        )
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Cuándo</TableHead>
                <TableHead>Partido</TableHead>
                <TableHead className="hidden lg:table-cell">Fase</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchRows.map((m) => {
                const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
                const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="align-top">
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        {m.code}
                      </p>
                      <p className="text-xs">
                        {formatDateTime(m.scheduledAt, {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <TeamFlag code={home?.code} size={20} />
                          <span className="truncate">{home?.name ?? "—"}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <TeamFlag code={away?.code} size={20} />
                          <span className="truncate">{away?.name ?? "—"}</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden align-middle lg:table-cell">
                      <Badge variant="outline" className="text-[0.6rem]">
                        {STAGE_LABEL[m.stage] ?? m.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge
                        variant={
                          m.status === "finished"
                            ? "success"
                            : m.status === "live"
                              ? "warning"
                              : "outline"
                        }
                      >
                        {STATUS_LABEL[m.status] ?? m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle">
                      {m.homeScore != null && m.awayScore != null ? (
                        <span className="font-display tabular text-lg">
                          {m.homeScore} – {m.awayScore}
                          {m.wentToPens ? (
                            <span className="ml-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                              ({m.homeScorePen ?? 0}–{m.awayScorePen ?? 0} pen)
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      <div className="flex items-center justify-end gap-2">
                        <DeleteButton
                          action={deleteMatch}
                          id={m.id}
                          confirmMessage={`¿Eliminar el partido ${m.code}? Se borrarán también goleadores y predicciones.`}
                        />
                        <Link
                          href={`/admin/partidos/${m.id}`}
                          className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                        >
                          Editar <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  pulse,
}: {
  label: string;
  value: number;
  accent?: boolean;
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4",
        accent
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]",
      )}
    >
      <p className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {pulse && value > 0 ? (
          <span className="relative flex size-1.5">
            <span
              aria-hidden
              className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70"
            />
            <span className="relative inline-flex size-1.5 rounded-full bg-[var(--color-arena)]" />
          </span>
        ) : null}
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display tabular text-3xl tracking-tight",
          accent ? "text-[var(--color-arena)] glow-arena" : "",
        )}
      >
        {value}
      </p>
    </div>
  );
}
