import { TeamFlag } from "@/components/brand/team-flag";
import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { localizeTeams } from "@/lib/team-names";
import { matches, predBracketSlot, teams } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { Swords, Trophy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";
import { formatDateTime } from "@/lib/utils";
import { intlLocale } from "@/lib/timezone";
import { getBracketStatus } from "@/lib/bracket-state";
import { BracketTree, type BracketMatch } from "@/components/bracket/bracket-tree";
import { KO_FEEDS, R32_SLOTS, formatSlotSource } from "@/lib/bracket-format";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { BrandCTA } from "@/components/seo/brand-cta";

export const metadata = {
  title: { absolute: "Bracket del Mundial 2026 — eliminatorias R32 a final · Quiniela Mundial" },
  description:
    "Bracket FIFA del Mundial 2026: dieciseisavos, octavos, cuartos, semifinales y final. Cuadro de eliminación directa con 32 selecciones.",
  alternates: { canonical: "/bracket" },
  openGraph: {
    title: "Bracket del Mundial 2026 · Quiniela Mundial",
    description:
      "Cuadro de la fase eliminatoria del Mundial 2026 con las 32 selecciones que avanzan desde grupos.",
    url: "/bracket",
  },
};

const STAGE_LABEL_KEY = {
  r32: "stR32",
  r16: "stR16",
  qf: "stQf",
  sf: "stSf",
  third: "stThird",
  final: "stFinal",
} as const;

const KO_STAGES = ["r32", "r16", "qf", "sf", "final", "third"] as const;
type KoStage = (typeof KO_STAGES)[number];

export default async function BracketPage() {
  const locale = await getLocale();
  const dateLocale = intlLocale(locale);
  const t = await getTranslations("bracketPage");
  const tt = await getTranslations("tournament");
  const me = await getCurrentUser();
  const leagueId = me ? await currentLeagueId(me) : null;
  const [koMatches, bracketStatus] = await Promise.all([
    db
      .select()
      .from(matches)
      .where(inArray(matches.stage, [...KO_STAGES] as KoStage[]))
      .orderBy(asc(matches.scheduledAt)),
    getBracketStatus(),
  ]);

  const teamIds = koMatches
    .flatMap((m) => [m.homeTeamId, m.awayTeamId, m.winnerTeamId])
    .filter((x): x is number => x != null);
  const allTeams =
    teamIds.length > 0
      ? await db.select().from(teams).where(inArray(teams.id, teamIds))
      : [];
  const teamById = new Map(localizeTeams(allTeams, locale).map((t) => [t.id, t]));

  const myPreds =
    me && leagueId != null
      ? await db
          .select()
          .from(predBracketSlot)
          .where(
            and(eq(predBracketSlot.userId, me.id), eq(predBracketSlot.leagueId, leagueId)),
          )
      : [];

  const myByStage = new Map<string, Set<number>>();
  for (const p of myPreds) {
    if (!p.predictedTeamId) continue;
    if (p.stage === "final" && p.slotPosition === 0) continue;
    const set = myByStage.get(p.stage) ?? new Set<number>();
    set.add(p.predictedTeamId);
    myByStage.set(p.stage, set);
  }
  const myChampion =
    myPreds.find((m) => m.stage === "final" && m.slotPosition === 0)?.predictedTeamId ?? null;

  if (koMatches.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("emptyHeaderDesc")}
        />
        <EmptyState
          icon={<Swords className="size-5" />}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      </div>
    );
  }

  const isPreview = bracketStatus.state === "waiting";

  // Build matches map for the BracketTree component
  const treeMap = new Map<string, BracketMatch>();
  for (const m of koMatches) {
    const home = m.homeTeamId ? teamById.get(m.homeTeamId) ?? null : null;
    const away = m.awayTeamId ? teamById.get(m.awayTeamId) ?? null : null;
    treeMap.set(m.code, {
      id: m.id,
      code: m.code,
      scheduledAt: m.scheduledAt,
      homeTeam: home
        ? { id: home.id, code: home.code, name: home.name, flagUrl: home.flagUrl }
        : null,
      awayTeam: away
        ? { id: away.id, code: away.code, name: away.name, flagUrl: away.flagUrl }
        : null,
      winnerTeamId: m.winnerTeamId ?? null,
      homeScore: m.homeScore ?? null,
      awayScore: m.awayScore ?? null,
      status: m.status,
      wentToPens: m.wentToPens,
      homeScorePen: m.homeScorePen ?? null,
      awayScorePen: m.awayScorePen ?? null,
    });
  }

  const myPicks = {
    r16: myByStage.get("r16") ?? new Set<number>(),
    qf: myByStage.get("qf") ?? new Set<number>(),
    sf: myByStage.get("sf") ?? new Set<number>(),
    finalists: myByStage.get("final") ?? new Set<number>(),
    championTeamId: myChampion,
  };

  return (
    // El árbol mide ~1080px. En max-w-6xl (1152px) cabe holgado. En PC
    // (lg+) aplicamos `-mx-10` (=-2.5rem cada lado, +80px total = +7%)
    // para ganar anchura de visualización; los breakpoints xl/2xl ya no
    // necesitan ajuste propio porque heredan el de lg.
    <div className="space-y-8 lg:-mx-10">
      <BreadcrumbLD
        items={[
          { name: tt("home"), href: "/" },
          { name: t("breadcrumb"), href: "/bracket" },
        ]}
      />
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={isPreview ? t("descPreview") : t("descLive")}
        actions={
          me ? (
            <Link
              href="/predicciones/bracket"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-foreground)] transition hover:border-[var(--color-arena)]/50"
            >
              {t("editBracket")}
            </Link>
          ) : (
            <Link
              href="/login?next=%2Fpredicciones%2Fbracket"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[var(--shadow-arena)]"
            >
              {t("createBracket")}
            </Link>
          )
        }
      />

      {isPreview ? null : <Legend />}

      {/* Desktop tree — la anchura extra ya viene del wrapper de la
          página, así que aquí basta con mostrar/ocultar por breakpoint. */}
      <div className="hidden lg:block">
        <BracketTree matches={treeMap} myPicks={myPicks} />
      </div>

      {/* Mobile list fallback */}
      <div className="space-y-6 lg:hidden">
        {(["r32", "r16", "qf", "sf", "final", "third"] as const).map((stage) => {
          const stageMatches = koMatches.filter((m) => m.stage === stage);
          if (stageMatches.length === 0) return null;
          const myPicksHere = myByStage.get(stage) ?? new Set();
          return (
            <section key={stage} className="space-y-2">
              <h2 className="font-display text-2xl tracking-tight">
                {tt(STAGE_LABEL_KEY[stage])}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {stageMatches.map((m) => {
                  const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
                  const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
                  const homePh = mobilePlaceholder(stage, m.code, "home", tt);
                  const awayPh = mobilePlaceholder(stage, m.code, "away", tt);
                  return (
                    <Card key={m.id}>
                      <CardHeader className="flex flex-row items-center justify-between p-3">
                        <span className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
                          {m.code} ·{" "}
                          {formatDateTime(m.scheduledAt, {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            locale: dateLocale,
                          })}
                        </span>
                        <Badge
                          variant={
                            m.status === "finished"
                              ? "success"
                              : m.status === "live"
                                ? "warning"
                                : "outline"
                          }
                        >
                          {STATUS_LABEL_KEY[m.status] ? tt(STATUS_LABEL_KEY[m.status]) : m.status}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-1.5 p-3 pt-0">
                        <MobileTeamRow
                          team={home}
                          score={m.homeScore}
                          isWinner={m.winnerTeamId === m.homeTeamId}
                          isMyPick={home ? myPicksHere.has(home.id) : false}
                          placeholderLabel={homePh}
                        />
                        <MobileTeamRow
                          team={away}
                          score={m.awayScore}
                          isWinner={m.winnerTeamId === m.awayTeamId}
                          isMyPick={away ? myPicksHere.has(away.id) : false}
                          placeholderLabel={awayPh}
                        />
                        {m.wentToPens ? (
                          <p className="text-[0.65rem] text-[var(--color-muted-foreground)]">
                            {tt("pens", { h: m.homeScorePen ?? 0, a: m.awayScorePen ?? 0 })}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Champion strip — solo cuando hay sesión, en visitante mostramos
          un CTA distinto invitando a crear su propio bracket. */}
      {me ? (
        <section className="rounded-xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
                <Trophy className="size-5" />
              </span>
              <div>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                  {t("yourChampion")}
                </p>
                {myChampion && teamById.get(myChampion) ? (
                  <Link
                    href={`/equipos/${teamById.get(myChampion)!.code}`}
                    className="font-display text-3xl tracking-tight hover:text-[var(--color-arena)]"
                  >
                    {teamById.get(myChampion)!.name}
                  </Link>
                ) : (
                  <p className="font-display text-3xl tracking-tight">{t("notChosen")}</p>
                )}
              </div>
            </div>
            {myChampion && teamById.get(myChampion) ? (
              <Link
                href={`/equipos/${teamById.get(myChampion)!.code}`}
                aria-label={teamById.get(myChampion)!.name}
                className="shrink-0 transition hover:scale-105"
              >
                <TeamFlag code={teamById.get(myChampion)!.code} size={48} />
              </Link>
            ) : (
              <Link
                href="/predicciones/bracket"
                className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-arena)]"
              >
                {t("chooseChampion")}
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-8 text-center">
          <p className="font-display text-3xl tracking-tight">
            {t("whoLifts")}
          </p>
          <p className="pt-1 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("whoLiftsDesc")}
          </p>
          <Link
            href="/login?next=%2Fpredicciones%2Fbracket"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
          >
            {t("createBracket")}
          </Link>
        </section>
      )}

      <BrandCTA
        brandVariant="bare"
        hint={t("ctaHint")}
      />
    </div>
  );
}

function Legend() {
  const t = useTranslations("bracketPage");
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs text-[var(--color-muted-foreground)]">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-[var(--color-success)]" />
        {t("legendAdvanced")}
      </span>
      <span className="flex items-center gap-1.5 font-mono text-[0.7rem] text-[var(--color-arena)]">
        {t("legendPick")}
      </span>
      <span className="ml-auto hidden font-mono text-[0.6rem] uppercase tracking-[0.32em] sm:inline">
        {t("legendTap")}
      </span>
    </div>
  );
}

const STATUS_LABEL_KEY: Record<string, string> = {
  scheduled: "statusScheduled",
  live: "statusLive",
  finished: "statusFinal",
};

function MobileTeamRow({
  team,
  score,
  isWinner,
  isMyPick,
  placeholderLabel,
}: {
  team: { name: string; code: string; flagUrl: string | null } | null | undefined;
  score: number | null;
  isWinner: boolean;
  isMyPick: boolean;
  placeholderLabel?: string | null;
}) {
  const tt = useTranslations("tournament");
  const isPlaceholder = team == null;
  const label = team?.name ?? placeholderLabel ?? tt("tbd");
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 ${
        isWinner
          ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/10"
          : "border-transparent"
      }`}
    >
      {team ? (
        <Link
          href={`/equipos/${team.code}`}
          aria-label={team.name}
          className="flex min-w-0 items-center gap-2 hover:text-[var(--color-arena)]"
        >
          <TeamFlag code={team.code} size={20} />
          <span className="truncate text-sm font-medium">{label}</span>
          {isMyPick ? (
            <span className="font-mono text-[0.65rem] text-[var(--color-arena)]">●</span>
          ) : null}
        </Link>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <TeamFlag code={undefined} size={20} />
          <span
            className={
              isPlaceholder
                ? "truncate font-mono text-[0.7rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]"
                : "truncate text-sm font-medium"
            }
          >
            {label}
          </span>
        </div>
      )}
      <span className="font-display tabular text-base">
        {score != null ? score : "·"}
      </span>
    </div>
  );
}

function mobilePlaceholder(
  stage: keyof typeof STAGE_LABEL_KEY,
  code: string,
  side: "home" | "away",
  tt: (key: string, values?: Record<string, string | number>) => string,
): string | null {
  if (stage === "r32") {
    const slot = R32_SLOTS[code];
    if (!slot) return null;
    return formatSlotSource(side === "home" ? slot.home : slot.away);
  }
  const feed = KO_FEEDS[code];
  if (!feed) return null;
  const f = side === "home" ? feed.home : feed.away;
  return f.loser ? tt("loses", { code: f.code }) : tt("wins", { code: f.code });
}
