import { NextMatchCountdown } from "./next-match-countdown";
import { LiveScoreboard } from "./live-scoreboard";
import { ContextStrip } from "./context-strip";

export type HeroTeam = { code: string; name: string } | null;

export type HeroScorer = {
  name: string;
  teamCode: string;
  minute: number | null;
  isOwnGoal: boolean;
  isPenalty: boolean;
};

export type HeroMatch = {
  code: string;
  stage?: string;
  group?: string | null;
  home: HeroTeam;
  away: HeroTeam;
  status: "live" | "upcoming" | "finished";
  homeScore?: number | null;
  awayScore?: number | null;
  minute?: number | null; // live
  kickoffISO?: string; // upcoming → contador
  dateLabel?: string | null;
  venue?: string | null;
  scorers?: HeroScorer[];
  /** Solo el partido editable (el "siguiente"): estado del pronóstico + deep-link. */
  prediction?: { hasResult: boolean; href: string };
  /** Etiqueta extra para la tira (p.ej. "· a la vez"). */
  note?: string | null;
};

export type HeroData = {
  /** "live" → protagonista = directo(s); "next" → protagonista = el siguiente. */
  featuredKind: "live" | "next";
  featured: HeroMatch[];
  context: HeroMatch[];
};

const STAGE_LABEL: Record<string, string> = {
  group: "Fase de grupos",
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinal",
  third: "Tercer puesto",
  final: "Final",
};

/** Etiqueta de un partido: "Grupo X" en fase de grupos; la ronda en KO. */
export function roundOrGroupLabel(m: { group?: string | null; stage?: string }): string {
  if (m.group) return `Grupo ${m.group}`;
  if (m.stage && STAGE_LABEL[m.stage]) return STAGE_LABEL[m.stage];
  return "";
}

/**
 * Card principal del dashboard en modo torneo — lenguaje de marcador de
 * retransmisión. El protagonista (featured) son los partidos EN DIRECTO si los
 * hay; si no, el siguiente partido con su cuenta atrás. Debajo, una tira
 * secundaria de contexto (partidos vecinos), de bajo énfasis. El resplandor de
 * estadio se intensifica cuando hay directo.
 */
export function HeroCard({ data }: { data: HeroData }) {
  const isLive = data.featuredKind === "live";
  const twoLive = isLive && data.featured.length >= 2;

  return (
    <div
      className={`rise-in relative overflow-hidden rounded-2xl border bg-[var(--color-surface)] ${
        isLive
          ? "border-[var(--color-arena)]/55 live-glow"
          : "border-[var(--color-border)] shadow-[var(--shadow-elev-1)]"
      }`}
    >
      {/* Atmósfera de estadio (sin pitch-grid). El spotlight sube de intensidad
          con directo; halftone muy tenue para textura. */}
      <div
        aria-hidden
        className={`spotlight pointer-events-none absolute inset-0 transition-opacity ${
          isLive ? "opacity-100" : "opacity-40"
        }`}
      />
      <div aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-arena)]/40 to-transparent"
      />

      <div className="relative space-y-5 p-5 sm:p-7">
        {/* Featured */}
        {isLive ? (
          twoLive ? (
            <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
              {data.featured.slice(0, 2).map((m) => (
                <LiveScoreboard key={m.code} match={m} compact />
              ))}
            </div>
          ) : (
            <LiveScoreboard match={data.featured[0]} />
          )
        ) : (
          <NextMatchCountdown match={data.featured[0]} />
        )}

        {/* Tira de contexto */}
        {data.context.length > 0 ? (
          <>
            <div className="h-px bg-[var(--color-border)]" />
            <ContextStrip rows={data.context} />
          </>
        ) : null}
      </div>
    </div>
  );
}
