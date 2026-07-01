import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { TeamFlag } from "@/components/brand/team-flag";
import { cn } from "@/lib/utils";
import {
  KO_FEEDS,
  R32_SLOTS,
  encodeSlotSource,
  formatSlotSource,
} from "@/lib/bracket-format";

export type TeamLite = {
  id: number;
  code: string;
  name: string;
  flagUrl: string | null;
};

export type BracketMatch = {
  id: number;
  code: string;
  scheduledAt: Date | string;
  homeTeam: TeamLite | null;
  awayTeam: TeamLite | null;
  winnerTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "live" | "finished";
  wentToPens: boolean;
  homeScorePen: number | null;
  awayScorePen: number | null;
};

type Side = "left" | "right";

type Props = {
  /** All knockout matches keyed by code */
  matches: Map<string, BracketMatch>;
  /** Team ids the user predicted to advance from each round */
  myPicks: {
    r16: Set<number>;
    qf: Set<number>;
    sf: Set<number>;
    finalists: Set<number>;
    championTeamId: number | null;
  };
};

/**
 * Hardcoded FIFA 2026 bracket structure. The order in r32/r16/qf/sf is
 * top-to-bottom for the left half then top-to-bottom for the right half so
 * that, when each column distributes evenly, paired matches sit adjacent and
 * a parent match sits at the vertical midpoint of its two feeders.
 *
 * Source: 2026 FIFA World Cup knockout stage bracket (Wikipedia).
 */
const STRUCTURE = {
  r32: {
    left: ["M74", "M77", "M73", "M75", "M83", "M84", "M81", "M82"],
    right: ["M76", "M78", "M79", "M80", "M86", "M88", "M85", "M87"],
  },
  r16: {
    left: ["M89", "M90", "M93", "M94"],
    right: ["M91", "M92", "M95", "M96"],
  },
  qf: {
    left: ["M97", "M98"],
    right: ["M99", "M100"],
  },
  sf: {
    left: ["M101"],
    right: ["M102"],
  },
  final: "M104",
  third: "M103",
} as const;

export function BracketTree({ matches, myPicks }: Props) {
  return (
    <div
      className="relative w-full overflow-x-auto pb-2"
      style={{ ["--bracket-gap" as string]: "18px" }}
    >
      <div className="grid min-h-[900px] min-w-[1080px] grid-cols-[0.85fr_1fr_1fr_1fr_minmax(180px,1.05fr)_1fr_1fr_1fr_0.85fr] gap-x-5">
        {/* LEFT HALF */}
        <Column stage="r32" side="left" matches={matches} myPicks={myPicks} order={STRUCTURE.r32.left} />
        <Column stage="r16" side="left" matches={matches} myPicks={myPicks} order={STRUCTURE.r16.left} />
        <Column stage="qf" side="left" matches={matches} myPicks={myPicks} order={STRUCTURE.qf.left} />
        <Column stage="sf" side="left" matches={matches} myPicks={myPicks} order={STRUCTURE.sf.left} />

        {/* CENTER — final + champion */}
        <FinalColumn matches={matches} myPicks={myPicks} />

        {/* RIGHT HALF */}
        <Column stage="sf" side="right" matches={matches} myPicks={myPicks} order={STRUCTURE.sf.right} />
        <Column stage="qf" side="right" matches={matches} myPicks={myPicks} order={STRUCTURE.qf.right} />
        <Column stage="r16" side="right" matches={matches} myPicks={myPicks} order={STRUCTURE.r16.right} />
        <Column stage="r32" side="right" matches={matches} myPicks={myPicks} order={STRUCTURE.r32.right} />
      </div>
    </div>
  );
}

/** Orden completo del cuadro (mitad izquierda + derecha concatenadas) para el
 *  árbol único de móvil: cada par de una columna alimenta la siguiente, así que
 *  los conectores encajan igual que en PC. */
const FULL = {
  r32: [...STRUCTURE.r32.left, ...STRUCTURE.r32.right],
  r16: [...STRUCTURE.r16.left, ...STRUCTURE.r16.right],
  qf: [...STRUCTURE.qf.left, ...STRUCTURE.qf.right],
  sf: [...STRUCTURE.sf.left, ...STRUCTURE.sf.right],
} as const;

/**
 * Árbol para MÓVIL — misma riqueza visual que el de PC (tarjetas + líneas
 * conectoras), pero como UN SOLO árbol desplegado que fluye izquierda→derecha
 * y es deslizable en horizontal: los 16 dieciseisavos → octavos → cuartos →
 * semis → y desemboca en la Final + 3.er puesto al extremo derecho. Al
 * concatenar las dos mitades del cuadro, cada par alimenta al partido de la
 * columna siguiente, así que los conectores encajan como en escritorio.
 */
export function MobileBracketTree({ matches, myPicks }: Props) {
  const tt = useTranslations("tournament");
  const finalMatch = matches.get(STRUCTURE.final);
  const thirdMatch = matches.get(STRUCTURE.third);
  return (
    <div className="scroll-x-only-on-pc -mx-4 overflow-x-auto px-4 lg:hidden">
      <div
        className="flex min-h-[82rem] gap-x-4"
        style={{ ["--bracket-gap" as string]: "16px" }}
      >
        <MobileColumn stage="r32" order={FULL.r32} label={tt("stR32")} incoming={false} matches={matches} myPicks={myPicks} />
        <MobileColumn stage="r16" order={FULL.r16} label={tt("stR16")} incoming matches={matches} myPicks={myPicks} />
        <MobileColumn stage="qf" order={FULL.qf} label={tt("stQf")} incoming matches={matches} myPicks={myPicks} />
        <MobileColumn stage="sf" order={FULL.sf} label={tt("stSf")} incoming matches={matches} myPicks={myPicks} />
        {/* Final + 3.er puesto al extremo derecho — la Final centrada al
            vértice de las dos semis (conector de entrada) y el 3.º debajo. */}
        <div className="flex w-[11.5rem] flex-none flex-col">
          <ColumnHeader label={tt("stFinal")} side="left" />
          <div className="flex flex-1 items-center">
            <div className="w-full space-y-4">
              {finalMatch ? (
                <div className="bracket-incoming flex w-full items-center">
                  <FinalCard match={finalMatch} championTeamId={myPicks.championTeamId} />
                </div>
              ) : null}
              {thirdMatch ? <ThirdCard match={thirdMatch} /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileColumn({
  stage,
  order,
  label,
  incoming,
  matches,
  myPicks,
}: {
  stage: "r32" | "r16" | "qf" | "sf";
  order: readonly string[];
  label: string;
  incoming: boolean;
  matches: Map<string, BracketMatch>;
  myPicks: Props["myPicks"];
}) {
  return (
    <div className="flex w-[10.5rem] flex-none flex-col">
      <ColumnHeader label={label} side="left" />
      <div className="flex flex-1 flex-col">
        {chunkPairs([...order]).map((pair, i) => (
          <div key={i} className="flex flex-1 flex-col justify-around bracket-pair">
            {pair.map((code) => (
              <MatchCardWrapper
                key={code}
                code={code}
                stage={stage}
                side="left"
                matches={matches}
                myPicks={myPicks}
                showIncoming={incoming}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Column({
  stage,
  side,
  order,
  matches,
  myPicks,
}: {
  stage: "r32" | "r16" | "qf" | "sf";
  side: Side;
  order: readonly string[];
  matches: Map<string, BracketMatch>;
  myPicks: Props["myPicks"];
}) {
  const tt = useTranslations("tournament");
  const stageLabel = tt(STAGE_LABEL_KEY[stage]);
  // For r32 we group every two matches into a pair (the two feeders for one r16).
  // For r16/qf we also pair (each pair feeds one parent in the next column).
  // For sf there's no pair — it's a single match per side.
  const items: { code: string; pairIndex?: number }[] = order.map((code) => ({ code }));

  return (
    <div className="flex flex-col">
      <ColumnHeader label={stageLabel} side={side} />
      <div className="flex flex-1 flex-col">
        {stage === "sf" ? (
          // single match per side, centered
          <div className="flex flex-1 items-center justify-center">
            <MatchCardWrapper
              code={items[0].code}
              stage={stage}
              side={side}
              matches={matches}
              myPicks={myPicks}
              showIncoming
            />
          </div>
        ) : (
          // pairs
          chunkPairs(items).map((pair, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-1 flex-col justify-around bracket-pair",
                side === "right" && "bracket-pair-right",
              )}
            >
              {pair.map((it) => (
                <MatchCardWrapper
                  key={it.code}
                  code={it.code}
                  stage={stage}
                  side={side}
                  matches={matches}
                  myPicks={myPicks}
                  showIncoming={stage !== "r32"}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FinalColumn({
  matches,
  myPicks,
}: {
  matches: Map<string, BracketMatch>;
  myPicks: Props["myPicks"];
}) {
  const tt = useTranslations("tournament");
  const finalMatch = matches.get(STRUCTURE.final);
  const thirdMatch = matches.get(STRUCTURE.third);
  return (
    <div className="flex flex-col">
      <div className="grid place-items-center pb-3">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
          {tt("stFinal")}
        </span>
      </div>
      <div className="flex flex-1 flex-col items-stretch justify-center gap-6">
        {/* FWC26 mark — corona la columna central, justo encima del cuadro
            de la final. Solo se muestra en desktop porque el árbol entero
            es desktop-only. */}
        <div className="flex flex-col items-center gap-1.5">
          <Image
            src="/fwc26.png"
            alt="FIFA World Cup 26"
            width={1500}
            height={1500}
            className="h-12 w-auto"
          />
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {tt("worldCup")}
          </p>
        </div>
        {finalMatch ? (
          <FinalCard match={finalMatch} championTeamId={myPicks.championTeamId} />
        ) : null}
        {thirdMatch ? (
          <ThirdCard match={thirdMatch} />
        ) : null}
      </div>
    </div>
  );
}

function ColumnHeader({ label, side }: { label: string; side: Side }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 pb-3 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]",
        side === "left" ? "justify-start" : "justify-end",
      )}
    >
      {side === "left" ? (
        <>
          <span className="h-px w-4 bg-[var(--color-arena)]" />
          {label}
        </>
      ) : (
        <>
          {label}
          <span className="h-px w-4 bg-[var(--color-arena)]" />
        </>
      )}
    </div>
  );
}

function MatchCardWrapper({
  code,
  stage,
  side,
  matches,
  myPicks,
  showIncoming,
}: {
  code: string;
  stage: "r32" | "r16" | "qf" | "sf";
  side: Side;
  matches: Map<string, BracketMatch>;
  myPicks: Props["myPicks"];
  showIncoming: boolean;
}) {
  const m = matches.get(code);
  return (
    <div
      className={cn(
        "flex items-center",
        showIncoming &&
          (side === "left" ? "bracket-incoming" : "bracket-incoming-right"),
      )}
    >
      <BracketCard match={m} code={code} stage={stage} myPicks={myPicks} />
    </div>
  );
}

function BracketCard({
  match,
  code,
  stage,
  myPicks,
}: {
  match: BracketMatch | undefined;
  code: string;
  stage: "r32" | "r16" | "qf" | "sf";
  myPicks: Props["myPicks"];
}) {
  const tt = useTranslations("tournament");
  // Which set of picks corresponds to "the team I think advances from THIS match"?
  // After r32 → my r16 picks tell me. After r16 → my qf picks. Etc.
  const advancePool: Set<number> | null =
    stage === "r32"
      ? myPicks.r16
      : stage === "r16"
        ? myPicks.qf
        : stage === "qf"
          ? myPicks.sf
          : myPicks.finalists;

  const home = match?.homeTeam ?? null;
  const away = match?.awayTeam ?? null;
  const winnerId = match?.winnerTeamId ?? null;

  // Placeholder labels: cuando el slot todavía no tiene equipo, mostramos
  // de dónde viene (p.ej. "1º A", "3º A·B·C·D·F", "Gana M74"). Para R32 lo
  // sacamos del mapa FIFA; para rondas posteriores, del feeder. data-slot-*
  // habilita el resaltado interactivo desde BracketSlotHighlighter.
  const homePlaceholder = computePlaceholder(stage, code, "home", tt);
  const awayPlaceholder = computePlaceholder(stage, code, "away", tt);
  const dataSlotHome = stage === "r32" ? encodeSlotSource(R32_SLOTS[code].home) : undefined;
  const dataSlotAway = stage === "r32" ? encodeSlotSource(R32_SLOTS[code].away) : undefined;

  return (
    <div
      data-bracket-card="true"
      data-slot-home={dataSlotHome}
      data-slot-away={dataSlotAway}
      className="bracket-card relative w-full overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors hover:border-[var(--color-arena)]/40"
    >
      {match ? (
        <Link
          href={`/partido/${match.id}`}
          aria-label={tt("matchAria", { code: match.code })}
          className="absolute inset-0 z-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
        />
      ) : null}
      <div className="pointer-events-none relative flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        <span>{code}</span>
        {match?.status === "finished" ? (
          <span className="text-[var(--color-success)]">{tt("finShort")}</span>
        ) : match?.status === "live" ? (
          <span className="text-[var(--color-arena)]">LIVE</span>
        ) : null}
      </div>
      <TeamLine
        team={home}
        score={match?.homeScore ?? null}
        isWinner={winnerId != null && home?.id === winnerId}
        isMyPick={home != null && advancePool?.has(home.id) === true}
        placeholderLabel={homePlaceholder}
        compact
      />
      <div className="border-t border-dashed border-[var(--color-border)]" />
      <TeamLine
        team={away}
        score={match?.awayScore ?? null}
        isWinner={winnerId != null && away?.id === winnerId}
        isMyPick={away != null && advancePool?.has(away.id) === true}
        placeholderLabel={awayPlaceholder}
        compact
      />
      {match?.wentToPens ? (
        <p className="pointer-events-none relative border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-center font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
          {tt("pens", { h: match.homeScorePen ?? 0, a: match.awayScorePen ?? 0 })}
        </p>
      ) : null}
    </div>
  );
}

function computePlaceholder(
  stage: "r32" | "r16" | "qf" | "sf",
  code: string,
  side: "home" | "away",
  tt: (key: string, values?: Record<string, string | number>) => string,
): string | null {
  if (stage === "r32") {
    const slots = R32_SLOTS[code];
    if (!slots) return null;
    return formatSlotSource(side === "home" ? slots.home : slots.away);
  }
  const feed = KO_FEEDS[code];
  if (!feed) return null;
  const f = side === "home" ? feed.home : feed.away;
  return f.loser ? tt("loses", { code: f.code }) : tt("wins", { code: f.code });
}

function TeamLine({
  team,
  score,
  isWinner,
  isMyPick,
  placeholderLabel,
  compact,
}: {
  team: TeamLite | null;
  score: number | null;
  isWinner: boolean;
  isMyPick: boolean;
  placeholderLabel?: string | null;
  compact?: boolean;
}) {
  const tt = useTranslations("tournament");
  const isPlaceholder = team == null;
  const label = team?.name ?? placeholderLabel ?? tt("tbd");
  return (
    <div
      className={cn(
        "pointer-events-none relative flex items-center justify-between gap-2 px-2",
        compact ? "py-1" : "py-1.5",
        isWinner && "bg-[color-mix(in_oklch,var(--color-success)_10%,transparent)]",
      )}
    >
      {team ? (
        <Link
          href={`/equipos/${team.code}`}
          aria-label={team.name}
          className="pointer-events-auto relative z-10 flex min-w-0 items-center gap-1.5 hover:text-[var(--color-arena)]"
        >
          <TeamFlag code={team.code} size={16} />
          <span
            className={cn(
              "truncate text-[0.7rem] font-medium",
              isWinner && "text-[var(--color-success)]",
            )}
          >
            {label}
          </span>
          {isMyPick ? (
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[var(--color-arena)]">
              ●
            </span>
          ) : null}
        </Link>
      ) : (
        <div className="flex min-w-0 items-center gap-1.5">
          <TeamFlag code={undefined} size={16} />
          <span
            className={cn(
              "truncate text-[0.7rem] font-medium",
              isPlaceholder &&
                "font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]",
            )}
          >
            {label}
          </span>
        </div>
      )}
      <span className="font-display tabular text-base">
        {score != null ? score : <span className="text-[var(--color-muted-foreground)]">·</span>}
      </span>
    </div>
  );
}

function FinalCard({
  match,
  championTeamId,
}: {
  match: BracketMatch;
  championTeamId: number | null;
}) {
  const tt = useTranslations("tournament");
  const homeFeed = KO_FEEDS[match.code]?.home;
  const awayFeed = KO_FEEDS[match.code]?.away;
  return (
    <div className="overflow-hidden rounded-lg border-2 border-[var(--color-arena)]/50 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] shadow-[var(--shadow-arena)]">
      <div className="flex items-center justify-between border-b border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_15%,transparent)] px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.32em]">
        <span className="text-[var(--color-arena)]">{tt("stFinal")} · {match.code}</span>
        <Crown className="size-4 text-[var(--color-arena)]" />
      </div>
      <TeamLine
        team={match.homeTeam}
        score={match.homeScore}
        isWinner={match.winnerTeamId != null && match.homeTeam?.id === match.winnerTeamId}
        isMyPick={match.homeTeam != null && match.homeTeam.id === championTeamId}
        placeholderLabel={homeFeed ? tt("wins", { code: homeFeed.code }) : null}
      />
      <div className="border-t border-dashed border-[var(--color-border)]" />
      <TeamLine
        team={match.awayTeam}
        score={match.awayScore}
        isWinner={match.winnerTeamId != null && match.awayTeam?.id === match.winnerTeamId}
        isMyPick={match.awayTeam != null && match.awayTeam.id === championTeamId}
        placeholderLabel={awayFeed ? tt("wins", { code: awayFeed.code }) : null}
      />
    </div>
  );
}

function ThirdCard({ match }: { match: BracketMatch }) {
  const tt = useTranslations("tournament");
  const homeFeed = KO_FEEDS[match.code]?.home;
  const awayFeed = KO_FEEDS[match.code]?.away;
  return (
    <div className="overflow-hidden rounded-md border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-center font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {tt("stThird")} · {match.code}
      </div>
      <TeamLine
        team={match.homeTeam}
        score={match.homeScore}
        isWinner={match.winnerTeamId != null && match.homeTeam?.id === match.winnerTeamId}
        isMyPick={false}
        placeholderLabel={homeFeed ? tt("loses", { code: homeFeed.code }) : null}
      />
      <div className="border-t border-dashed border-[var(--color-border)]" />
      <TeamLine
        team={match.awayTeam}
        score={match.awayScore}
        isWinner={match.winnerTeamId != null && match.awayTeam?.id === match.winnerTeamId}
        isMyPick={false}
        placeholderLabel={awayFeed ? tt("loses", { code: awayFeed.code }) : null}
      />
    </div>
  );
}

function chunkPairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

const STAGE_LABEL_KEY: Record<"r32" | "r16" | "qf" | "sf", string> = {
  r32: "stR32",
  r16: "stR16",
  qf: "stQf",
  sf: "stSf",
};
