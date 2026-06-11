import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { TeamFlag } from "@/components/brand/team-flag";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { localizeTeams } from "@/lib/team-names";
import { localizedMatchdayName } from "@/lib/matchday-names";
import { groups, matchdays, matches, teams } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shell/empty-state";
import { formatDateTime } from "@/lib/utils";
import { intlLocale } from "@/lib/timezone";
import { LocalDateTime } from "@/components/local-date-time";
import { CalendarFilters, type ActiveFilter } from "./calendar-filters";
import { BreadcrumbLD, SportsEventLD } from "@/components/seo/jsonld";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { BrandCTA } from "@/components/seo/brand-cta";

export const metadata = {
  // `absolute` evita que el template global apile "· Quiniela Mundial 2026"
  // y nos deje un title de SERP demasiado largo. Aquí controlamos
  // exactamente lo que ve Google.
  title: { absolute: "Calendario del Mundial 2026 — todos los partidos · Quiniela Mundial" },
  description:
    "Calendario completo del Mundial 2026: los 104 partidos en USA, México y Canadá, fase de grupos, octavos, cuartos, semifinales y final. Horarios, estadios y resultados.",
  alternates: { canonical: "/calendario" },
  openGraph: {
    title: "Calendario del Mundial 2026 · Quiniela Mundial",
    description: "Los 104 partidos del Mundial 2026: fase de grupos, octavos, cuartos, semifinales y final.",
    url: "/calendario",
  },
};
// El calendario cambia solo cuando un admin edita un partido (raro) o se
// guarda un resultado. `force-dynamic` era una pegada gratuita a Postgres
// en cada navegación; ISR a 5 min refresca de sobra y libera el pool.
export const revalidate = 300;

const STAGE_LABEL_KEY: Record<string, string> = {
  group: "stGroup",
  r32: "stR32",
  r16: "stR16",
  qf: "stQf",
  sf: "stSf",
  third: "stThird",
  final: "stFinal",
};

const VALID_STAGE_FILTERS = new Set(["r32", "r16", "qf", "sf", "final"] as const);

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; team?: string; stage?: string }>;
}) {
  const locale = await getLocale();
  const dateLocale = intlLocale(locale);
  const t = await getTranslations("calendarPage");
  const tt = await getTranslations("tournament");
  const sp = await searchParams;

  const [days, matchRows, allTeams, allGroups] = await Promise.all([
    db
      .select()
      .from(matchdays)
      .orderBy(asc(matchdays.orderIndex), asc(matchdays.predictionDeadlineAt)),
    db.select().from(matches).orderBy(asc(matches.scheduledAt)),
    db.select().from(teams),
    db.select().from(groups),
  ]);
  // Nombres de selección localizados (EN/FR/PT) desde el borde de datos.
  const allTeamsLoc = localizeTeams(allTeams, locale);
  const teamById = new Map(allTeamsLoc.map((t) => [t.id, t]));
  const groupById = new Map(allGroups.map((g) => [g.id, g]));
  const teamsByGroup = new Map<number, typeof allTeams>();
  for (const t of allTeamsLoc) {
    if (t.groupId == null) continue;
    const arr = teamsByGroup.get(t.groupId) ?? [];
    arr.push(t);
    teamsByGroup.set(t.groupId, arr);
  }

  // Resolver filtro activo: prioridad team > group > stage > all.
  const groupCode = sp.group?.toUpperCase();
  const teamCode = sp.team?.toUpperCase();
  const stageCode =
    sp.stage && VALID_STAGE_FILTERS.has(sp.stage as never)
      ? (sp.stage as "r32" | "r16" | "qf" | "sf" | "final")
      : null;

  const active: ActiveFilter = teamCode
    ? { kind: "team", code: teamCode }
    : groupCode
      ? { kind: "group", code: groupCode }
      : stageCode
        ? { kind: "stage", stage: stageCode }
        : { kind: "all" };

  // Filtrar matches según el filtro activo.
  const filteredMatches = matchRows.filter((m) => {
    if (active.kind === "all") return true;
    if (active.kind === "team") {
      const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
      const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
      return home?.code === active.code || away?.code === active.code;
    }
    if (active.kind === "group") {
      // Sólo partidos de fase de grupos del grupo seleccionado.
      if (m.stage !== "group") return false;
      const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
      const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
      const groupId = allGroups.find((g) => g.code === active.code)?.id ?? -1;
      return home?.groupId === groupId || away?.groupId === groupId;
    }
    if (active.kind === "stage") return m.stage === active.stage;
    return true;
  });

  const matchesByDay = new Map<number | null, typeof matchRows>();
  for (const m of filteredMatches) {
    const arr = matchesByDay.get(m.matchdayId) ?? [];
    arr.push(m);
    matchesByDay.set(m.matchdayId, arr);
  }

  // Solo mostrar jornadas que tengan al menos un partido tras el filtro.
  const visibleDays = days.filter((d) => (matchesByDay.get(d.id)?.length ?? 0) > 0);

  // Etiqueta humana del filtro para el header pequeño.
  const filterLabel = ((): string | null => {
    if (active.kind === "team") {
      const tm = allTeamsLoc.find((x) => x.code === active.code);
      return tm ? `${tm.name}` : t("teamFallback", { code: active.code });
    }
    if (active.kind === "group") return tt("groupWithCode", { code: active.code });
    if (active.kind === "stage") return STAGE_LABEL_KEY[active.stage] ? tt(STAGE_LABEL_KEY[active.stage]) : active.stage;
    return null;
  })();

  return (
    <div className="space-y-10">
      {/* Marcadores en vivo: refresca cuando cambia el marcador/estado de un
          partido. El calendario muestra el resultado (vive en `matches`), no
          los goleadores → basta con suscribirse a `matches`. */}
      <RealtimeRefresher channelKey="calendario" subscriptions={[{ table: "matches" }]} />
      <SportsEventLD />
      <BreadcrumbLD
        items={[
          { name: tt("home"), href: "/" },
          { name: t("breadcrumb"), href: "/calendario" },
        ]}
      />
      <header className="relative border-b border-[var(--color-border)] pb-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-[var(--color-arena)]" />
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {t("eyebrow")}
            </p>
          </div>
          <h1 className="font-display text-5xl leading-[0.92] tracking-tight sm:text-6xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-lg">
            {t("subtitle")}
          </p>
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-px left-0 h-px w-24 bg-[var(--color-arena)]"
        />
      </header>

      <CalendarFilters groups={allGroups} teamsByGroup={teamsByGroup} active={active} />

      {filterLabel ? (
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {t("filterPrefix")} <span className="text-[var(--color-arena)]">{filterLabel}</span>
          {filteredMatches.length > 0 ? (
            <span className="ml-2 text-[var(--color-muted-foreground)]">
              · {t("matchCount", { n: filteredMatches.length })}
            </span>
          ) : null}
        </p>
      ) : null}

      {days.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-5" />}
          title={t("emptyNotLoadedTitle")}
          description={t("emptyNotLoadedDesc")}
        />
      ) : visibleDays.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-5" />}
          title={t("emptyFilterTitle")}
          description={t("emptyFilterDesc")}
        />
      ) : (
        <div className="space-y-12">
          {visibleDays.map((d) => {
            const dayMatches = matchesByDay.get(d.id) ?? [];
            return (
              <section key={d.id} className="space-y-4">
                <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-4">
                    <span className="font-display text-5xl tracking-tight text-[var(--color-arena)] glow-arena">
                      {d.orderIndex.toString().padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                        {STAGE_LABEL_KEY[d.stage] ? tt(STAGE_LABEL_KEY[d.stage]) : d.stage}
                      </p>
                      <h2 className="font-display text-3xl leading-tight tracking-tight">
                        {localizedMatchdayName(d.name, d.stage, locale)}
                      </h2>
                    </div>
                  </div>
                  <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                    {t("deadline", { date: formatDateTime(d.predictionDeadlineAt, { locale: dateLocale }) })}
                  </p>
                </header>

                <div className="grid gap-3 sm:grid-cols-2">
                  {dayMatches.length === 0 ? (
                    <p className="col-span-full font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                      {t("noMatchesDay")}
                    </p>
                  ) : (
                    dayMatches.map((m) => {
                      const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
                      const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
                      const groupCode =
                        m.stage === "group" && home?.groupId
                          ? groupById.get(home.groupId)?.code ?? null
                          : null;
                      return (
                        <MatchCard
                          key={m.id}
                          m={m}
                          home={home}
                          away={away}
                          groupCode={groupCode}
                          dateLocale={dateLocale}
                        />
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <BrandCTA hint={t("ctaHint")} />
    </div>
  );
}

type MatchRow = {
  id: number;
  code: string;
  scheduledAt: Date;
  status: "scheduled" | "live" | "finished";
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
};

function MatchCard({
  m,
  home,
  away,
  groupCode,
  dateLocale,
}: {
  m: MatchRow;
  home: { name: string; code: string; flagUrl: string | null } | null | undefined;
  away: { name: string; code: string; flagUrl: string | null } | null | undefined;
  groupCode: string | null;
  dateLocale: string;
}) {
  const tt = useTranslations("tournament");
  const isFinished = m.status === "finished";
  const isLive = m.status === "live";
  const winnerHome =
    isFinished && m.homeScore != null && m.awayScore != null && m.homeScore > m.awayScore;
  const winnerAway =
    isFinished && m.homeScore != null && m.awayScore != null && m.awayScore > m.homeScore;
  return (
    <Link
      href={`/partido/${m.id}`}
      className="group relative block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-arena)]/40 hover:shadow-[var(--shadow-elev-2)]"
    >
      {/* Top strip — code · grupo · status */}
      <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
          <span>{m.code}</span>
          {groupCode ? (
            <span className="rounded-sm border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] px-1.5 py-0.5 text-[0.55rem] tracking-[0.18em] text-[var(--color-arena)]">
              {tt("groupWithCode", { code: groupCode })}
            </span>
          ) : null}
        </div>
        <StatusPill status={m.status} />
      </header>

      {/* Versus body */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-5 sm:gap-3 sm:py-6">
        <TeamSide team={home} side="home" winner={winnerHome} />
        <ScoreCenter
          home={m.homeScore}
          away={m.awayScore}
          status={m.status}
          scheduledAt={m.scheduledAt}
          dateLocale={dateLocale}
        />
        <TeamSide team={away} side="away" winner={winnerAway} />
      </div>

      {/* Bottom strip — date · venue */}
      <footer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3 shrink-0" />
          {(() => {
            const opts: Intl.DateTimeFormatOptions = {
              weekday: "short",
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            };
            return (
              <LocalDateTime
                iso={m.scheduledAt.toISOString()}
                ssr={formatDateTime(m.scheduledAt, { ...opts, locale: dateLocale })}
                options={opts}
              />
            );
          })()}
        </span>
        {m.venue ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{m.venue}</span>
          </span>
        ) : null}
      </footer>

      {isLive ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-arena)] to-transparent"
        />
      ) : null}
    </Link>
  );
}

function StatusPill({ status }: { status: MatchRow["status"] }) {
  const tt = useTranslations("tournament");
  if (status === "finished") {
    return (
      <Badge variant="success" className="text-[0.55rem]">
        {tt("statusFinal")}
      </Badge>
    );
  }
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
        <span className="relative flex size-1.5">
          <span
            aria-hidden
            className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70"
          />
          <span className="relative inline-flex size-1.5 rounded-full bg-[var(--color-arena)]" />
        </span>
        {tt("statusLive")}
      </span>
    );
  }
  return (
    <Badge variant="outline" className="text-[0.55rem]">
      {tt("statusScheduled")}
    </Badge>
  );
}

function TeamSide({
  team,
  side,
  winner,
}: {
  team: { name: string; code: string; flagUrl: string | null } | null | undefined;
  side: "home" | "away";
  winner: boolean;
}) {
  const tt = useTranslations("tournament");
  const isHome = side === "home";
  return (
    <div
      className={`flex min-w-0 items-center gap-2 sm:gap-3 ${
        isHome ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      <span
        className={`shrink-0 transition-transform ${winner ? "scale-105" : ""}`}
        style={{ filter: !team ? "grayscale(1) opacity(0.4)" : undefined }}
      >
        {/* Bandera más pequeña en mobile para ceder espacio al nombre */}
        <span className="block sm:hidden">
          <TeamFlag code={team?.code} size={30} />
        </span>
        <span className="hidden sm:block">
          <TeamFlag code={team?.code} size={42} />
        </span>
      </span>
      <div className="min-w-0">
        <p
          className={`font-display text-sm leading-[1.05] tracking-tight sm:text-lg ${
            winner ? "text-[var(--color-foreground)]" : "text-[var(--color-foreground)]"
          }`}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {team?.name ?? tt("tbd")}
        </p>
        <p className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
          {team?.code ?? "—"}
        </p>
      </div>
    </div>
  );
}

function ScoreCenter({
  home,
  away,
  status,
  scheduledAt,
  dateLocale,
}: {
  home: number | null;
  away: number | null;
  status: MatchRow["status"];
  scheduledAt: Date;
  dateLocale: string;
}) {
  const tt = useTranslations("tournament");
  if (status === "scheduled") {
    return (
      <div className="flex flex-col items-center gap-0.5 px-1 sm:px-2">
        <span className="font-display text-xl tracking-tight text-[var(--color-muted-foreground)]/70 sm:text-2xl">
          {tt("vs")}
        </span>
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          <LocalDateTime
            iso={scheduledAt.toISOString()}
            ssr={formatDateTime(scheduledAt, { hour: "2-digit", minute: "2-digit", locale: dateLocale })}
            options={{ hour: "2-digit", minute: "2-digit" }}
          />
        </span>
      </div>
    );
  }
  return (
    <div
      className={`flex items-baseline gap-1.5 px-1 sm:gap-2 sm:px-2 ${
        status === "live" ? "text-[var(--color-arena)] glow-arena" : ""
      }`}
    >
      <span className="font-display tabular text-3xl leading-none tracking-tighter sm:text-4xl">
        {home ?? 0}
      </span>
      <span className="font-display text-lg leading-none text-[var(--color-muted-foreground)]/70 sm:text-xl">
        ·
      </span>
      <span className="font-display tabular text-3xl leading-none tracking-tighter sm:text-4xl">
        {away ?? 0}
      </span>
    </div>
  );
}
