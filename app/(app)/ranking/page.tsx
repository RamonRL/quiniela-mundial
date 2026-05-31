import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Crown, Globe2, ListOrdered, Medal } from "lucide-react";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueDepartments, leagues } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, PREDICTION_MODES, PREDICTION_MODE_META } from "@/lib/leagues";
import { loadLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";
import { RankingTabs } from "./ranking-tabs";
import { initials } from "@/lib/utils";

export const metadata = { title: "Ranking" };

export default async function RankingPage() {
  const me = await requireUser();
  const leagueId = (await currentLeagueId(me))!;
  // Las quinielas públicas no tienen ranking propio: redirigimos al ranking
  // global del modo de esa pública.
  const [activeLeague] = await db
    .select({ isPublic: leagues.isPublic, predictionMode: leagues.predictionMode })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (activeLeague?.isPublic) {
    redirect(`/ranking/global/${activeLeague.predictionMode}`);
  }
  // Si la liga tiene ≥1 departamento creado, exponemos los tabs
  // "Individuales / Departamentos" en la cabecera. Si no hay
  // departamentos (o liga pública / free), no se muestra nada — el
  // patrón sigue siendo el ranking individual a pelo.
  const [deptCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(leagueDepartments)
    .where(eq(leagueDepartments.leagueId, leagueId));
  const hasDepartments = (deptCount?.c ?? 0) > 0;
  // Una sola query agregada en SQL — antes traíamos todos los profiles +
  // todo points_ledger y procesábamos en JS, lo que escalaba mal en la
  // liga pública.
  const ranked = await loadLeaderboard(leagueId, { withChampionCorrect: true });

  const myEntry = ranked.find((r) => r.userId === me.id) ?? null;
  const myIndex = ranked.findIndex((r) => r.userId === me.id);
  const leader = ranked[0] ?? null;
  const lead = leader ? leader.totalPoints - (myEntry?.totalPoints ?? 0) : 0;

  if (ranked.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Quiniela"
          title="Clasificación general"
          description="Quien mejor lea el torneo, gana."
        />
        <EmptyState
          icon={<ListOrdered className="size-5" />}
          title="Sin participantes todavía"
          description="Comparte el código y empieza la batalla."
        />
      </div>
    );
  }

  const allZero = ranked.every((r) => r.totalPoints === 0);
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Quiniela"
        title="Clasificación general"
        description="Quien mejor lea el torneo, gana."
      />

      {hasDepartments ? <RankingTabs active="individual" /> : null}

      {/* Accesos directos a los rankings globales por modo. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Rankings globales:
        </span>
        {PREDICTION_MODES.map((m) => (
          <Link
            key={m}
            href={`/ranking/global/${m}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-foreground)] transition hover:border-[var(--color-arena)]/40 hover:text-[var(--color-arena)]"
          >
            <Globe2 className="size-3" />
            {PREDICTION_MODE_META[m].label}
          </Link>
        ))}
      </div>

      {allZero ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/60 px-4 py-3 text-center font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          Sin resultados aún. El primer pitido lo cambia todo.
        </div>
      ) : null}

      {/* Podium · DOM order [#1, #2, #3] (mobile stack natural). En sm+
          aplicamos sm:order-{1,2,3} a [#2, #1, #3] respectivamente y
          sm:items-end para que las alturas escalonadas alineen al base. */}
      <section className="grid items-end gap-3 sm:grid-cols-3">
        {top3.map((p, i) => {
          const position = i + 1;
          if (!p) {
            return (
              <div
                key={`empty-${position}`}
                className={`rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 ${
                  position === 1
                    ? "h-48 sm:order-2"
                    : position === 2
                      ? "h-40 sm:order-1"
                      : "h-36 sm:order-3"
                }`}
              />
            );
          }
          return (
            <PodiumCard
              key={p.userId}
              position={position}
              entry={p}
              isMe={p.userId === me.id}
            />
          );
        })}
      </section>

      {/* My status — sólo cuando NO estoy en el podio. Si ya estoy en
          top-3, mi tarjeta ya brilla arriba; redundancia evitada. */}
      {myEntry && myIndex >= 3 ? (
        <Link
          href={`/ranking/${me.id}`}
          className="group flex items-center justify-between gap-4 rounded-xl border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-4 transition hover:border-[var(--color-arena)]"
        >
          <div className="flex items-center gap-4">
            <span className="font-display text-5xl tabular text-[var(--color-arena)] glow-arena">
              #{(myIndex + 1).toString().padStart(2, "0")}
            </span>
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                Tu posición
              </p>
              <p className="font-display text-xl tracking-tight">
                {myEntry.nickname || myEntry.email.split("@")[0]}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              A {lead} del líder
            </p>
            <p className="font-display text-3xl tabular">{myEntry.totalPoints}</p>
          </div>
        </Link>
      ) : null}

      {/* Rest of the leaderboard */}
      {rest.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-px w-6 bg-[var(--color-arena)]" />
            <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Posiciones · 4 y siguientes
            </h2>
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="grid grid-cols-[56px_1fr_72px_56px_56px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] sm:grid-cols-[56px_1fr_72px_64px_64px]">
              <span>Pos</span>
              <span>Participante</span>
              <span className="text-right">Pts</span>
              <span className="hidden text-right sm:inline">Ex.</span>
              <span className="hidden text-right sm:inline">KO</span>
            </div>
            <ul>
              {rest.map((r, i) => {
                const position = i + 4;
                const isMe = r.userId === me.id;
                const display = r.nickname || r.email.split("@")[0];
                return (
                  <li key={r.userId}>
                    <Link
                      href={`/ranking/${r.userId}`}
                      className={`grid grid-cols-[56px_1fr_72px] items-center gap-2 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0 transition hover:bg-[var(--color-surface-2)] sm:grid-cols-[56px_1fr_72px_64px_64px] ${
                        isMe
                          ? "bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)]"
                          : ""
                      }`}
                    >
                      <span className="font-display text-2xl tabular text-[var(--color-muted-foreground)]">
                        {position.toString().padStart(2, "0")}
                      </span>
                      <span className="flex items-center gap-3 truncate">
                        <Avatar className="size-8 border border-[var(--color-border)]">
                          {r.avatarUrl ? <AvatarImage src={r.avatarUrl} alt="" /> : null}
                          <AvatarFallback>{initials(display)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm font-medium">{display}</span>
                        {isMe ? (
                          <Badge variant="default" className="ml-1">
                            Tú
                          </Badge>
                        ) : null}
                      </span>
                      <span className="text-right font-display tabular text-xl">
                        {r.totalPoints}
                      </span>
                      <span className="hidden text-right text-sm tabular text-[var(--color-muted-foreground)] sm:inline">
                        {r.exactScoresCount}
                      </span>
                      <span className="hidden text-right text-sm tabular text-[var(--color-muted-foreground)] sm:inline">
                        {r.knockoutPoints}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

type PodiumEntry = LeaderboardEntry;

const PODIUM_LAYOUT: Record<
  number,
  {
    order: string;
    height: string;
    border: string;
    accent: string;
    icon: typeof Crown;
    iconClass: string;
    medalRing: string;
    label: string;
  }
> = {
  1: {
    order: "sm:order-2",
    height: "sm:min-h-[23rem]",
    border:
      "border-[var(--color-arena)]/60 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))]",
    accent: "text-[var(--color-arena)] glow-arena",
    icon: Crown,
    iconClass: "text-[var(--color-arena)]",
    medalRing: "ring-4 ring-[var(--color-arena)]",
    label: "Oro",
  },
  2: {
    order: "sm:order-1",
    height: "sm:min-h-[20rem]",
    border:
      "border-[var(--color-border-strong)] bg-[color-mix(in_oklch,var(--color-foreground)_3%,var(--color-surface))]",
    accent: "text-[var(--color-foreground)]",
    icon: Medal,
    iconClass: "text-[var(--color-foreground)]/70",
    medalRing: "ring-2 ring-[var(--color-border-strong)]",
    label: "Plata",
  },
  3: {
    order: "sm:order-3",
    height: "sm:min-h-[18.5rem]",
    border: "border-[var(--color-border)] bg-[var(--color-surface)]",
    accent: "text-[color-mix(in_oklch,var(--color-arena)_50%,var(--color-muted-foreground))]",
    icon: Award,
    iconClass:
      "text-[color-mix(in_oklch,var(--color-arena)_50%,var(--color-muted-foreground))]",
    medalRing:
      "ring-2 ring-[color-mix(in_oklch,var(--color-arena)_40%,var(--color-border-strong))]",
    label: "Bronce",
  },
};

function PodiumCard({
  position,
  entry,
  isMe,
}: {
  position: number;
  entry: PodiumEntry;
  isMe: boolean;
}) {
  const layout = PODIUM_LAYOUT[position]!;
  const Icon = layout.icon;
  const display = entry.nickname || entry.email.split("@")[0];
  // Avatares dimensionados por posición — el #1 dominante, decreciendo
  // en plata y bronce. La posición vive arriba a la izquierda como número
  // grande; el avatar va centrado horizontalmente para ser el foco visual.
  const avatarSize =
    position === 1
      ? "size-32 sm:size-40"
      : position === 2
        ? "size-28 sm:size-32"
        : "size-24 sm:size-28";
  const positionSize =
    position === 1 ? "text-6xl sm:text-7xl" : "text-5xl sm:text-6xl";
  const nameSize =
    position === 1 ? "text-xl sm:text-2xl" : "text-lg sm:text-xl";
  const pointsSize = position === 1 ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl";

  return (
    <Link
      href={`/ranking/${entry.userId}`}
      className={`group relative flex flex-col overflow-hidden rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elev-2)] ${layout.order} ${layout.height} ${layout.border} ${
        isMe ? "ring-2 ring-[var(--color-arena)]/40 ring-offset-2 ring-offset-[var(--color-bg)]" : ""
      }`}
    >
      {position === 1 ? (
        <div
          className="halftone pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
        />
      ) : null}

      {/* Posición · esquina superior izquierda */}
      <span
        className={`relative font-display leading-none tabular ${positionSize} ${layout.accent}`}
      >
        {position}
      </span>

      {/* Medalla + label · esquina superior derecha (absolute) */}
      <div className="absolute right-4 top-4 flex flex-col items-end gap-1">
        <Icon className={`size-6 ${layout.iconClass}`} />
        <span
          className={`font-mono text-[0.55rem] uppercase tracking-[0.28em] ${layout.iconClass}`}
        >
          {layout.label}
        </span>
      </div>

      {/* Avatar protagonista · centrado en el cuerpo de la tarjeta */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-3 py-3">
        <Avatar
          className={`${avatarSize} border-2 border-[var(--color-border-strong)] ${layout.medalRing}`}
        >
          {entry.avatarUrl ? <AvatarImage src={entry.avatarUrl} alt="" /> : null}
          <AvatarFallback className="font-display text-3xl tracking-tight">
            {initials(display)}
          </AvatarFallback>
        </Avatar>
        <div className="px-2 text-center">
          <p className={`truncate font-display tracking-tight ${nameSize}`}>
            {display}
          </p>
          {isMe ? (
            <p className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
              Tú
            </p>
          ) : null}
        </div>
      </div>

      {/* Footer · puntos + sub-stats */}
      <div className="relative flex items-end justify-between gap-2 border-t border-dashed border-[var(--color-border)] pt-3">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
            Puntos
          </p>
          <p
            className={`font-display tabular tracking-tight ${pointsSize} ${layout.accent}`}
          >
            {entry.totalPoints}
          </p>
        </div>
        <div className="text-right font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          <p>{entry.exactScoresCount} exactos</p>
          <p>{entry.knockoutPoints} en KO</p>
        </div>
      </div>
    </Link>
  );
}
