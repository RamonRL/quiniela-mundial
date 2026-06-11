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
  minute?: number | null; // live (minuto real de la API)
  /** Fase del proveedor: "1H","HT","2H","ET","BT","P". HT/BT → "Descanso". */
  phase?: string | null;
  kickoffISO?: string; // upcoming → contador
  dateLabel?: string | null;
  venue?: string | null;
  scorers?: HeroScorer[];
  /** Solo el partido editable (el "siguiente"): estado del pronóstico + deep-link. */
  prediction?: { hasResult: boolean; href: string };
  /** Etiqueta extra para la tira (p.ej. "· a la vez"). */
  note?: string | null;
  /** Enlace a la página del partido (/partido/[id]). Hace la card clicable. */
  href?: string;
};

export type HeroData = {
  /** "live" → protagonista = directo(s); "next" → protagonista = el siguiente. */
  featuredKind: "live" | "next";
  featured: HeroMatch[];
  context: HeroMatch[];
};

/** stage → clave i18n del namespace "hero" para la etiqueta de ronda. */
export const STAGE_LABEL_KEY: Record<string, string> = {
  group: "stageGroup",
  r32: "stageR32",
  r16: "stageR16",
  qf: "stageQf",
  sf: "stageSf",
  third: "stageThird",
  final: "stageFinal",
};

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
