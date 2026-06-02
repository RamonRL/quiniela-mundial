import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Crown,
  Footprints,
  Layers,
  Medal,
  Network,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pointsLedger, profiles } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { compareForRanking } from "@/lib/scoring/tiebreaker";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, inLeagueFilter } from "@/lib/leagues";
import { loadActivityFeed } from "@/lib/activity-feed";
import { formatDate, formatDateTime, initials } from "@/lib/utils";

const KNOCKOUT_SOURCES = [
  "bracket_slot",
  "knockout_qualifier",
  "knockout_pens_bonus",
  "knockout_score_90",
] as const;

type CategoryGroup = {
  key: string;
  label: string;
  description: string;
  sources: string[];
  icon: typeof Target;
};

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    key: "match",
    label: "Marcadores",
    description: "Resultados exactos y ganador del partido.",
    sources: ["match_exact_score", "match_outcome"],
    icon: Target,
  },
  {
    key: "scorer",
    label: "Goleadores del partido",
    description: "Quién marca y quién abre el partido.",
    sources: ["match_scorer", "match_first_scorer"],
    icon: Footprints,
  },
  {
    key: "group",
    label: "Fase de grupos",
    description: "Posiciones finales de los 12 grupos.",
    sources: ["group_position", "group_top2_swap"],
    icon: Layers,
  },
  {
    key: "bracket",
    label: "Bracket",
    description: "Equipos que avanzan en cada ronda y resultados de eliminatoria.",
    sources: [
      "bracket_slot",
      "knockout_qualifier",
      "knockout_pens_bonus",
      "knockout_score_90",
    ],
    icon: Network,
  },
  {
    key: "topScorer",
    label: "Bota de Oro",
    description: "Goleador del torneo.",
    sources: ["tournament_top_scorer"],
    icon: Crown,
  },
  {
    key: "special",
    label: "Especiales",
    description: "Predicciones especiales del torneo.",
    sources: ["special_prediction"],
    icon: Sparkles,
  },
];

type PodiumStyle = {
  ringClass: string;
  badgeBg: string;
  badgeIcon: typeof Crown;
  badgeLabel: string;
  glowClass: string;
};

const PODIUM: Record<number, PodiumStyle> = {
  0: {
    ringClass: "ring-4 ring-[var(--color-arena)]",
    badgeBg: "bg-[var(--color-arena)] text-white",
    badgeIcon: Crown,
    badgeLabel: "Líder",
    glowClass: "shadow-[0_0_60px_-10px_color-mix(in_oklch,var(--color-arena)_70%,transparent)]",
  },
  1: {
    ringClass: "ring-4 ring-[var(--color-border-strong)]",
    badgeBg: "bg-[var(--color-surface-2)] text-[var(--color-foreground)] border border-[var(--color-border-strong)]",
    badgeIcon: Medal,
    badgeLabel: "Plata",
    glowClass: "",
  },
  2: {
    ringClass:
      "ring-4 ring-[color-mix(in_oklch,var(--color-arena)_30%,var(--color-border))]",
    badgeBg:
      "bg-[color-mix(in_oklch,var(--color-arena)_15%,var(--color-surface-2))] text-[color-mix(in_oklch,var(--color-arena)_60%,var(--color-foreground))] border border-[color-mix(in_oklch,var(--color-arena)_25%,var(--color-border))]",
    badgeIcon: Award,
    badgeLabel: "Bronce",
    glowClass: "",
  },
};

export const metadata = { title: "Detalle de participante" };

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const me = await requireUser();
  const { userId } = await params;
  const leagueId = await currentLeagueId(me);

  const [user] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (!user) notFound();
  if (
    me.role !== "admin" &&
    leagueId != null &&
    user.leagueId !== leagueId &&
    user.role !== "admin"
  ) {
    notFound();
  }

  const filter = inLeagueFilter(leagueId);
  const [allUsers, allLedger, theirLedger] = await Promise.all([
    filter
      ? db.select().from(profiles).where(filter)
      : db.select().from(profiles),
    leagueId != null
      ? db.select().from(pointsLedger).where(eq(pointsLedger.leagueId, leagueId))
      : Promise.resolve([] as (typeof pointsLedger.$inferSelect)[]),
    leagueId != null
      ? db
          .select()
          .from(pointsLedger)
          .where(
            and(
              eq(pointsLedger.userId, userId),
              eq(pointsLedger.leagueId, leagueId),
            ),
          )
          .orderBy(desc(pointsLedger.computedAt))
      : Promise.resolve([] as (typeof pointsLedger.$inferSelect)[]),
  ]);

  const stats = new Map<
    string,
    {
      totalPoints: number;
      exactScoresCount: number;
      knockoutPoints: number;
      championCorrect: boolean;
    }
  >();
  for (const u of allUsers) {
    stats.set(u.id, {
      totalPoints: 0,
      exactScoresCount: 0,
      knockoutPoints: 0,
      championCorrect: false,
    });
  }
  for (const e of allLedger) {
    const s = stats.get(e.userId);
    if (!s) continue;
    s.totalPoints += e.points;
    if (e.source === "match_exact_score" || e.source === "knockout_score_90") {
      s.exactScoresCount += 1;
    }
    if ((KNOCKOUT_SOURCES as readonly string[]).includes(e.source)) {
      s.knockoutPoints += e.points;
    }
  }
  const ranked = allUsers
    .map((u) => ({
      user: u,
      ...(stats.get(u.id) ?? {
        totalPoints: 0,
        exactScoresCount: 0,
        knockoutPoints: 0,
        championCorrect: false,
      }),
    }))
    .sort((a, b) =>
      compareForRanking({ userId: a.user.id, ...a }, { userId: b.user.id, ...b }),
    );
  const idx = ranked.findIndex((r) => r.user.id === userId);
  const myStats = stats.get(userId) ?? {
    totalPoints: 0,
    exactScoresCount: 0,
    knockoutPoints: 0,
    championCorrect: false,
  };
  const leaderPoints = ranked[0]?.totalPoints ?? 0;
  const lead = leaderPoints - myStats.totalPoints;
  const leaderPct =
    leaderPoints > 0 ? Math.min(100, Math.round((myStats.totalPoints / leaderPoints) * 100)) : 0;

  const byCategory = new Map<string, { count: number; total: number }>();
  for (const e of theirLedger) {
    const existing = byCategory.get(e.source) ?? { count: 0, total: 0 };
    existing.count += 1;
    existing.total += e.points;
    byCategory.set(e.source, existing);
  }

  const recent =
    leagueId != null ? await loadActivityFeed(userId, leagueId, 12) : [];

  const display = user.nickname || user.email.split("@")[0];
  const isMe = user.id === me.id;
  const podium = idx >= 0 && idx <= 2 ? PODIUM[idx] : null;
  const PodiumIcon = podium?.badgeIcon;

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
        <Link href="/ranking">
          <ArrowLeft />
          Volver al ranking
        </Link>
      </Button>

      {/* HERO ─────────────────────────────────────────────────── */}
      <section
        className={`relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] ${
          podium?.glowClass ?? ""
        }`}
      >
        <div
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
          aria-hidden
        />
        {idx === 0 ? (
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] via-transparent to-transparent"
            aria-hidden
          />
        ) : null}

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:gap-10">
          {/* Avatar + identity */}
          <div className="flex flex-col items-center gap-4 lg:items-start">
            <div className="relative">
              <Avatar
                className={`size-32 border-2 border-[var(--color-border-strong)] sm:size-40 ${
                  podium?.ringClass ?? ""
                } ring-offset-2 ring-offset-[var(--color-surface)]`}
              >
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                <AvatarFallback className="font-display text-4xl tracking-tight">
                  {initials(display)}
                </AvatarFallback>
              </Avatar>
              {podium && PodiumIcon ? (
                <span
                  className={`absolute -bottom-1 -right-1 flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] ${podium.badgeBg}`}
                >
                  <PodiumIcon className="size-3" />
                  {podium.badgeLabel}
                </span>
              ) : null}
            </div>

            <div className="text-center lg:text-left">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                Participante
              </p>
              <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
                {display}
              </h1>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                {isMe ? <Badge variant="default">Tú</Badge> : null}
                {user.role === "admin" ? (
                  <Badge variant="outline" className="gap-1">
                    <ShieldCheck className="size-3" />
                    Admin
                  </Badge>
                ) : null}
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                  Alta {formatDate(user.createdAt, { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Score block */}
          <div className="flex flex-col justify-between gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))] p-5">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                  Puntos totales
                </p>
                <p className="mt-1 font-display tabular text-6xl tracking-tight text-[var(--color-arena)] glow-arena sm:text-7xl">
                  {myStats.totalPoints}
                </p>
                <p className="mt-1 font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                  {theirLedger.length === 0
                    ? "Sin entradas en el ledger todavía."
                    : `${theirLedger.length} ${theirLedger.length === 1 ? "entrada" : "entradas"} en el ledger`}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                  Posición
                </p>
                <p className="mt-1 font-display tabular text-6xl tracking-tight sm:text-7xl">
                  {idx >= 0 ? `#${(idx + 1).toString().padStart(2, "0")}` : "—"}
                  <span className="ml-1 font-display text-2xl tabular text-[var(--color-muted-foreground)]">
                    / {ranked.length}
                  </span>
                </p>
                <p className="mt-1 font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                  {idx === 0
                    ? "Líder de la clasificación."
                    : idx > 0
                      ? `A ${lead} ${lead === 1 ? "punto" : "puntos"} del líder.`
                      : "Sin clasificar."}
                </p>
              </div>
            </div>

            {idx > 0 && leaderPoints > 0 ? (
              <div>
                <div className="flex items-center justify-between font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
                  <span>Distancia al líder</span>
                  <span className="text-[var(--color-arena)]">{leaderPct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-arena)] transition-all"
                    style={{ width: `${leaderPct}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-3">
              <SubStat label="Marcadores ex." value={myStats.exactScoresCount} />
              <SubStat label="Pts en KO" value={myStats.knockoutPoints} />
              <SubStat label="Aciertos" value={theirLedger.length} />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY BREAKDOWN ──────────────────────────────────── */}
      <section className="space-y-3">
        <header className="flex items-center gap-3">
          <span className="h-px w-6 bg-[var(--color-arena)]" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Desglose por categoría
          </h2>
          <span className="h-px flex-1 bg-[var(--color-border)]" />
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_GROUPS.map((g) => {
            const total = g.sources.reduce(
              (acc, s) => acc + (byCategory.get(s)?.total ?? 0),
              0,
            );
            const count = g.sources.reduce(
              (acc, s) => acc + (byCategory.get(s)?.count ?? 0),
              0,
            );
            const pct =
              myStats.totalPoints > 0
                ? Math.round((total / myStats.totalPoints) * 100)
                : 0;
            const Icon = g.icon;
            const earned = total > 0;
            return (
              <article
                key={g.key}
                className={`rounded-xl border p-4 transition ${
                  earned
                    ? "border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_3%,var(--color-surface))]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]"
                }`}
              >
                <header className="flex items-start justify-between gap-3">
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg border ${
                      earned
                        ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface-2))] text-[var(--color-arena)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-display tabular text-3xl leading-none ${
                        earned
                          ? "text-[var(--color-arena)] glow-arena"
                          : "text-[var(--color-muted-foreground)]"
                      }`}
                    >
                      {earned ? `+${total}` : "0"}
                    </p>
                    <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {count} {count === 1 ? "acierto" : "aciertos"}
                    </p>
                  </div>
                </header>
                <div className="mt-3">
                  <h3 className="font-display text-lg tracking-tight">{g.label}</h3>
                  <p className="mt-0.5 font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                    {g.description}
                  </p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-arena)]/80 transition-all"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <p className="mt-1 text-right font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                  {earned ? `${pct}% del total` : "Sin puntos aún"}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* RECENT ACTIVITY ─────────────────────────────────────── */}
      {recent.length > 0 ? (
        <section className="space-y-3">
          <header className="flex items-center gap-3">
            <span className="h-px w-6 bg-[var(--color-arena)]" />
            <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Aciertos recientes
            </h2>
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </header>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <ul>
              {recent.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.label}</p>
                    <p className="truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {a.detail ??
                        formatDateTime(a.computedAt, { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <span className="font-display tabular text-2xl text-[var(--color-arena)] glow-arena">
                    +{a.points}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SubStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-0.5 font-display tabular text-2xl tracking-tight">{value}</p>
    </div>
  );
}
