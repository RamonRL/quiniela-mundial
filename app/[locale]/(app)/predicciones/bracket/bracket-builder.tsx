"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Crown, Eye, Lock, Save, Trophy } from "lucide-react";
import { TeamFlag } from "@/components/brand/team-flag";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { KO_FEEDS, R32_SLOTS, formatSlotSource } from "@/lib/bracket-format";
import { saveBracketPicks, type FormState } from "./actions";

const initialFormState: FormState = { ok: false };

export type TeamLite = { id: number; code: string; name: string; flagUrl: string | null };

type Picks = {
  r16: number[];
  qf: number[];
  sf: number[];
  finalists: number[];
  championTeamId: number | null;
  thirdTeamId: number | null;
};

type R32Pairings = Record<string, { homeId: number | null; awayId: number | null }>;

// ──────────────────────────── Bracket structure ────────────────────────────

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

type BracketStage = "r32" | "r16" | "qf" | "sf" | "final" | "third";

const STAGE_BY_CODE: Record<string, BracketStage> = (() => {
  const out: Record<string, BracketStage> = {};
  for (const c of [...STRUCTURE.r32.left, ...STRUCTURE.r32.right]) out[c] = "r32";
  for (const c of [...STRUCTURE.r16.left, ...STRUCTURE.r16.right]) out[c] = "r16";
  for (const c of [...STRUCTURE.qf.left, ...STRUCTURE.qf.right]) out[c] = "qf";
  for (const c of [...STRUCTURE.sf.left, ...STRUCTURE.sf.right]) out[c] = "sf";
  out[STRUCTURE.final] = "final";
  out[STRUCTURE.third] = "third";
  return out;
})();

// ──────────────────────────── Component ────────────────────────────

export function BracketBuilder({
  teams,
  initial: initialPicks,
  open,
  preview = false,
  r32Pairings,
}: {
  teams: TeamLite[];
  initial: Picks;
  open: boolean;
  preview?: boolean;
  r32Pairings: R32Pairings;
}) {
  const [picks, setPicks] = useState<Picks>(initialPicks);
  const [state, action, pending] = useActionState(saveBracketPicks, initialFormState);
  const interactive = open || preview;

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  // Resolución del par de candidatos en cada partido del bracket. R32 sale
  // del emparejamiento real; el resto, del ganador elegido en los partidos
  // que lo alimentan (y, para el 3.º, el perdedor de las semis).
  const homeAwayByCode = useMemo(() => {
    const out: Record<string, { home: number | null; away: number | null }> = {};
    const winnerOf = (code: string): number | null => {
      const stage = STAGE_BY_CODE[code];
      if (stage === "r32") {
        const candidates = out[code];
        if (!candidates) return null;
        return matchPickedFromPair(stage, candidates, picks);
      }
      const cands = out[code];
      if (!cands) return null;
      return matchPickedFromPair(stage, cands, picks);
    };
    const loserOf = (code: string): number | null => {
      const cands = out[code];
      if (!cands || cands.home == null || cands.away == null) return null;
      const w = winnerOf(code);
      if (w == null) return null;
      return w === cands.home ? cands.away : cands.home;
    };

    // R32 — emparejamiento real (o sintético en preview).
    for (const code of [...STRUCTURE.r32.left, ...STRUCTURE.r32.right]) {
      const p = r32Pairings[code];
      out[code] = { home: p?.homeId ?? null, away: p?.awayId ?? null };
    }
    // R16-Final — feeders.
    for (const code of [
      ...STRUCTURE.r16.left,
      ...STRUCTURE.r16.right,
      ...STRUCTURE.qf.left,
      ...STRUCTURE.qf.right,
      ...STRUCTURE.sf.left,
      ...STRUCTURE.sf.right,
      STRUCTURE.final,
    ]) {
      const feed = KO_FEEDS[code];
      if (!feed) {
        out[code] = { home: null, away: null };
        continue;
      }
      out[code] = {
        home: winnerOf(feed.home.code),
        away: winnerOf(feed.away.code),
      };
    }
    // Tercer puesto: perdedores de semifinales.
    {
      const feed = KO_FEEDS[STRUCTURE.third];
      out[STRUCTURE.third] = {
        home: feed ? loserOf(feed.home.code) : null,
        away: feed ? loserOf(feed.away.code) : null,
      };
    }
    return out;
  }, [r32Pairings, picks]);

  function pickWinner(code: string, teamId: number) {
    if (!interactive) return;
    const stage = STAGE_BY_CODE[code];
    const cands = homeAwayByCode[code];
    if (!cands) return;
    if (cands.home !== teamId && cands.away !== teamId) return;

    setPicks((prev) => applyPick(prev, code, stage, teamId, cands));
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="payload" value={JSON.stringify({ picks })} />

      {preview ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] p-3 text-sm text-[var(--color-arena)]">
          <span className="flex items-center gap-2">
            <Eye className="size-4" />
            Vista previa admin · emparejamiento sintético, nada se guarda.
          </span>
          <Link
            href="/predicciones/bracket"
            className="font-mono text-[0.6rem] uppercase tracking-[0.18em] underline-offset-2 hover:underline"
          >
            Salir
          </Link>
        </div>
      ) : !open ? (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
          <Lock className="size-4" />
          El bracket está cerrado. Sólo lectura.
        </div>
      ) : null}

      <ProgressStrip picks={picks} />

      <BracketTreeUI
        homeAwayByCode={homeAwayByCode}
        teamById={teamById}
        picks={picks}
        onPick={pickWinner}
        interactive={interactive}
        preview={preview}
      />

      {state.error ? <p className="text-sm text-[var(--color-danger)]">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-[var(--color-success)]">Bracket guardado.</p> : null}

      {open && !preview ? (
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={pending}>
            <Save />
            {pending ? "Guardando…" : "Guardar bracket"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

// ──────────────────────────── Pick logic ────────────────────────────

function matchPickedFromPair(
  stage: "r32" | "r16" | "qf" | "sf" | "final" | "third",
  cands: { home: number | null; away: number | null },
  picks: Picks,
): number | null {
  if (cands.home == null && cands.away == null) return null;
  const candIds = [cands.home, cands.away].filter((x): x is number => x != null);
  const list =
    stage === "r32"
      ? picks.r16
      : stage === "r16"
        ? picks.qf
        : stage === "qf"
          ? picks.sf
          : stage === "sf"
            ? picks.finalists
            : null;
  if (list) {
    const found = candIds.find((id) => list.includes(id));
    return found ?? null;
  }
  if (stage === "final") {
    return picks.championTeamId != null && candIds.includes(picks.championTeamId)
      ? picks.championTeamId
      : null;
  }
  // third
  return picks.thirdTeamId != null && candIds.includes(picks.thirdTeamId)
    ? picks.thirdTeamId
    : null;
}

/**
 * Aplica una elección de ganador en `code`. Si el ganador anterior estaba
 * propagado a rondas siguientes, lo limpia en cascada (incluyendo champion
 * y tercer puesto si quedan inconsistentes).
 */
function applyPick(
  prev: Picks,
  code: string,
  stage: "r32" | "r16" | "qf" | "sf" | "final" | "third",
  teamId: number,
  cands: { home: number | null; away: number | null },
): Picks {
  const next: Picks = {
    r16: [...prev.r16],
    qf: [...prev.qf],
    sf: [...prev.sf],
    finalists: [...prev.finalists],
    championTeamId: prev.championTeamId,
    thirdTeamId: prev.thirdTeamId,
  };

  const candIds = [cands.home, cands.away].filter((x): x is number => x != null);

  // Quita el oponente (si estaba elegido) y al propio teamId del stage actual
  // antes de re-añadir, para que quede una sola elección por slot.
  function setStageWinner(list: number[], teamId: number) {
    return [...list.filter((id) => !candIds.includes(id)), teamId];
  }
  function clearStageOpponent(list: number[]) {
    return list.filter((id) => !candIds.includes(id));
  }

  // Toggle: si ya estaba este teamId como ganador del slot, deselecciona.
  const currentWinner = matchPickedFromPair(stage, cands, prev);
  const isToggleOff = currentWinner === teamId;

  if (stage === "r32") {
    next.r16 = isToggleOff ? clearStageOpponent(next.r16) : setStageWinner(next.r16, teamId);
    // Cascada: lo de adelante depende del ganador. Si cambias, limpia
    // rondas posteriores que dependieran del oponente o del ganador anterior.
    next.qf = next.qf.filter((id) => next.r16.includes(id));
    next.sf = next.sf.filter((id) => next.qf.includes(id));
    next.finalists = next.finalists.filter((id) => next.sf.includes(id));
    if (next.championTeamId && !next.finalists.includes(next.championTeamId)) {
      next.championTeamId = null;
    }
    if (next.thirdTeamId && !next.sf.includes(next.thirdTeamId)) {
      // 3.º se elige entre los perdedores de semis (que sí están en next.sf).
      next.thirdTeamId = null;
    }
  } else if (stage === "r16") {
    next.qf = isToggleOff ? clearStageOpponent(next.qf) : setStageWinner(next.qf, teamId);
    next.sf = next.sf.filter((id) => next.qf.includes(id));
    next.finalists = next.finalists.filter((id) => next.sf.includes(id));
    if (next.championTeamId && !next.finalists.includes(next.championTeamId)) {
      next.championTeamId = null;
    }
    if (next.thirdTeamId && !next.sf.includes(next.thirdTeamId)) {
      next.thirdTeamId = null;
    }
  } else if (stage === "qf") {
    next.sf = isToggleOff ? clearStageOpponent(next.sf) : setStageWinner(next.sf, teamId);
    next.finalists = next.finalists.filter((id) => next.sf.includes(id));
    if (next.championTeamId && !next.finalists.includes(next.championTeamId)) {
      next.championTeamId = null;
    }
    if (next.thirdTeamId && !next.sf.includes(next.thirdTeamId)) {
      next.thirdTeamId = null;
    }
  } else if (stage === "sf") {
    next.finalists = isToggleOff
      ? clearStageOpponent(next.finalists)
      : setStageWinner(next.finalists, teamId);
    if (next.championTeamId && !next.finalists.includes(next.championTeamId)) {
      next.championTeamId = null;
    }
    if (next.thirdTeamId && next.finalists.includes(next.thirdTeamId)) {
      // El 3.º no puede ser un finalista — limpia si conflictan.
      next.thirdTeamId = null;
    }
  } else if (stage === "final") {
    next.championTeamId = isToggleOff ? null : teamId;
  } else if (stage === "third") {
    next.thirdTeamId = isToggleOff ? null : teamId;
  }

  return next;
}

// ──────────────────────────── Progress strip ────────────────────────────

function ProgressStrip({ picks }: { picks: Picks }) {
  const items = [
    { label: "R16", count: picks.r16.length, total: 16 },
    { label: "QF", count: picks.qf.length, total: 8 },
    { label: "SF", count: picks.sf.length, total: 4 },
    { label: "Final", count: picks.finalists.length, total: 2 },
    { label: "Campeón", count: picks.championTeamId != null ? 1 : 0, total: 1 },
    { label: "3.º", count: picks.thirdTeamId != null ? 1 : 0, total: 1 },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      {items.map((it) => {
        const done = it.count === it.total;
        return (
          <Badge
            key={it.label}
            variant={done ? "success" : it.count > 0 ? "warning" : "outline"}
            className="font-mono text-[0.55rem] uppercase tracking-[0.18em]"
          >
            {it.label} · {it.count}/{it.total}
          </Badge>
        );
      })}
    </div>
  );
}

// ──────────────────────────── Tree UI ────────────────────────────

type TreeUIProps = {
  homeAwayByCode: Record<string, { home: number | null; away: number | null }>;
  teamById: Map<number, TeamLite>;
  picks: Picks;
  onPick: (code: string, teamId: number) => void;
  interactive: boolean;
  preview: boolean;
};

function BracketTreeUI(props: TreeUIProps) {
  return (
    <>
      {/* Desktop tree (lg+) */}
      <div
        className="relative hidden w-full overflow-x-auto pb-2 lg:block"
        style={{ ["--bracket-gap" as string]: "18px" }}
      >
        <div className="grid min-h-[900px] min-w-[1100px] grid-cols-[0.75fr_1fr_1fr_1fr_minmax(190px,1.1fr)_1fr_1fr_1fr_0.75fr] gap-x-5">
          <Column stage="r32" side="left" order={STRUCTURE.r32.left} {...props} />
          <Column stage="r16" side="left" order={STRUCTURE.r16.left} {...props} />
          <Column stage="qf" side="left" order={STRUCTURE.qf.left} {...props} />
          <Column stage="sf" side="left" order={STRUCTURE.sf.left} {...props} />

          <FinalColumn {...props} />

          <Column stage="sf" side="right" order={STRUCTURE.sf.right} {...props} />
          <Column stage="qf" side="right" order={STRUCTURE.qf.right} {...props} />
          <Column stage="r16" side="right" order={STRUCTURE.r16.right} {...props} />
          <Column stage="r32" side="right" order={STRUCTURE.r32.right} {...props} />
        </div>
      </div>

      {/* Mobile: lista por etapa, igual concept pero sin árbol. Cada partido
          es un par de botones; la siguiente ronda se llena automáticamente. */}
      <div className="space-y-6 lg:hidden">
        {(["r32", "r16", "qf", "sf", "final", "third"] as const).map((stage) => {
          const codes = stageCodes(stage);
          if (codes.length === 0) return null;
          return (
            <section key={stage} className="space-y-2">
              <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-arena)]">
                {STAGE_LABEL[stage]}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {codes.map((code) => (
                  <MatchCard
                    key={code}
                    code={code}
                    stage={stage}
                    {...props}
                    showHeader
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function stageCodes(stage: "r32" | "r16" | "qf" | "sf" | "final" | "third"): string[] {
  if (stage === "r32") return [...STRUCTURE.r32.left, ...STRUCTURE.r32.right];
  if (stage === "r16") return [...STRUCTURE.r16.left, ...STRUCTURE.r16.right];
  if (stage === "qf") return [...STRUCTURE.qf.left, ...STRUCTURE.qf.right];
  if (stage === "sf") return [...STRUCTURE.sf.left, ...STRUCTURE.sf.right];
  if (stage === "final") return [STRUCTURE.final];
  return [STRUCTURE.third];
}

const STAGE_LABEL: Record<"r32" | "r16" | "qf" | "sf" | "final" | "third", string> = {
  r32: "R32",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinales",
  final: "Final",
  third: "Tercer puesto",
};

function Column({
  stage,
  side,
  order,
  ...rest
}: TreeUIProps & {
  stage: "r32" | "r16" | "qf" | "sf";
  side: "left" | "right";
  order: readonly string[];
}) {
  return (
    <div className="flex flex-col">
      <ColumnHeader label={STAGE_LABEL[stage]} side={side} />
      <div className="flex flex-1 flex-col">
        {stage === "sf" ? (
          <div className="flex flex-1 items-center justify-center">
            <div
              className={cn(
                "flex w-full items-center",
                "bracket-incoming",
                side === "right" && "bracket-incoming-right",
              )}
            >
              <MatchCard code={order[0]} stage={stage} {...rest} />
            </div>
          </div>
        ) : (
          chunkPairs([...order]).map((pair, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-1 flex-col justify-around bracket-pair",
                side === "right" && "bracket-pair-right",
              )}
            >
              {pair.map((code) => (
                <div
                  key={code}
                  className={cn(
                    "flex w-full items-center",
                    stage !== "r32" && "bracket-incoming",
                    stage !== "r32" && side === "right" && "bracket-incoming-right",
                  )}
                >
                  <MatchCard code={code} stage={stage} {...rest} />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FinalColumn(props: TreeUIProps) {
  return (
    <div className="flex flex-col">
      <div className="grid place-items-center pb-3">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
          Final
        </span>
      </div>
      <div className="flex flex-1 flex-col items-stretch justify-center gap-6">
        <div className="flex flex-col items-center gap-1.5">
          <Image
            src="/fwc26.png"
            alt="FIFA World Cup 26"
            width={1500}
            height={1500}
            className="h-12 w-auto"
          />
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Copa Mundial 2026
          </p>
        </div>
        <FinalCard {...props} />
        <ThirdCard {...props} />
      </div>
    </div>
  );
}

function ColumnHeader({ label, side }: { label: string; side: "left" | "right" }) {
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

function MatchCard({
  code,
  stage,
  homeAwayByCode,
  teamById,
  picks,
  onPick,
  interactive,
  preview,
  showHeader,
}: TreeUIProps & {
  code: string;
  stage: "r32" | "r16" | "qf" | "sf" | "final" | "third";
  showHeader?: boolean;
}) {
  const cands = homeAwayByCode[code] ?? { home: null, away: null };
  const winner = matchPickedFromPair(stage, cands, picks);

  const home = cands.home != null ? teamById.get(cands.home) ?? null : null;
  const away = cands.away != null ? teamById.get(cands.away) ?? null : null;

  // Placeholder labels para slots todavía sin equipo (preview o pre-cierre).
  const homePlaceholder = computePlaceholder(stage, code, "home");
  const awayPlaceholder = computePlaceholder(stage, code, "away");

  const headerText =
    stage === "final" ? "Final" : stage === "third" ? "Tercer puesto" : code;

  return (
    <div
      className={cn(
        "bracket-card w-full overflow-hidden rounded-md border bg-[var(--color-surface)] transition-colors",
        stage === "final"
          ? "border-2 border-[var(--color-arena)]/50 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] shadow-[var(--shadow-arena)]"
          : stage === "third"
            ? "border-dashed border-[var(--color-border-strong)]"
            : "border-[var(--color-border)]",
      )}
    >
      {(showHeader ?? true) ? (
        <div
          className={cn(
            "flex items-center justify-between border-b px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.28em]",
            stage === "final"
              ? "border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_15%,transparent)] text-[var(--color-arena)]"
              : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]",
          )}
        >
          <span>{stage === "final" ? `${headerText} · ${code}` : headerText}</span>
          {stage === "final" ? <Crown className="size-3 text-[var(--color-arena)]" /> : null}
        </div>
      ) : null}
      <TeamRowButton
        team={home}
        placeholderLabel={homePlaceholder}
        isWinner={winner != null && winner === home?.id}
        disabled={!interactive || home == null}
        onPick={() => home && onPick(code, home.id)}
        preview={preview}
      />
      <div className="border-t border-dashed border-[var(--color-border)]" />
      <TeamRowButton
        team={away}
        placeholderLabel={awayPlaceholder}
        isWinner={winner != null && winner === away?.id}
        disabled={!interactive || away == null}
        onPick={() => away && onPick(code, away.id)}
        preview={preview}
      />
    </div>
  );
}

function FinalCard(props: TreeUIProps) {
  return (
    <MatchCard
      code={STRUCTURE.final}
      stage="final"
      showHeader
      {...props}
    />
  );
}

function ThirdCard(props: TreeUIProps) {
  return (
    <MatchCard
      code={STRUCTURE.third}
      stage="third"
      showHeader
      {...props}
    />
  );
}

function TeamRowButton({
  team,
  placeholderLabel,
  isWinner,
  disabled,
  onPick,
  preview,
}: {
  team: TeamLite | null;
  placeholderLabel: string | null;
  isWinner: boolean;
  disabled: boolean;
  onPick: () => void;
  preview: boolean;
}) {
  const isPlaceholder = team == null;
  const label = team?.name ?? placeholderLabel ?? "TBD";
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left transition",
        isWinner
          ? "bg-[color-mix(in_oklch,var(--color-arena)_18%,transparent)] text-[var(--color-arena)]"
          : "hover:bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)]",
        disabled && !isPlaceholder && "cursor-default opacity-80",
        disabled && isPlaceholder && "cursor-default",
        preview && "cursor-pointer opacity-100",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <TeamFlag code={team?.code} size={18} />
        <span
          className={cn(
            "truncate font-medium",
            isPlaceholder
              ? "font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]"
              : "font-mono text-[0.75rem] uppercase tracking-[0.18em]",
          )}
        >
          {team ? team.code : label}
        </span>
      </div>
      {isWinner ? (
        <Trophy className="size-3.5 shrink-0 text-[var(--color-arena)]" />
      ) : null}
    </button>
  );
}

function computePlaceholder(
  stage: "r32" | "r16" | "qf" | "sf" | "final" | "third",
  code: string,
  side: "home" | "away",
): string | null {
  if (stage === "r32") {
    const slots = R32_SLOTS[code];
    if (!slots) return null;
    return formatSlotSource(side === "home" ? slots.home : slots.away);
  }
  const feed = KO_FEEDS[code];
  if (!feed) return null;
  const f = side === "home" ? feed.home : feed.away;
  return f.loser ? `Pierde ${f.code}` : `Gana ${f.code}`;
}

function chunkPairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}
