import Link from "next/link";
import { Edit3, Radio, Target } from "lucide-react";
import type { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TeamFlag } from "@/components/brand/team-flag";
import { PlayerAvatar } from "@/components/brand/player-avatar";

/** A translator bound to the `matchDetail` namespace. */
type Translator = Awaited<ReturnType<typeof getTranslations>>;

export type PickMode = "completo" | "marcador" | "solo_ganador";
export type PickState = "before" | "during" | "after";
export type WinnerSign = "home" | "draw" | "away";

export type PickTeam = {
  code: string | null;
  name: string | null;
  href?: string | null;
};

export type PickPlayer = {
  name: string;
  photoUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  teamCode?: string | null;
  teamHref?: string | null;
};

/** The user's prediction. */
export type Pick = {
  /** Score prediction (completo / marcador). */
  homeScore?: number | null;
  awayScore?: number | null;
  /** 1X2 sign (solo_ganador). */
  sign?: WinnerSign | null;
  willGoToPens?: boolean;
};

/** The actual outcome (during / after). */
export type PickResult = {
  homeScore?: number | null;
  awayScore?: number | null;
  /** Actual 1X2 sign, derived from the real score. */
  sign?: WinnerSign | null;
  /** Goals the predicted scorer actually scored in this match (completo). */
  scorerGoals?: number;
};

export type PointSource = {
  id: string | number;
  /** A label already resolved by the caller (e.g. via `sourceLabel(t, src)`). */
  label: string;
  points: number;
};

/** Points breakdown for the `after` state. */
export type PickPoints = {
  marker: PointSource[];
  scorer: PointSource[];
  /** Total = sum of every source. Provided explicitly so the caller controls rounding. */
  total: number;
};

export type PickPanelProps = {
  mode: PickMode;
  state: PickState;
  home: PickTeam | null;
  away: PickTeam | null;
  pick: Pick | null;
  result?: PickResult | null;
  points?: PickPoints | null;
  scorer?: PickPlayer | null;
  /** Link target for the "edit / predict" button (before state). */
  editHref?: string | null;
  t: Translator;
};

function signOf(home: number | null | undefined, away: number | null | undefined): WinnerSign | null {
  if (home == null || away == null) return null;
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

function sumPoints(sources: PointSource[] | undefined): number {
  return (sources ?? []).reduce((acc, s) => acc + s.points, 0);
}

/* ──────────────────────────────────────────────────────────────────────── */

export function PickPanel({
  mode,
  state,
  home,
  away,
  pick,
  result,
  points,
  scorer,
  editHref,
  t,
}: PickPanelProps) {
  const before = state === "before";
  const during = state === "during";
  const after = state === "after";

  const hasScore = pick?.homeScore != null && pick?.awayScore != null;
  const hasSign = pick?.sign != null;
  const hasPick = mode === "solo_ganador" ? hasSign : hasScore || scorer != null;

  const description = hasPick
    ? before
      ? t("pickEditableOpen")
      : after
        ? t("pickFinished")
        : t("pickLocked")
    : before
      ? t("pickNoneOpen")
      : t("pickNoneClosed");

  const total = points?.total ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{t("yourPick")}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          {during ? <LiveBadge t={t} /> : null}
          {after && hasPick ? <TotalEarned points={total} t={t} /> : null}
          {before && editHref ? (
            <Button asChild variant="outline" size="sm">
              <Link href={editHref}>
                <Edit3 className="size-3.5" />
                {hasPick ? t("edit") : t("predict")}
              </Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {mode === "solo_ganador" ? (
          <WinnerPick
            home={home}
            away={away}
            sign={pick?.sign ?? null}
            actualSign={result?.sign ?? signOf(result?.homeScore, result?.awayScore)}
            entries={points?.marker ?? []}
            totalPoints={sumPoints(points?.marker)}
            finished={after}
            t={t}
          />
        ) : (
          <div
            className={
              mode === "completo"
                ? "grid gap-3 lg:grid-cols-[1.4fr_1fr]"
                : "grid gap-3"
            }
          >
            <ScoreboardPick
              home={home}
              away={away}
              homeScore={pick?.homeScore ?? null}
              awayScore={pick?.awayScore ?? null}
              willGoToPens={pick?.willGoToPens ?? false}
              correct={
                after
                  ? matchSign(pick) != null && result?.sign != null
                    ? matchSign(pick) === result.sign
                    : null
                  : null
              }
              entries={points?.marker ?? []}
              totalPoints={sumPoints(points?.marker)}
              finished={after}
              hasPrediction={hasScore}
              t={t}
            />
            {mode === "completo" ? (
              <ScorerPick
                player={scorer ?? null}
                goalsScored={result?.scorerGoals ?? 0}
                entries={points?.scorer ?? []}
                totalPoints={sumPoints(points?.scorer)}
                finished={after}
                t={t}
              />
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function matchSign(pick: Pick | null): WinnerSign | null {
  return signOf(pick?.homeScore, pick?.awayScore);
}

/* ── Live marker ───────────────────────────────────────────────────────── */

function LiveBadge({ t }: { t: Translator }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
      <Radio className="size-3 animate-pulse" />
      {t("liveBadge")}
    </span>
  );
}

/* ── Total earned (header badge) ───────────────────────────────────────── */

function TotalEarned({ points, t }: { points: number; t: Translator }) {
  const positive = points > 0;
  return (
    <div
      className={`flex items-baseline gap-1 rounded-md border px-2.5 py-1.5 font-display tabular leading-none ${
        positive
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] text-[var(--color-arena)] glow-arena"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
      }`}
      title={t("totalEarnedTitle")}
    >
      {positive ? <span className="text-xs opacity-70">+</span> : null}
      <span className="text-xl">{points}</span>
      <span className="text-[0.55rem] uppercase tracking-[0.18em] opacity-70">
        {points === 1 ? t("pt") : t("pts")}
      </span>
    </div>
  );
}

/* ── Scoreboard (completo / marcador) ──────────────────────────────────── */

function ScoreboardPick({
  home,
  away,
  homeScore,
  awayScore,
  willGoToPens,
  correct,
  entries,
  totalPoints,
  finished,
  hasPrediction,
  t,
}: {
  home: PickTeam | null;
  away: PickTeam | null;
  homeScore: number | null;
  awayScore: number | null;
  willGoToPens: boolean;
  correct: boolean | null;
  entries: PointSource[];
  totalPoints: number;
  finished: boolean;
  hasPrediction: boolean;
  t: Translator;
}) {
  const noPick = homeScore == null || awayScore == null;
  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {t("scoreboardLabel")}
        </p>
        {finished && hasPrediction ? <PointsTag points={totalPoints} t={t} /> : null}
      </div>
      {noPick ? (
        <p className="font-display tabular text-2xl tracking-tight text-[var(--color-muted-foreground)]">
          {t("noPick")}
        </p>
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
          <ScoreboardSide team={home} align="end" t={t} />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Digit value={homeScore} />
            <span className="font-display text-2xl text-[var(--color-muted-foreground)]">
              –
            </span>
            <Digit value={awayScore} />
          </div>
          <ScoreboardSide team={away} align="start" t={t} />
        </div>
      )}
      {willGoToPens ? (
        <p className="text-center font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
          {t("plusPens")}
        </p>
      ) : null}
      {finished && hasPrediction && correct != null ? (
        <p className="border-t border-dashed border-[var(--color-border)] pt-2 text-center text-[0.7rem] text-[var(--color-muted-foreground)]">
          {correct ? `${t("winnerCorrect")} ✓` : `${t("winnerWrong")} ✗`}
        </p>
      ) : null}
      {finished && hasPrediction ? (
        <PointsBreakdown entries={entries} emptyLabel={t("noMarkerPoints")} />
      ) : null}
    </div>
  );
}

function Digit({ value }: { value: number }) {
  return (
    <span className="grid h-14 min-w-[3rem] place-items-center rounded-md border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_10%,transparent)] px-2 font-display tabular text-5xl leading-none tracking-tight text-[var(--color-arena)] glow-arena sm:h-16 sm:min-w-[3.5rem] sm:text-6xl">
      {value}
    </span>
  );
}

function ScoreboardSide({
  team,
  align,
  t,
}: {
  team: PickTeam | null;
  align: "start" | "end";
  t: Translator;
}) {
  const cls = align === "end" ? "items-end text-right" : "items-start text-left";
  const Wrapper: React.ElementType = team?.href ? Link : "div";
  const wrapperProps = team?.href
    ? { href: team.href, "aria-label": team.name ?? undefined }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={`flex min-w-0 flex-col gap-1 ${cls} ${
        team?.href ? "transition hover:text-[var(--color-arena)]" : ""
      }`}
    >
      <TeamFlag code={team?.code} size={28} />
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        {team?.code ?? "—"}
      </p>
      <p className="truncate font-display text-sm leading-tight">
        {team?.name ?? t("tbd")}
      </p>
    </Wrapper>
  );
}

/* ── Winner 1X2 (solo_ganador) ─────────────────────────────────────────── */

function WinnerPick({
  home,
  away,
  sign,
  actualSign,
  entries,
  totalPoints,
  finished,
  t,
}: {
  home: PickTeam | null;
  away: PickTeam | null;
  sign: WinnerSign | null;
  actualSign: WinnerSign | null;
  entries: PointSource[];
  totalPoints: number;
  finished: boolean;
  t: Translator;
}) {
  const hasPick = sign != null;
  const correct = finished && hasPick && actualSign != null ? sign === actualSign : null;

  const options: { key: WinnerSign; label: string }[] = [
    { key: "home", label: t("winsTeam", { team: home?.name ?? t("tbd") }) },
    { key: "draw", label: t("drawPick") },
    { key: "away", label: t("winsTeam", { team: away?.name ?? t("tbd") }) },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {t("winnerPickLabel")}
        </p>
        {finished && hasPick ? <PointsTag points={totalPoints} t={t} /> : null}
      </div>

      {hasPick ? (
        <div className="grid grid-cols-3 gap-2">
          {options.map((o) => {
            const chosen = o.key === sign;
            const code = o.key === "home" ? home?.code : o.key === "away" ? away?.code : null;
            return (
              <div
                key={o.key}
                className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition ${
                  chosen
                    ? "border-[var(--color-arena)]/50 bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] text-[var(--color-arena)] glow-arena"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] opacity-70"
                }`}
              >
                {o.key === "draw" ? (
                  <span
                    className={`grid size-7 place-items-center rounded-full border text-sm font-display tabular ${
                      chosen
                        ? "border-[var(--color-arena)]/50"
                        : "border-[var(--color-border)]"
                    }`}
                  >
                    X
                  </span>
                ) : (
                  <TeamFlag code={code} size={28} />
                )}
                <span
                  className={`text-[0.7rem] font-display leading-tight tracking-tight ${
                    chosen ? "" : ""
                  }`}
                >
                  {o.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="font-display tabular text-2xl tracking-tight text-[var(--color-muted-foreground)]">
          {t("noPick")}
        </p>
      )}

      {correct != null ? (
        <p className="border-t border-dashed border-[var(--color-border)] pt-2 text-center text-[0.7rem] text-[var(--color-muted-foreground)]">
          {correct ? `${t("winnerCorrect")} ✓` : `${t("winnerWrong")} ✗`}
        </p>
      ) : null}

      {finished && hasPick ? (
        <PointsBreakdown entries={entries} emptyLabel={t("noMarkerPoints")} />
      ) : null}
    </div>
  );
}

/* ── Scorer (completo) ─────────────────────────────────────────────────── */

function ScorerPick({
  player,
  goalsScored,
  entries,
  totalPoints,
  finished,
  t,
}: {
  player: PickPlayer | null;
  goalsScored: number;
  entries: PointSource[];
  totalPoints: number;
  finished: boolean;
  t: Translator;
}) {
  const hit = goalsScored > 0;
  return (
    <div
      className={`relative space-y-4 overflow-hidden rounded-xl border p-4 ${
        hit
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface-2))]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
      }`}
    >
      {hit ? (
        <>
          <div
            aria-hidden
            className="halftone pointer-events-none absolute inset-x-0 top-0 h-20 opacity-[0.06]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklch, var(--color-arena) 32%, transparent), transparent 70%)",
            }}
          />
        </>
      ) : null}

      <div className="relative flex items-baseline justify-between gap-2">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {t("scorerLabel")}
        </p>
        {finished && player ? <PointsTag points={totalPoints} t={t} /> : null}
      </div>

      {player ? (
        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <PlayerAvatar
              name={player.name}
              photoUrl={player.photoUrl}
              jerseyNumber={player.jerseyNumber}
              size={64}
              className={hit ? "border-[var(--color-arena)]/50" : ""}
            />
            {player.teamCode ? (
              <TeamBadgeChip code={player.teamCode} href={player.teamHref} name={player.name} />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`truncate font-display text-xl leading-tight tracking-tight sm:text-2xl ${
                hit ? "text-[var(--color-arena)] glow-arena" : ""
              }`}
            >
              {player.name}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {player.jerseyNumber != null ? (
                <span className="font-display tabular text-[0.75rem] text-[var(--color-foreground)]">
                  #{player.jerseyNumber}
                </span>
              ) : null}
              {player.teamCode ? <span>{player.teamCode}</span> : null}
              {player.position ? <span>· {player.position}</span> : null}
            </p>
            {hit ? (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_10%,transparent)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
                <Target className="size-2.5" />
                {t("scoredGoals", { count: goalsScored })}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="relative flex items-center gap-3 py-1">
          <span className="grid size-16 shrink-0 place-items-center rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]">
            <Target className="size-6" />
          </span>
          <div>
            <p className="font-display text-xl leading-tight tracking-tight text-[var(--color-muted-foreground)]">
              {t("noPick")}
            </p>
            <p className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {t("noScorerPick")}
            </p>
          </div>
        </div>
      )}

      {finished && player ? (
        <div className="relative">
          <PointsBreakdown entries={entries} emptyLabel={t("noGoalNoPoints")} />
        </div>
      ) : null}
    </div>
  );
}

function TeamBadgeChip({
  code,
  href,
  name,
}: {
  code: string;
  href?: string | null;
  name: string;
}) {
  const className =
    "absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-2 border-[var(--color-surface-2)] bg-[var(--color-surface)] shadow-[var(--shadow-elev-1)] transition hover:scale-110";
  if (href) {
    return (
      <Link href={href} aria-label={name} className={className}>
        <TeamFlag code={code} size={22} />
      </Link>
    );
  }
  return (
    <span className={className}>
      <TeamFlag code={code} size={22} />
    </span>
  );
}

/* ── Points tag + breakdown ────────────────────────────────────────────── */

function PointsTag({ points, t }: { points: number; t: Translator }) {
  const positive = points > 0;
  return (
    <span
      className={`inline-flex items-baseline gap-0.5 rounded font-display tabular leading-none ${
        positive
          ? "bg-[color-mix(in_oklch,var(--color-arena)_14%,transparent)] px-1.5 py-1 text-base text-[var(--color-arena)]"
          : "bg-transparent px-0 py-0 text-sm text-[var(--color-muted-foreground)]"
      }`}
    >
      {positive ? <span className="text-xs opacity-70">+</span> : null}
      <span>{points}</span>
      <span className="text-[0.55rem] uppercase tracking-[0.18em] opacity-70">
        {points === 1 ? t("pt") : t("pts")}
      </span>
    </span>
  );
}

function PointsBreakdown({
  entries,
  emptyLabel,
}: {
  entries: PointSource[];
  emptyLabel: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="border-t border-dashed border-[var(--color-border)] pt-2 text-[0.7rem] italic text-[var(--color-muted-foreground)]">
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="space-y-1 border-t border-dashed border-[var(--color-border)] pt-2">
      {entries.map((e) => (
        <li
          key={e.id}
          className="flex items-baseline justify-between gap-2 text-[0.7rem]"
        >
          <span className="text-[var(--color-foreground)]">{e.label}</span>
          <span className="font-display tabular text-sm text-[var(--color-arena)]">
            +{e.points}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── Scorers timeline card (match info — same for all modes) ───────────── */

export type ScorerEvent = {
  id: string | number;
  playerName: string;
  teamCode: string | null;
  minute: number | null;
  isFirstGoal?: boolean;
  isOwnGoal?: boolean;
  isPenalty?: boolean;
};

export function ScorersCard({
  scorers,
  t,
}: {
  scorers: ScorerEvent[];
  t: Translator;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("scorersTitle")}</CardTitle>
        <CardDescription>{t("scorersDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {scorers.length === 0 ? (
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("scorersEmpty")}
          </p>
        ) : (
          <ol className="relative space-y-3 border-l-2 border-dashed border-[var(--color-border)] pl-6">
            {scorers.map((s) => (
              <li key={s.id} className="relative">
                <span
                  className={`absolute -left-[1.95rem] top-1 grid size-4 place-items-center rounded-full border-2 ${
                    s.isFirstGoal
                      ? "border-[var(--color-arena)] bg-[var(--color-arena)]"
                      : "border-[var(--color-border-strong)] bg-[var(--color-surface)]"
                  }`}
                >
                  {s.isFirstGoal ? (
                    <span className="size-1 rounded-full bg-white" />
                  ) : null}
                </span>
                <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{s.teamCode ?? "?"}</Badge>
                    <span className="font-display text-base tracking-tight">
                      {s.playerName || t("playerFallback")}
                    </span>
                    {s.isFirstGoal ? (
                      <Badge variant="default" className="text-[0.55rem]">
                        {t("firstGoalBadge")}
                      </Badge>
                    ) : null}
                    {s.isOwnGoal ? (
                      <Badge variant="danger" className="text-[0.55rem]">
                        {t("ownGoalBadge")}
                      </Badge>
                    ) : null}
                    {s.isPenalty ? (
                      <Badge variant="warning" className="text-[0.55rem]">
                        {t("penaltyBadge")}
                      </Badge>
                    ) : null}
                  </div>
                  {s.minute != null ? (
                    <span className="font-display tabular text-2xl text-[var(--color-muted-foreground)]">
                      {s.minute}
                      <span className="text-sm">′</span>
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────── Marcador superior ───────────────────────────

/**
 * Cabecera de marcador del partido (parte superior de la ficha): banderas +
 * nombres y, según el estado, hueco "vs" + PROGRAMADO (antes), marcador en vivo
 * + minuto + EN VIVO (durante) o marcador final + FINAL (después). Mismo
 * lenguaje visual que el resto de la card.
 */
export function MatchScoreboard({
  home,
  away,
  state,
  homeScore,
  awayScore,
  minute,
  kickoffLabel,
  t,
}: {
  home: PickTeam;
  away: PickTeam;
  state: PickState;
  homeScore?: number | null;
  awayScore?: number | null;
  minute?: number | null;
  kickoffLabel?: string | null;
  t: Translator;
}) {
  const live = state === "during";
  const finished = state === "after";
  const showScore = (live || finished) && homeScore != null && awayScore != null;

  return (
    <Card>
      <CardContent className="relative space-y-4 p-5 sm:p-7">
        {/* Estado */}
        <div className="flex items-center justify-center">
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-arena)]/60 bg-[color-mix(in_oklch,var(--color-arena)_10%,transparent)] px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-[var(--color-arena)]" />
              </span>
              {t("statusLive")}
              {minute != null ? ` · ${minute}'` : ""}
            </span>
          ) : finished ? (
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
              {t("statusFinal")}
            </span>
          ) : (
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
              {t("statusScheduled")}
            </span>
          )}
        </div>

        {/* Marcador */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
          <ScoreTeam team={home} align="end" t={t} />
          {showScore ? (
            <span
              className={`font-display tabular text-5xl leading-none tracking-tighter sm:text-7xl ${
                live ? "text-[var(--color-arena)] glow-arena" : ""
              }`}
            >
              {homeScore}
              <span className="mx-1 text-[var(--color-muted-foreground)] opacity-50 sm:mx-2">·</span>
              {awayScore}
            </span>
          ) : (
            <span className="font-display text-2xl text-[var(--color-muted-foreground)] sm:text-3xl">
              {t("vs")}
            </span>
          )}
          <ScoreTeam team={away} align="start" t={t} />
        </div>

        {!showScore && kickoffLabel ? (
          <p className="text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {kickoffLabel}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ScoreTeam({
  team,
  align,
  t,
}: {
  team: PickTeam;
  align: "start" | "end";
  t: Translator;
}) {
  const cls = align === "end" ? "items-end text-right" : "items-start text-left";
  const Wrapper: React.ElementType = team.href ? Link : "div";
  const props = team.href ? { href: team.href, "aria-label": team.name ?? undefined } : {};
  return (
    <Wrapper
      {...props}
      className={`flex min-w-0 flex-col gap-1.5 ${cls} ${team.href ? "transition hover:text-[var(--color-arena)]" : ""}`}
    >
      <TeamFlag code={team.code} size={44} />
      <span className="truncate font-display text-lg leading-tight tracking-tight sm:text-2xl">
        {team.name ?? t("tbd")}
      </span>
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        {team.code ?? "—"}
      </span>
    </Wrapper>
  );
}
