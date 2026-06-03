import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { asc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, teams } from "@/lib/db/schema";
import { TeamFlag } from "@/components/brand/team-flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shell/empty-state";
import { formatDateTime } from "@/lib/utils";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { findVenueBySlug, VENUES } from "@/lib/seo/venues";

const STAGE_LABEL: Record<string, string> = {
  group: "Fase de grupos",
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinales",
  third: "Tercer puesto",
  final: "Final",
};

export function generateStaticParams() {
  return VENUES.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venue = findVenueBySlug(slug);
  if (!venue) return { title: "Sede" };
  return {
    title: venue.name,
    description: `${venue.name} (${venue.city}, ${venue.country}) — capacidad ${venue.capacity.toLocaleString("es-ES")}. Sede del Mundial 2026: historia, partidos asignados y datos clave.`,
    alternates: { canonical: `/sedes/${venue.slug}` },
    openGraph: {
      title: `${venue.name} · Mundial 2026`,
      description: `${venue.city}, ${venue.country} · ${venue.capacity.toLocaleString("es-ES")} espectadores · sede del Mundial 2026.`,
      url: `/sedes/${venue.slug}`,
    },
  };
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venue = findVenueBySlug(slug);
  if (!venue) notFound();

  // Partidos de esta sede: matchea por cualquier alias de venue.name. El
  // seed guarda matches.venue como "{Estadio} · {Ciudad}", así que aceptamos
  // tanto la coincidencia exacta como el prefijo "{alias} · …".
  const venueMatches = await db
    .select()
    .from(matches)
    .where(
      or(
        ...venue.aliases.flatMap((a) => [
          eq(matches.venue, a),
          ilike(matches.venue, `${a} · %`),
        ]),
      ),
    )
    .orderBy(asc(matches.scheduledAt));

  const teamIds = Array.from(
    new Set(
      venueMatches.flatMap((m) =>
        [m.homeTeamId, m.awayTeamId].filter((x): x is number => x != null),
      ),
    ),
  );
  const teamRows =
    teamIds.length > 0
      ? await db.select().from(teams).where(inArray(teams.id, teamIds))
      : [];
  const teamById = new Map(teamRows.map((t) => [t.id, t]));

  return (
    <div className="space-y-10">
      <BreadcrumbLD
        items={[
          { name: "Inicio", href: "/" },
          { name: "Sedes", href: "/sedes" },
          { name: venue.name, href: `/sedes/${venue.slug}` },
        ]}
      />

      <Button
        asChild
        variant="ghost"
        size="sm"
        className="px-0 text-[var(--color-muted-foreground)]"
      >
        <Link href="/sedes">
          <ArrowLeft />
          Volver a sedes
        </Link>
      </Button>

      {/* ─── Hero ─── */}
      <header className="space-y-4 border-b border-[var(--color-border)] pb-8">
        <div className="flex items-center gap-3">
          <span className="h-px w-10 bg-[var(--color-arena)]" />
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-arena)]">
            Sede · {venue.country}
          </p>
        </div>
        <h1 className="font-display text-5xl leading-[0.92] tracking-tight sm:text-6xl">
          {venue.name}
        </h1>
        <p className="font-editorial text-lg italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-xl">
          {venue.city}
          {venue.region ? `, ${venue.region}` : ""}. Capacidad{" "}
          {venue.capacity.toLocaleString("es-ES")} espectadores. Inaugurado en{" "}
          {venue.inaugurated}.
        </p>
      </header>

      {/* ─── Stat tiles ─── */}
      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Capacidad" value={venue.capacity.toLocaleString("es-ES")} accent />
        <StatTile label="Inaugurado" value={String(venue.inaugurated)} textValue />
        <StatTile label="Partidos · Mundial 2026" value={venueMatches.length} />
      </section>

      {/* ─── El estadio ─── */}
      <section className="space-y-4">
        <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            El estadio
          </h2>
        </header>
        <p className="font-editorial text-base italic leading-relaxed text-[var(--color-foreground)] sm:text-lg">
          {venue.description}
        </p>
      </section>

      {/* ─── Historia ─── */}
      <section className="space-y-4">
        <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Historia
          </h2>
        </header>
        <p className="font-editorial text-base italic leading-relaxed text-[var(--color-foreground)] sm:text-lg">
          {venue.history}
        </p>
      </section>

      {/* ─── Lo destacable ─── */}
      <section className="rounded-2xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] p-6 sm:p-8">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
          Lo que hay que saber
        </p>
        <p className="pt-2 text-base leading-relaxed sm:text-lg">{venue.notable}</p>
      </section>

      {/* ─── Datos clave ─── */}
      <section className="space-y-4">
        <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Datos clave
          </h2>
        </header>
        <ul className="grid gap-2 sm:grid-cols-2">
          <FactRow icon={<MapPin className="size-4" />} label="Ciudad" value={`${venue.city}${venue.region ? `, ${venue.region}` : ""}, ${venue.country}`} />
          <FactRow icon={<Users className="size-4" />} label="Capacidad" value={venue.capacity.toLocaleString("es-ES")} />
          <FactRow icon={<CalendarDays className="size-4" />} label="Inaugurado" value={String(venue.inaugurated)} />
          <FactRow icon={<Clock className="size-4" />} label="Equipos locales" value={venue.homeTeams.join(" · ")} />
        </ul>
      </section>

      {/* ─── Partidos en esta sede ─── */}
      <section className="space-y-4">
        <header className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Partidos del Mundial 2026 en {venue.name}
          </h2>
        </header>
        {venueMatches.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="size-5" />}
            title="Sin partidos asignados todavía"
            description="El fixture oficial todavía no marca partidos en esta sede."
          />
        ) : (
          <ul className="space-y-2">
            {venueMatches.map((m) => {
              const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
              const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
              return (
                <li key={m.id}>
                  <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-arena)]/40">
                    <Link
                      href={`/partido/${m.id}`}
                      aria-label={`Partido ${m.code}`}
                      className="absolute inset-0 z-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
                    />
                    <span className="relative flex items-center gap-2">
                      <Badge variant="outline" className="text-[0.55rem]">
                        {STAGE_LABEL[m.stage] ?? m.stage}
                      </Badge>
                      <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        {m.code}
                      </span>
                    </span>
                    <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2 sm:ml-3">
                      {home ? (
                        <Link
                          href={`/equipos/${home.code}`}
                          aria-label={home.name}
                          className="flex shrink-0 items-center hover:opacity-80"
                        >
                          <TeamFlag code={home.code} size={20} />
                        </Link>
                      ) : (
                        <TeamFlag code={undefined} size={20} />
                      )}
                      <span className="truncate text-sm font-medium">
                        {home ? (
                          <Link href={`/equipos/${home.code}`} className="hover:text-[var(--color-arena)]">
                            {home.name}
                          </Link>
                        ) : (
                          "TBD"
                        )}{" "}
                        <span className="text-[var(--color-muted-foreground)]">·</span>{" "}
                        {away ? (
                          <Link href={`/equipos/${away.code}`} className="hover:text-[var(--color-arena)]">
                            {away.name}
                          </Link>
                        ) : (
                          "TBD"
                        )}
                      </span>
                      {away ? (
                        <Link
                          href={`/equipos/${away.code}`}
                          aria-label={away.name}
                          className="flex shrink-0 items-center hover:opacity-80"
                        >
                          <TeamFlag code={away.code} size={20} />
                        </Link>
                      ) : (
                        <TeamFlag code={undefined} size={20} />
                      )}
                    </span>
                    <span className="relative font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {formatDateTime(m.scheduledAt, {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  textValue,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  textValue?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        accent
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p
        className={`mt-2 font-display tabular tracking-tight ${
          textValue ? "text-2xl" : "text-4xl"
        } ${accent ? "text-[var(--color-arena)] glow-arena" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function FactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <span className="text-[var(--color-arena)]">{icon}</span>
      <div className="min-w-0">
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium">{value}</p>
      </div>
    </li>
  );
}
