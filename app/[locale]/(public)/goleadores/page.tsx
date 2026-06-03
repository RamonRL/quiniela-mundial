import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Crown, Target } from "lucide-react";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchScorers, players, teams } from "@/lib/db/schema";
import { TeamFlag } from "@/components/brand/team-flag";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { BrandCTA } from "@/components/seo/brand-cta";

// Goleadores cambia solo cuando un partido finaliza con goles. ISR a 60s
// es indistinguible de tiempo real para el usuario y elimina el hit a
// Postgres en cada visita.
export const revalidate = 60;

export const metadata = {
  title: { absolute: "Goleadores del Mundial 2026 — Bota de Oro en vivo · Quiniela Mundial" },
  description:
    "Tabla de goleadores del Mundial 2026: la Bota de Oro en directo, jugadores con más goles del torneo, ordenados por fase y selección.",
  alternates: { canonical: "/goleadores" },
  openGraph: {
    title: "Goleadores del Mundial 2026 · Quiniela Mundial",
    description: "Bota de Oro y tabla de máximos goleadores del Mundial 2026.",
    url: "/goleadores",
  },
};

export default async function ScorersPage() {
  const t = await getTranslations("scorersPage");
  const tt = await getTranslations("tournament");
  const rows = await db
    .select({
      playerId: matchScorers.playerId,
      goals: sql<number>`count(*)::int`,
      teamId: sql<number>`max(${matchScorers.teamId})::int`,
    })
    .from(matchScorers)
    .where(sql`${matchScorers.isOwnGoal} = false`)
    .groupBy(matchScorers.playerId)
    .orderBy(sql`count(*) desc`);

  const playerIds = rows.map((r) => r.playerId);
  const teamIds = Array.from(new Set(rows.map((r) => r.teamId)));
  const [playerRows, teamRows] = await Promise.all([
    playerIds.length > 0
      ? db.select().from(players).where(inArray(players.id, playerIds))
      : Promise.resolve([]),
    teamIds.length > 0
      ? db.select().from(teams).where(inArray(teams.id, teamIds))
      : Promise.resolve([]),
  ]);
  const playerById = new Map(playerRows.map((p) => [p.id, p]));
  const teamById = new Map(teamRows.map((t) => [t.id, t]));

  const totalGoals = rows.reduce((s, r) => s + r.goals, 0);
  const topGoals = rows[0]?.goals ?? 0;

  return (
    <div className="space-y-8">
      <BreadcrumbLD
        items={[
          { name: tt("home"), href: "/" },
          { name: t("breadcrumb"), href: "/goleadores" },
        ]}
      />
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("desc")}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Target className="size-5" />}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <SummaryStat label={t("statScorers")} value={rows.length.toString()} />
            <SummaryStat label={t("statTotalGoals")} value={totalGoals.toString()} accent />
            <SummaryStat label={t("statTop")} value={topGoals.toString()} hint={t("statTopHint")} />
          </section>

          <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <header className="hidden grid-cols-[56px_1fr_56px] items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] sm:grid">
              <span>{t("thPos")}</span>
              <span>{t("thPlayer")}</span>
              <span className="text-right">{t("thGoals")}</span>
            </header>
            <ul>
              {rows.map((r, i) => {
                const player = playerById.get(r.playerId);
                const team = teamById.get(r.teamId);
                const position = i + 1;
                const podium = position === 1 ? "gold" : position === 2 ? "silver" : position === 3 ? "bronze" : null;
                return (
                  <li
                    key={r.playerId}
                    className={`flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0 sm:grid sm:grid-cols-[56px_1fr_56px] ${
                      position === 1
                        ? "bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)]"
                        : ""
                    }`}
                  >
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={`font-display tabular text-2xl ${
                          podium === "gold"
                            ? "text-[var(--color-arena)] glow-arena"
                            : podium === "silver"
                              ? "text-[var(--color-foreground)]"
                              : podium === "bronze"
                                ? "text-[var(--color-foreground)]/80"
                                : "text-[var(--color-muted-foreground)]"
                        }`}
                      >
                        {position.toString().padStart(2, "0")}
                      </span>
                      {podium === "gold" ? (
                        <Crown className="size-3.5 text-[var(--color-arena)]" />
                      ) : null}
                    </span>
                    <span className="flex min-w-0 items-center gap-3">
                      {team ? (
                        <Link
                          href={`/equipos/${team.code}`}
                          aria-label={team.name}
                          className="shrink-0 transition hover:scale-105"
                        >
                          <TeamFlag code={team.code} size={28} />
                        </Link>
                      ) : (
                        <TeamFlag code={undefined} size={28} />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-display text-base tracking-tight">
                          {player?.name ?? "—"}
                        </span>
                        <span className="block truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                          {team ? (
                            <Link
                              href={`/equipos/${team.code}`}
                              className="hover:text-[var(--color-arena)]"
                            >
                              {team.code}
                              {team.name ? ` · ${team.name}` : ""}
                            </Link>
                          ) : (
                            "—"
                          )}
                          {player?.position ? ` · ${player.position}` : ""}
                        </span>
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-display tabular text-3xl tracking-tight sm:text-right ${
                        podium === "gold" ? "text-[var(--color-arena)] glow-arena" : ""
                      }`}
                    >
                      {r.goals}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <BrandCTA hint={t("ctaHint")} />
    </div>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
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
        className={`mt-2 font-display tabular text-4xl tracking-tight ${
          accent ? "text-[var(--color-arena)] glow-arena" : ""
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}
