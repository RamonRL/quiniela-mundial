import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import {
  MatchScoreboard,
  PickPanel,
  ScorersCard,
  type PickMode,
  type PickPanelProps,
  type PickState,
  type ScorerEvent,
} from "@/components/match/pick-panel";

export const metadata = { title: "Preview · Admin" };
export const dynamic = "force-dynamic";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

// ── Mock fixture: España vs Alemania ──────────────────────────────────────
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

// Goleadores reales para durante/después: gol de México, penalti de Sudáfrica
// y un GOL EN PROPIA de Sudáfrica (cuenta para México) → marcador 2-1.
const SCORERS: ScorerEvent[] = [
  { id: 1, playerName: "Santiago Giménez", teamCode: "MEX", minute: 23, isFirstGoal: true },
  { id: 2, playerName: "Percy Tau", teamCode: "RSA", minute: 41, isPenalty: true },
  { id: 3, playerName: "Mothobi Mvala", teamCode: "RSA", minute: 67, isOwnGoal: true },
];

type Variant = {
  mode: PickMode;
  state: PickState;
  locale: string;
  langLabel: string;
  heading: string;
  desc: string;
};

// completo → ES, marcador → EN, solo_ganador → FR (one language per mode).
const VARIANTS: Variant[] = [
  { mode: "completo", state: "before", locale: "es", langLabel: "ES", heading: "Completo · Antes (ES)", desc: "Marcador + goleador, editable. Sin goleadores aún." },
  { mode: "completo", state: "during", locale: "es", langLabel: "ES", heading: "Completo · En juego (ES)", desc: "Pick bloqueado, marca en vivo. Goleadores reales arriba." },
  { mode: "completo", state: "after", locale: "es", langLabel: "ES", heading: "Completo · Final (ES)", desc: "Desglose de puntos de marcador y goleador + total." },
  { mode: "marcador", state: "before", locale: "en", langLabel: "EN", heading: "Marcador · Before (EN)", desc: "Only the score box, full width, editable." },
  { mode: "marcador", state: "during", locale: "en", langLabel: "EN", heading: "Marcador · Live (EN)", desc: "Locked score box, scorers timeline above." },
  { mode: "marcador", state: "after", locale: "en", langLabel: "EN", heading: "Marcador · Finished (EN)", desc: "Score points only (exact / outcome) + total." },
  { mode: "solo_ganador", state: "before", locale: "fr", langLabel: "FR", heading: "Solo ganador · Avant (FR)", desc: "Choix 1X2 (3 segments), aucun score affiché." },
  { mode: "solo_ganador", state: "during", locale: "fr", langLabel: "FR", heading: "Solo ganador · En direct (FR)", desc: "1X2 verrouillé, buteurs au-dessus." },
  { mode: "solo_ganador", state: "after", locale: "fr", langLabel: "FR", heading: "Solo ganador · Terminé (FR)", desc: "Bon/mauvais vainqueur + points." },
];

// Build the props for a given variant. Mock scores/points inline.
function buildProps(v: Variant, t: Translator): PickPanelProps {
  const base = {
    home: HOME,
    away: AWAY,
    editHref: "/predicciones/jornada/1",
    t,
  };

  if (v.mode === "completo") {
    const pick = { homeScore: 2, awayScore: 1, willGoToPens: false, sign: null };
    if (v.state === "before") return { ...base, mode: v.mode, state: v.state, pick, scorer: SCORER };
    if (v.state === "during")
      return { ...base, mode: v.mode, state: v.state, pick, scorer: SCORER };
    // after — predicted 2-1 with Yamal, actual 2-1 (outcome right, scorer hit).
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
    if (v.state === "before") return { ...base, mode: v.mode, state: v.state, pick };
    if (v.state === "during") return { ...base, mode: v.mode, state: v.state, pick };
    // after — predicted 1-1 but actual 2-1: outcome wrong, no points.
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
  if (v.state === "before") return { ...base, mode: v.mode, state: v.state, pick };
  if (v.state === "during") return { ...base, mode: v.mode, state: v.state, pick };
  // after — picked home, actual home win: correct.
  return {
    ...base,
    mode: v.mode,
    state: v.state,
    pick,
    result: { homeScore: 2, awayScore: 1, sign: "home" },
    points: {
      marker: [{ id: "ou", label: t("srcOutcome"), points: 3 }],
      scorer: [],
      total: 3,
    },
  };
}

export default async function PreviewPage() {
  await requireAdmin();

  // One translator per locale used by the variants.
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
        title="Preview · Tu pick"
        description="Maqueta del panel TU PICK según el modo de predicción (completo · marcador · solo ganador) y el estado del partido (antes · en juego · final). Cada modo se muestra en un idioma distinto para revisar el i18n. Estrecha la ventana para ver el móvil."
      />

      <section className="space-y-10">
        {VARIANTS.map((v) => {
          const t = translatorFor(v.locale);
          const props = buildProps(v, t);
          const showScorers = v.state !== "before";
          return (
            <div key={`${v.mode}-${v.state}`} className="space-y-3">
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
                stage="group"
                group="A"
                homeScore={v.state === "before" ? null : 2}
                awayScore={v.state === "before" ? null : 1}
                minute={v.state === "during" ? 67 : null}
                dateLabel="11 jun · 21:00"
                venue="Estadio Azteca · Ciudad de México"
                t={t}
              />
              {showScorers ? <ScorersCard scorers={SCORERS} t={t} /> : null}
              <PickPanel {...props} />
            </div>
          );
        })}
      </section>
    </div>
  );
}
