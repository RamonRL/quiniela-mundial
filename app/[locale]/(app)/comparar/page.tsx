import { TeamFlag } from "@/components/brand/team-flag";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { localizeTeams } from "@/lib/team-names";
import { and, asc, desc, eq, inArray, lte, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groups,
  leagues,
  matches,
  players,
  predGroupRanking,
  predMatchResult,
  predMatchScorer,
  predSpecial,
  predTournamentTopScorer,
  profiles,
  specialPredictions,
  teams,
} from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { Lock, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes, inLeagueFilter } from "@/lib/leagues";
import { getDateContext } from "@/lib/timezone-server";
import { formatDateTime } from "@/lib/utils";
import { formatRemaining } from "@/lib/deadlines";
import { OpponentPicker } from "./opponent-picker";
import { CompareTabs } from "./compare-tabs";

export const metadata = { title: "Comparar predicciones" };

const KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

type Translator = Awaited<ReturnType<typeof getTranslations>>;
type Team = { id: number; code: string; name: string };

const ROUND_KEY: Record<string, string> = {
  group: "roundGroup",
  r32: "roundR32",
  r16: "roundR16",
  qf: "roundQf",
  sf: "roundSf",
  final: "roundFinal",
  champion: "roundChampion",
};

function sign(h: number | null, a: number | null): "home" | "draw" | "away" | null {
  if (h == null || a == null) return null;
  return h > a ? "home" : h < a ? "away" : "draw";
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ vs?: string }>;
}) {
  const me = await requireUser();
  const locale = await getLocale();
  const { timeZone, locale: dateLocale } = await getDateContext();
  const t = await getTranslations("compare");
  const leagueId = (await currentLeagueId(me))!;
  const [activeLeague] = await db
    .select({ isPublic: leagues.isPublic })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (activeLeague?.isPublic) redirect("/dashboard");

  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  const isCompleto = mode === "completo";

  const params = await searchParams;
  const vsId = params.vs ?? null;
  const leagueFilter = inLeagueFilter(leagueId);
  const opponentFilter = leagueFilter
    ? and(ne(profiles.id, me.id), leagueFilter)
    : ne(profiles.id, me.id);
  const allUsers = await db
    .select()
    .from(profiles)
    .where(opponentFilter)
    .orderBy(asc(profiles.email));

  if (allUsers.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("descEmpty")} />
        <EmptyState icon={<Trophy className="size-5" />} title={t("emptyTitle")} description={t("emptyDesc")} />
      </div>
    );
  }

  const opponent = vsId ? allUsers.find((u) => u.id === vsId) ?? null : allUsers[0];
  const oppName = opponent ? opponent.nickname || opponent.email.split("@")[0] : "";
  const tournamentPredsPublic = KICKOFF.getTime() <= Date.now();
  const now = new Date();

  // ── Carga de datos (condicional al modo) ──────────────────────────────
  const allTeams = await db.select().from(teams);
  const teamById = new Map<number, Team>(
    localizeTeams(allTeams, locale).map((tm) => [tm.id, tm]),
  );
  const teamByCode = new Map<string, Team>(
    [...teamById.values()].map((tm) => [tm.code, tm]),
  );

  // Resultados: partidos ya empezados (visibles), todos los modos.
  const startedMatches = await db
    .select()
    .from(matches)
    .where(lte(matches.scheduledAt, now))
    .orderBy(desc(matches.scheduledAt));
  const startedIds = startedMatches.map((m) => m.id);

  const oppId = opponent?.id ?? "";
  const [resultPreds, scorerPreds] = await Promise.all([
    startedIds.length > 0 && opponent
      ? db
          .select()
          .from(predMatchResult)
          .where(
            and(
              eq(predMatchResult.leagueId, leagueId),
              inArray(predMatchResult.userId, [me.id, oppId]),
              inArray(predMatchResult.matchId, startedIds),
            ),
          )
      : Promise.resolve([] as Array<typeof predMatchResult.$inferSelect>),
    isCompleto && startedIds.length > 0 && opponent
      ? db
          .select()
          .from(predMatchScorer)
          .where(
            and(
              eq(predMatchScorer.leagueId, leagueId),
              inArray(predMatchScorer.userId, [me.id, oppId]),
              inArray(predMatchScorer.matchId, startedIds),
            ),
          )
      : Promise.resolve([] as Array<typeof predMatchScorer.$inferSelect>),
  ]);

  // ── Datos solo de modo COMPLETO: grupos, bota, especiales ──────────────
  let myGroups: Array<typeof predGroupRanking.$inferSelect> = [];
  let oppGroups: Array<typeof predGroupRanking.$inferSelect> = [];
  let allGroups: Array<typeof groups.$inferSelect> = [];
  let specialDefs: Array<typeof specialPredictions.$inferSelect> = [];
  let mySpecials: Array<typeof predSpecial.$inferSelect> = [];
  let oppSpecials: Array<typeof predSpecial.$inferSelect> = [];
  let myTopId: number | null = null;
  let oppTopId: number | null = null;

  if (isCompleto && opponent) {
    const [mg, og, ag, defs, ms, os, mt, ot] = await Promise.all([
      db.select().from(predGroupRanking).where(and(eq(predGroupRanking.userId, me.id), eq(predGroupRanking.leagueId, leagueId))),
      db.select().from(predGroupRanking).where(and(eq(predGroupRanking.userId, oppId), eq(predGroupRanking.leagueId, leagueId))),
      db.select().from(groups).orderBy(asc(groups.code)),
      db.select().from(specialPredictions).orderBy(asc(specialPredictions.orderIndex)),
      db.select().from(predSpecial).where(and(eq(predSpecial.userId, me.id), eq(predSpecial.leagueId, leagueId))),
      db.select().from(predSpecial).where(and(eq(predSpecial.userId, oppId), eq(predSpecial.leagueId, leagueId))),
      db.select().from(predTournamentTopScorer).where(and(eq(predTournamentTopScorer.userId, me.id), eq(predTournamentTopScorer.leagueId, leagueId))).limit(1),
      db.select().from(predTournamentTopScorer).where(and(eq(predTournamentTopScorer.userId, oppId), eq(predTournamentTopScorer.leagueId, leagueId))).limit(1),
    ]);
    myGroups = mg; oppGroups = og; allGroups = ag; specialDefs = defs;
    mySpecials = ms; oppSpecials = os;
    myTopId = mt[0]?.playerId ?? null; oppTopId = ot[0]?.playerId ?? null;
  }

  // Jugadores referenciados (goleadores de partido + bota + especiales tipo player).
  const playerIds = new Set<number>();
  for (const s of scorerPreds) playerIds.add(s.playerId);
  if (myTopId) playerIds.add(myTopId);
  if (oppTopId) playerIds.add(oppTopId);
  for (const sp of [...mySpecials, ...oppSpecials]) {
    const v = sp.valueJson as { playerId?: number } | null;
    if (typeof v?.playerId === "number") playerIds.add(v.playerId);
  }
  const playerRows =
    playerIds.size > 0
      ? await db.select().from(players).where(inArray(players.id, [...playerIds]))
      : [];
  const playerById = new Map(playerRows.map((p) => [p.id, p]));

  // ── Builders de cada sección ───────────────────────────────────────────
  const ctx = { t, teamById, teamByCode, playerById, oppName, mode, locale, timeZone, dateLocale };

  const groupsNode = renderGroups({ myGroups, oppGroups, allGroups, ...ctx });
  const botaSpecialsNode = renderBotaSpecials({
    specialDefs,
    mySpecials,
    oppSpecials,
    myTopId,
    oppTopId,
    ...ctx,
  });
  const resultsNode = renderResults({
    startedMatches,
    resultPreds,
    scorerPreds,
    meId: me.id,
    oppId,
    ...ctx,
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("desc")} />
      <OpponentPicker
        currentUserId={me.id}
        currentOpponentId={opponent?.id ?? null}
        opponents={allUsers.map((u) => ({ id: u.id, email: u.email, nickname: u.nickname, avatarUrl: u.avatarUrl }))}
      />

      {!opponent ? (
        <EmptyState icon={<Trophy className="size-5" />} title={t("noOpponentTitle")} description={t("noOpponentDesc")} />
      ) : !tournamentPredsPublic && isCompleto ? (
        <PreKickoffTeaser opponentName={oppName} timeZone={timeZone} locale={dateLocale} />
      ) : isCompleto ? (
        <CompareTabs
          tabs={[
            { id: "groups", label: t("tabGroups"), content: groupsNode },
            { id: "bota", label: t("tabBotaSpecials"), content: botaSpecialsNode },
            { id: "results", label: t("tabResults"), content: resultsNode },
          ]}
        />
      ) : (
        // Marcador / Solo Ganador: solo resultados (marcador o 1X2).
        <section className="space-y-3">
          <h2 className="font-display text-2xl">{t("sectionResultsSimple")}</h2>
          {resultsNode}
        </section>
      )}

      <p className="text-xs text-[var(--color-muted-foreground)]">
        {t.rich("tip", {
          link: (chunks) => (
            <Link href="/ranking" className="underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

// ─────────────────────────── Sección: Grupos ───────────────────────────
function renderGroups({
  myGroups,
  oppGroups,
  allGroups,
  teamById,
  t,
}: {
  myGroups: Array<typeof predGroupRanking.$inferSelect>;
  oppGroups: Array<typeof predGroupRanking.$inferSelect>;
  allGroups: Array<typeof groups.$inferSelect>;
  teamById: Map<number, Team>;
  t: Translator;
}) {
  const find = (rows: typeof myGroups, gid: number) => rows.find((r) => r.groupId === gid) ?? null;
  const anyPick = allGroups.some((g) => find(myGroups, g.id) || find(oppGroups, g.id));
  if (!anyPick) {
    return <EmptyState icon={<Trophy className="size-5" />} title={t("sectionGroups")} description={t("specialsEmpty")} />;
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {allGroups.map((g) => {
        const m = find(myGroups, g.id);
        const o = find(oppGroups, g.id);
        if (!m && !o) return null;
        const myIds = [m?.pos1TeamId, m?.pos2TeamId, m?.pos3TeamId, m?.pos4TeamId];
        const oppIds = [o?.pos1TeamId, o?.pos2TeamId, o?.pos3TeamId, o?.pos4TeamId];
        const matchesArr = myIds.map((id, i) => id != null && id === oppIds[i]);
        const matchCount = matchesArr.filter(Boolean).length;
        return (
          <Card key={g.id}>
            <CardHeader className="flex flex-row items-baseline justify-between gap-2">
              <CardTitle className="text-base">{g.name}</CardTitle>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
                {t("matchCount", { n: matchCount })}
              </span>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {[0, 1, 2, 3].map((i) => {
                  const match = matchesArr[i];
                  return (
                    <li
                      key={i}
                      className={`grid grid-cols-[28px_1fr_24px_1fr] items-center gap-2 rounded-md px-2 py-1.5 ${
                        match ? "bg-[color-mix(in_oklch,var(--color-success)_8%,transparent)] ring-1 ring-[var(--color-success)]/30" : ""
                      }`}
                    >
                      <span className="font-display tabular text-base text-[var(--color-muted-foreground)]">{t("pos", { n: i + 1 })}</span>
                      <ComparisonCell team={teamById.get(myIds[i] ?? -1) ?? null} match={match} />
                      <span className={`text-center font-mono text-[0.7rem] ${match ? "text-[var(--color-success)]" : "text-[var(--color-muted-foreground)]/40"}`}>{match ? "=" : "·"}</span>
                      <ComparisonCell team={teamById.get(oppIds[i] ?? -1) ?? null} match={match} align="end" />
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ──────────────────── Sección: Bota de Oro & Especiales ────────────────────
function renderBotaSpecials({
  specialDefs,
  mySpecials,
  oppSpecials,
  myTopId,
  oppTopId,
  teamByCode,
  playerById,
  oppName,
  t,
}: {
  specialDefs: Array<typeof specialPredictions.$inferSelect>;
  mySpecials: Array<typeof predSpecial.$inferSelect>;
  oppSpecials: Array<typeof predSpecial.$inferSelect>;
  myTopId: number | null;
  oppTopId: number | null;
  teamByCode: Map<string, Team>;
  playerById: Map<number, typeof players.$inferSelect>;
  oppName: string;
  t: Translator;
}) {
  const myById = new Map(mySpecials.map((s) => [s.specialId, s.valueJson]));
  const oppById = new Map(oppSpecials.map((s) => [s.specialId, s.valueJson]));

  type Row = { label: string; mine: string; opp: string };
  const rows: Row[] = [
    {
      label: t("botaLabel"),
      mine: myTopId ? playerById.get(myTopId)?.name ?? t("none") : t("none"),
      opp: oppTopId ? playerById.get(oppTopId)?.name ?? t("none") : t("none"),
    },
    ...specialDefs.map((sp) => ({
      label: sp.question,
      mine: formatSpecial(sp, myById.get(sp.id), { teamByCode, playerById, t }),
      opp: formatSpecial(sp, oppById.get(sp.id), { teamByCode, playerById, t }),
    })),
  ];

  if (rows.length === 0) {
    return <EmptyState icon={<Trophy className="size-5" />} title={t("sectionBotaSpecials")} description={t("specialsEmpty")} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="grid grid-cols-[1fr_1fr] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
        <span>{t("you")}</span>
        <span className="text-right">{oppName}</span>
      </div>
      <ul>
        {rows.map((r, i) => {
          const same = r.mine !== t("none") && r.mine === r.opp;
          return (
            <li key={i} className="border-b border-[var(--color-border)] px-4 py-2.5 last:border-b-0">
              <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">{r.label}</p>
              <div className={`mt-1 grid grid-cols-[1fr_1fr] items-center gap-2 ${same ? "" : ""}`}>
                <span className={`truncate text-sm font-medium ${same ? "text-[var(--color-success)]" : ""}`}>{r.mine}</span>
                <span className={`truncate text-right text-sm font-medium ${same ? "text-[var(--color-success)]" : ""}`}>{r.opp}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatSpecial(
  sp: typeof specialPredictions.$inferSelect,
  raw: unknown,
  { teamByCode, playerById, t }: { teamByCode: Map<string, Team>; playerById: Map<number, typeof players.$inferSelect>; t: Translator },
): string {
  const v = (raw ?? null) as Record<string, unknown> | null;
  if (!v) return t("none");
  switch (sp.type) {
    case "yes_no":
      return v.value === true ? t("yes") : v.value === false ? t("no") : t("none");
    case "single_choice":
    case "number_range":
      return v.value != null && v.value !== "" ? String(v.value) : t("none");
    case "player": {
      const id = typeof v.playerId === "number" ? v.playerId : null;
      return id ? playerById.get(id)?.name ?? t("none") : t("none");
    }
    case "team_with_round": {
      const code = typeof v.teamCode === "string" ? v.teamCode : null;
      if (!code) return t("none");
      const name = teamByCode.get(code)?.name ?? code;
      const round = typeof v.round === "string" ? v.round : null;
      return round && ROUND_KEY[round] ? `${name} · ${t(ROUND_KEY[round])}` : name;
    }
    default:
      return t("none");
  }
}

// ──────────────── Sección: Resultados & Goleadores ────────────────
function renderResults({
  startedMatches,
  resultPreds,
  scorerPreds,
  meId,
  oppId,
  teamById,
  playerById,
  oppName,
  mode,
  t,
  timeZone,
  dateLocale,
}: {
  startedMatches: Array<typeof matches.$inferSelect>;
  resultPreds: Array<typeof predMatchResult.$inferSelect>;
  scorerPreds: Array<typeof predMatchScorer.$inferSelect>;
  meId: string;
  oppId: string;
  teamById: Map<number, Team>;
  playerById: Map<number, typeof players.$inferSelect>;
  oppName: string;
  mode: string;
  t: Translator;
  timeZone: string | null;
  dateLocale: string;
}) {
  if (startedMatches.length === 0) {
    return <EmptyState icon={<Trophy className="size-5" />} title={t("sectionResultsSimple")} description={t("resultsEmpty")} />;
  }
  const isCompleto = mode === "completo";
  const isSolo = mode === "solo_ganador";

  const resByKey = new Map(resultPreds.map((r) => [`${r.userId}:${r.matchId}`, r]));
  const scoByKey = new Map(scorerPreds.map((s) => [`${s.userId}:${s.matchId}`, s]));

  const pickLabel = (pred: typeof predMatchResult.$inferSelect | undefined, home: Team | null, away: Team | null): string => {
    if (!pred) return t("none");
    if (isSolo) {
      const s = sign(pred.homeScore, pred.awayScore);
      if (s === "draw") return t("draw");
      if (s === "home") return t("winsTeam", { team: home?.name ?? "?" });
      if (s === "away") return t("winsTeam", { team: away?.name ?? "?" });
      return t("none");
    }
    if (pred.homeScore == null || pred.awayScore == null) return t("none");
    return `${pred.homeScore}–${pred.awayScore}${pred.willGoToPens ? " (p)" : ""}`;
  };
  const scorerLabel = (s: typeof predMatchScorer.$inferSelect | undefined): string =>
    s ? playerById.get(s.playerId)?.name ?? t("none") : t("none");

  return (
    <ul className="space-y-3">
      {startedMatches.map((m) => {
        const home = m.homeTeamId ? teamById.get(m.homeTeamId) ?? null : null;
        const away = m.awayTeamId ? teamById.get(m.awayTeamId) ?? null : null;
        const myRes = resByKey.get(`${meId}:${m.id}`);
        const oppRes = resByKey.get(`${oppId}:${m.id}`);
        const myPick = pickLabel(myRes, home, away);
        const oppPick = pickLabel(oppRes, home, away);
        const samePick = myPick !== t("none") && myPick === oppPick;
        const realShown = m.homeScore != null && m.awayScore != null;
        const mySco = isCompleto ? scorerLabel(scoByKey.get(`${meId}:${m.id}`)) : null;
        const oppSco = isCompleto ? scorerLabel(scoByKey.get(`${oppId}:${m.id}`)) : null;
        return (
          <li key={m.id} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {/* Cabecera: ronda·código · fecha · matchup + resultado real */}
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-4 py-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <TeamFlag code={home?.code} size={18} />
                <span className="truncate text-sm font-medium">{home?.name ?? "TBD"}</span>
                <span className="font-display tabular text-sm text-[var(--color-arena)]">
                  {realShown ? `${m.homeScore}–${m.awayScore}` : "·"}
                </span>
                <span className="truncate text-sm font-medium">{away?.name ?? "TBD"}</span>
                <TeamFlag code={away?.code} size={18} />
              </span>
              <span className="shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                {formatDateTime(m.scheduledAt, { timeZone: timeZone ?? undefined, locale: dateLocale, day: "2-digit", month: "short" })}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_1fr] gap-2 px-4 py-2.5">
              <div>
                <p className="font-mono text-[0.5rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">{t("you")}</p>
                <p className={`font-display tabular text-lg ${samePick ? "text-[var(--color-success)]" : ""}`}>{myPick}</p>
                {isCompleto ? (
                  <p className="mt-0.5 truncate font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                    {t("scorerLabel")}: {mySco}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-mono text-[0.5rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">{oppName}</p>
                <p className={`font-display tabular text-lg ${samePick ? "text-[var(--color-success)]" : ""}`}>{oppPick}</p>
                {isCompleto ? (
                  <p className="mt-0.5 truncate font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
                    {t("scorerLabel")}: {oppSco}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─────────────────────────── Helpers visuales ───────────────────────────
function ComparisonCell({
  team,
  match,
  align = "start",
}: {
  team: Team | null;
  match: boolean;
  align?: "start" | "end";
}) {
  if (!team) {
    return <span className={`text-sm text-[var(--color-muted-foreground)] ${align === "end" ? "text-right" : ""}`}>—</span>;
  }
  return (
    <span className={`flex min-w-0 items-center gap-2 ${align === "end" ? "flex-row-reverse text-right" : ""}`}>
      <TeamFlag code={team.code} size={20} />
      <span className={`truncate text-sm ${match ? "font-semibold text-[var(--color-success)]" : "font-medium"}`}>{team.name}</span>
    </span>
  );
}

function PreKickoffTeaser({ opponentName, timeZone, locale }: { opponentName: string; timeZone: string; locale: string }) {
  const t = useTranslations("compare");
  const ms = Math.max(0, KICKOFF.getTime() - Date.now());
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))]">
      <div className="halftone pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden />
      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
            <Lock className="size-3" />
            {t("teaserPrivate")}
          </div>
          <h3 className="font-display text-3xl tracking-tight">
            {t.rich("teaserTitle", { name: opponentName, b: (chunks) => <span className="font-medium">{chunks}</span> })}
          </h3>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("teaserDesc", { date: formatDateTime(KICKOFF, { timeZone, locale }) })}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 lg:items-end lg:text-right">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">{t("teaserCountdownLabel")}</p>
          <p className="font-display tabular text-5xl leading-none tracking-tighter text-[var(--color-arena)] glow-arena sm:text-6xl">{formatRemaining(ms)}</p>
        </div>
      </div>
    </div>
  );
}
