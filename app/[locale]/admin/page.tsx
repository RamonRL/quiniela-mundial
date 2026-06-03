import Link from "next/link";
import {
  ArrowUpRight,
  CalendarRange,
  ClipboardCheck,
  Flame,
  Goal,
  Radar,
  ShieldCheck,
  Sliders,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchdays, matches } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

type CountsRow = {
  teamCount: number;
  playerCount: number;
  matchdayCount: number;
  matchTotal: number;
  matchFinished: number;
  goalCount: number;
  adminCount: number;
  userCount: number;
  specialCount: number;
  specialResolved: number;
};

export default async function AdminHome() {
  // Una sola roundtrip a Postgres para los nueve aggregates en vez de
  // 9 queries separadas por Promise.all — sobre Supabase desde Vercel
  // serverless cada query paga ~100-300ms de latencia, así que esto
  // baja el tiempo de carga del panel admin de ~3s a <1s.
  const [countsRow] = await db.execute<CountsRow>(sql`
    SELECT
      (SELECT count(*)::int FROM teams) AS "teamCount",
      (SELECT count(*)::int FROM players) AS "playerCount",
      (SELECT count(*)::int FROM matchdays) AS "matchdayCount",
      (SELECT count(*)::int FROM matches) AS "matchTotal",
      (SELECT count(*) FILTER (WHERE status = 'finished')::int FROM matches) AS "matchFinished",
      (SELECT count(*)::int FROM match_scorers) AS "goalCount",
      (SELECT count(*) FILTER (WHERE role = 'admin')::int FROM profiles) AS "adminCount",
      (SELECT count(*)::int FROM profiles) AS "userCount",
      (SELECT count(*)::int FROM special_predictions) AS "specialCount",
      (SELECT count(*) FILTER (WHERE resolved_value_json IS NOT NULL)::int FROM special_predictions) AS "specialResolved"
  `);
  const counts = countsRow as CountsRow;
  const {
    teamCount,
    playerCount,
    matchdayCount,
    matchTotal,
    matchFinished,
    goalCount,
    adminCount,
    userCount,
    specialCount,
    specialResolved,
  } = counts;

  const [nextDeadlineRows, nextMatchRows] = await Promise.all([
    db
      .select()
      .from(matchdays)
      .where(sql`${matchdays.predictionDeadlineAt} > now()`)
      .orderBy(matchdays.predictionDeadlineAt)
      .limit(1),
    db
      .select()
      .from(matches)
      .where(sql`${matches.scheduledAt} > now()`)
      .orderBy(matches.scheduledAt)
      .limit(1),
  ]);

  const nextDeadline = nextDeadlineRows[0] ?? null;
  const nextMatch = nextMatchRows[0] ?? null;

  // Quick checklist of bootstrap state
  const checklist = [
    { label: "48 selecciones", done: teamCount >= 48, hint: `${teamCount}/48`, href: "/admin/selecciones" },
    { label: "9 jornadas creadas", done: matchdayCount >= 9, hint: `${matchdayCount}/9`, href: "/admin/calendario" },
    {
      label: "104 partidos cargados",
      done: matchTotal >= 104,
      hint: `${matchTotal}/104`,
      href: "/admin/partidos",
    },
    {
      label: "Plantillas",
      done: playerCount >= 48 * 23,
      hint: `${playerCount} jugadores`,
      href: "/admin/jugadores",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Panel admin"
        title="Control de la quiniela"
        description="Estado del torneo."
      />

      {/* Stats grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Users className="size-4" />}
          label="Selecciones"
          value={`${teamCount}`}
          hint={`/ 48 selecciones`}
          href="/admin/selecciones"
        />
        <StatTile
          icon={<Goal className="size-4" />}
          label="Jugadores"
          value={`${playerCount}`}
          hint={`${(playerCount / Math.max(1, teamCount)).toFixed(0)} avg/equipo`}
          href="/admin/jugadores"
        />
        <StatTile
          icon={<CalendarRange className="size-4" />}
          label="Partidos"
          value={`${matchTotal}`}
          hint={`${matchFinished} finalizados`}
          href="/admin/partidos"
        />
        <StatTile
          icon={<UserCheck className="size-4" />}
          label="Participantes"
          value={`${userCount}`}
          hint={`${adminCount} admins`}
          href="/admin/usuarios"
        />
      </section>

      {/* Next deadlines */}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <header className="flex items-center gap-3 pb-3">
            <Flame className="size-4 text-[var(--color-arena)]" />
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Próximo cierre
            </p>
          </header>
          {nextDeadline ? (
            <Link
              href={`/admin/calendario/${nextDeadline.id}`}
              className="group block space-y-2"
            >
              <p className="font-display text-2xl tracking-tight">{nextDeadline.name}</p>
              <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                Cierre · {formatDateTime(nextDeadline.predictionDeadlineAt)}
              </p>
              <p className="flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)] group-hover:underline">
                Gestionar <ArrowUpRight className="size-3" />
              </p>
            </Link>
          ) : (
            <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              Sin jornadas activas.{" "}
              <Link href="/admin/calendario" className="underline">
                Crear
              </Link>
              .
            </p>
          )}
        </article>

        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <header className="flex items-center gap-3 pb-3">
            <ClipboardCheck className="size-4 text-[var(--color-arena)]" />
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Próximo partido
            </p>
          </header>
          {nextMatch ? (
            <Link
              href={`/admin/partidos/${nextMatch.id}`}
              className="group block space-y-2"
            >
              <p className="font-display text-2xl tracking-tight">{nextMatch.code}</p>
              <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                {formatDateTime(nextMatch.scheduledAt)}
                {nextMatch.venue ? ` · ${nextMatch.venue}` : ""}
              </p>
              <p className="flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)] group-hover:underline">
                Editar resultado <ArrowUpRight className="size-3" />
              </p>
            </Link>
          ) : (
            <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              Sin próximos.{" "}
              <Link href="/admin/calendario" className="underline">
                Cargar calendario
              </Link>
              .
            </p>
          )}
        </article>
      </section>

      {/* Checklist + shortcuts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <header className="flex items-center justify-between gap-3 pb-3">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Checklist de carga
            </p>
            <ShieldCheck className="size-4 text-[var(--color-muted-foreground)]" />
          </header>
          <ul className="space-y-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link
                  href={c.href}
                  className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 transition hover:border-[var(--color-arena)]/40"
                >
                  <span className="flex items-center gap-3">
                    <Badge variant={c.done ? "success" : "warning"}>
                      {c.done ? "OK" : "Pendiente"}
                    </Badge>
                    <span className="text-sm font-medium">{c.label}</span>
                  </span>
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    {c.hint}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <header className="flex items-center justify-between gap-3 pb-3">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Atajos
            </p>
            <Sparkles className="size-4 text-[var(--color-muted-foreground)]" />
          </header>
          <div className="grid grid-cols-2 gap-2">
            <Shortcut
              icon={<Sliders className="size-4" />}
              label="Reglas"
              hint="Editar puntuación"
              href="/admin/reglas"
            />
            <Shortcut
              icon={<Sparkles className="size-4" />}
              label="Especiales"
              hint={`${specialResolved}/${specialCount} resueltas`}
              href="/admin/especiales"
            />
            <Shortcut
              icon={<ShieldCheck className="size-4" />}
              label="Operaciones"
              hint="Cerrar fase / R32 / etc."
              href="/admin/operaciones"
            />
            <Shortcut
              icon={<Radar className="size-4" />}
              label="Monitoreo"
              hint={`${goalCount} goles registrados`}
              href="/admin/monitoreo"
            />
          </div>
        </article>
      </section>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-arena)]/40"
    >
      <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
        {icon}
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.32em]">{label}</span>
      </div>
      <p className="mt-2 font-display tabular text-4xl tracking-tight">{value}</p>
      {hint ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">{hint}</p>
      ) : null}
    </Link>
  );
}

function Shortcut({
  icon,
  label,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 transition hover:border-[var(--color-arena)]/40"
    >
      <span className="flex items-center gap-2 text-[var(--color-arena)]">{icon}</span>
      <span className="font-display text-base tracking-tight">{label}</span>
      <span className="text-[0.65rem] text-[var(--color-muted-foreground)]">{hint}</span>
    </Link>
  );
}
