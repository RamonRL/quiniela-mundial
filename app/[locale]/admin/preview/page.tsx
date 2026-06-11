import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import {
  MatchScoreboard,
  PickPanel,
  type PickMode,
  type PickPanelProps,
  type PickState,
  type ScoreboardGoal,
} from "@/components/match/pick-panel";

export const metadata = { title: "Preview · Admin" };
export const dynamic = "force-dynamic";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

// ── Fixture mock: México vs Sudáfrica ─────────────────────────────────────
const HOME = { code: "MEX", name: "México", href: "/equipos/MEX" };
const AWAY = { code: "RSA", name: "Sudáfrica", href: "/equipos/RSA" };

const SCORER = {
  name: "Santiago Giménez",
  jerseyNumber: 9,
  position: "DEL",
  teamCode: "MEX",
  teamHref: "/equipos/MEX",
  photoUrl: null,
};

// Goleadores bajo cada selección: gol de México (primer gol), penalti de
// Sudáfrica, y un GOL EN PROPIA de un jugador de Sudáfrica que cuenta para
// México (side: "home") → marcador 2-1.
const GOALS: ScoreboardGoal[] = [
  { side: "home", name: "Santiago Giménez", minute: 23, isFirstGoal: true },
  { side: "away", name: "Percy Tau", minute: 41, isPenalty: true },
  { side: "home", name: "Mothobi Mvala", minute: 67, isOwnGoal: true },
];

// Caso de penaltis (fase final): 1-1 y México gana en la tanda.
const PENS_GOALS: ScoreboardGoal[] = [
  { side: "home", name: "Santiago Giménez", minute: 30, isFirstGoal: true },
  { side: "away", name: "Percy Tau", minute: 75, isPenalty: true },
];

type Variant = {
  mode: PickMode;
  state: PickState;
  locale: string;
  heading: string;
  desc: string;
  pens?: boolean;
};

// completo → ES, marcador → EN, solo_ganador → FR; penaltis → ES.
const VARIANTS: Variant[] = [
  { mode: "completo", state: "before", locale: "es", heading: "Completo · Antes (ES)", desc: "Marcador + goleador, editable. Cuenta atrás grande, sin goles aún." },
  { mode: "completo", state: "during", locale: "es", heading: "Completo · En juego (ES)", desc: "Goles bajo cada selección (incluido el autogol bajo México). Minuto en grande." },
  { mode: "completo", state: "after", locale: "es", heading: "Completo · Final (ES)", desc: "FINAL centrado + desglose de puntos de marcador y goleador." },
  { mode: "marcador", state: "before", locale: "en", heading: "Marcador · Before (EN)", desc: "Only the score box (no scorer). Big countdown." },
  { mode: "marcador", state: "during", locale: "en", heading: "Marcador · Live (EN)", desc: "Score box only; goals shown under each team in the scoreboard." },
  { mode: "marcador", state: "after", locale: "en", heading: "Marcador · Finished (EN)", desc: "Score points only (exact / outcome) + total." },
  { mode: "solo_ganador", state: "before", locale: "fr", heading: "Solo ganador · Avant (FR)", desc: "Choix 1X2, aucun score. Grand compte à rebours." },
  { mode: "solo_ganador", state: "during", locale: "fr", heading: "Solo ganador · En direct (FR)", desc: "1X2 verrouillé; buteurs sous chaque équipe." },
  { mode: "solo_ganador", state: "after", locale: "fr", heading: "Solo ganador · Terminé (FR)", desc: "Bon/mauvais vainqueur + points." },
  { mode: "completo", state: "after", locale: "es", pens: true, heading: "Fase final · Penaltis (ES)", desc: "Eliminatoria 1-1 resuelta en los penaltis (Pen. 4-3), con el clasificado." },
];

function scoreboardProps(v: Variant, at: (min: number) => string) {
  const before = v.state === "before";
  if (v.pens) {
    return {
      stage: "final" as const,
      group: null,
      homeScore: 1,
      awayScore: 1,
      minute: null,
      kickoffISO: null,
      wentToPens: true,
      homePenScore: 4,
      awayPenScore: 3,
      winnerName: "México",
      goals: PENS_GOALS,
      venue: "MetLife Stadium · Nueva Jersey",
    };
  }
  return {
    stage: "group" as const,
    group: "A",
    homeScore: before ? null : 2,
    awayScore: before ? null : 1,
    minute: v.state === "during" ? 67 : null,
    kickoffISO: before ? at(2880) : null,
    wentToPens: false,
    homePenScore: null,
    awayPenScore: null,
    winnerName: null,
    goals: before ? [] : GOALS,
    venue: "Estadio Azteca · Ciudad de México",
  };
}

// Props del panel TU PICK por variante.
function buildProps(v: Variant, t: Translator): PickPanelProps {
  const base = { home: HOME, away: AWAY, editHref: "/predicciones/jornada/1", t };

  if (v.pens) {
    // Completo, final, eliminatoria a penaltis: predijo 1-1 + pase de México.
    return {
      ...base,
      mode: "completo",
      state: "after",
      pick: { homeScore: 1, awayScore: 1, willGoToPens: true, sign: null },
      scorer: SCORER,
      result: { homeScore: 1, awayScore: 1, sign: "home", scorerGoals: 1 },
      points: {
        marker: [
          { id: "ex", label: t("srcExact"), points: 5 },
          { id: "pn", label: t("srcPens"), points: 2 },
        ],
        scorer: [{ id: "sc", label: t("srcScorer"), points: 3 }],
        total: 10,
      },
    };
  }

  if (v.mode === "completo") {
    const pick = { homeScore: 2, awayScore: 1, willGoToPens: false, sign: null };
    if (v.state !== "after") return { ...base, mode: v.mode, state: v.state, pick, scorer: SCORER };
    return {
      ...base,
      mode: v.mode,
      state: v.state,
      pick,
      scorer: SCORER,
      result: { homeScore: 2, awayScore: 1, sign: "home", scorerGoals: 1 },
      points: {
        marker: [
          { id: "ex", label: t("srcExact"), points: 5 },
          { id: "ou", label: t("srcOutcome"), points: 3 },
        ],
        scorer: [
          { id: "sc", label: t("srcScorer"), points: 3 },
          { id: "fg", label: t("srcFirstGoal"), points: 2 },
        ],
        total: 13,
      },
    };
  }

  if (v.mode === "marcador") {
    const pick = { homeScore: 1, awayScore: 1, willGoToPens: false, sign: null };
    if (v.state !== "after") return { ...base, mode: v.mode, state: v.state, pick };
    return {
      ...base,
      mode: v.mode,
      state: v.state,
      pick,
      result: { homeScore: 2, awayScore: 1, sign: "home" },
      points: { marker: [], scorer: [], total: 0 },
    };
  }

  // solo_ganador
  const pick = { sign: "home" as const, willGoToPens: false };
  if (v.state !== "after") return { ...base, mode: v.mode, state: v.state, pick };
  return {
    ...base,
    mode: v.mode,
    state: v.state,
    pick,
    result: { homeScore: 2, awayScore: 1, sign: "home" },
    points: { marker: [{ id: "ou", label: t("srcOutcome"), points: 3 }], scorer: [], total: 3 },
  };
}

export default async function PreviewPage() {
  await requireAdmin();
  const now = Date.now();
  const at = (min: number) => new Date(now + min * 60000).toISOString();

  const [tEs, tEn, tFr] = await Promise.all([
    getTranslations({ locale: "es", namespace: "matchDetail" }),
    getTranslations({ locale: "en", namespace: "matchDetail" }),
    getTranslations({ locale: "fr", namespace: "matchDetail" }),
  ]);
  const translatorFor = (locale: string): Translator =>
    locale === "en" ? tEn : locale === "fr" ? tFr : tEs;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Preview · Marcador + Tu pick"
        description="Maqueta del marcador del partido y del panel TU PICK según el modo (completo · marcador · solo ganador) y el estado (antes · en juego · final), más un caso de penaltis. Cada modo en un idioma para revisar el i18n. Estrecha la ventana para ver el móvil."
      />

      <section className="space-y-10">
        {VARIANTS.map((v) => {
          const t = translatorFor(v.locale);
          const sb = scoreboardProps(v, at);
          const props = buildProps(v, t);
          return (
            <div key={v.heading} className="space-y-3">
              <div>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
                  {v.heading}
                </p>
                <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                  {v.desc}
                </p>
              </div>
              <MatchScoreboard
                home={HOME}
                away={AWAY}
                state={v.state}
                dateLabel="11 jun · 21:00"
                t={t}
                {...sb}
              />
              <PickPanel {...props} />
            </div>
          );
        })}
      </section>
    </div>
  );
}
