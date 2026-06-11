import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import {
  MatchPredictionsReveal,
  type RevealRow,
} from "@/components/match/predictions-reveal";

export const metadata = { title: "Preview · Admin" };
export const dynamic = "force-dynamic";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

// ── Mock: México vs Sudáfrica, marcador real 2-1 (autogol incluido). Estas
//    son las predicciones que la liga ve a partir del saque inicial. ─────────
//
// Casos representados:
//  - Yo: marcador exacto (2-1) acertado + goleador que marcó → fila resaltada,
//    marcador en verde, punto verde en el goleador.
//  - Acertó ganador y goles de un equipo, goleador que no marcó.
//  - Predijo empate (1-1), sin goleador.
//  - Marcador exacto pero su goleador no marcó.
//  - Sin enviar marcador (—) pero con goleador.
//  - Eliminatoria: empate + penaltis (etiqueta "pen.").
const ROWS: RevealRow[] = [
  {
    userId: "me",
    display: "Ramón",
    avatarUrl: null,
    isMe: true,
    homeScore: 2,
    awayScore: 1,
    willGoToPens: false,
    exactScore: true,
    scorerName: "Santiago Giménez",
    scorerScored: true,
  },
  {
    userId: "u2",
    display: "Lucía",
    avatarUrl: null,
    isMe: false,
    homeScore: 3,
    awayScore: 1,
    willGoToPens: false,
    exactScore: false,
    scorerName: "Raúl Jiménez",
    scorerScored: false,
  },
  {
    userId: "u3",
    display: "Diego",
    avatarUrl: null,
    isMe: false,
    homeScore: 1,
    awayScore: 1,
    willGoToPens: false,
    exactScore: false,
    scorerName: null,
    scorerScored: false,
  },
  {
    userId: "u4",
    display: "María José",
    avatarUrl: null,
    isMe: false,
    homeScore: 2,
    awayScore: 1,
    willGoToPens: false,
    exactScore: true,
    scorerName: "Hirving Lozano",
    scorerScored: false,
  },
  {
    userId: "u5",
    display: "Olivares",
    avatarUrl: null,
    isMe: false,
    homeScore: null,
    awayScore: null,
    willGoToPens: false,
    exactScore: false,
    scorerName: "Percy Tau",
    scorerScored: true,
  },
  {
    userId: "u6",
    display: "Aleix",
    avatarUrl: null,
    isMe: false,
    homeScore: 1,
    awayScore: 1,
    willGoToPens: true,
    exactScore: false,
    scorerName: "Edson Álvarez",
    scorerScored: false,
  },
];

// Sin goleador (modos marcador / solo ganador): misma tabla sin esa columna.
const ROWS_NO_SCORER: RevealRow[] = ROWS.map((r) => ({
  ...r,
  scorerName: null,
  scorerScored: false,
}));

type Variant = {
  locale: string;
  showScorer: boolean;
  rows: RevealRow[];
  heading: string;
  desc: string;
};

const VARIANTS: Variant[] = [
  {
    locale: "es",
    showScorer: true,
    rows: ROWS,
    heading: "Modo completo · ES",
    desc: "Marcador + goleador. Mi fila resaltada, marcador exacto en verde y punto verde si el goleador marcó. Estrecha la ventana para ver el móvil.",
  },
  {
    locale: "es",
    showScorer: false,
    rows: ROWS_NO_SCORER,
    heading: "Modo marcador / solo ganador · ES",
    desc: "Sin columna de goleador (esos modos no la predicen).",
  },
  {
    locale: "en",
    showScorer: true,
    rows: ROWS,
    heading: "Modo completo · EN",
    desc: "Misma tabla en inglés para revisar el i18n.",
  },
];

export default async function PreviewPage() {
  await requireAdmin();

  const [tEs, tEn] = await Promise.all([
    getTranslations({ locale: "es", namespace: "matchDetail" }),
    getTranslations({ locale: "en", namespace: "matchDetail" }),
  ]);
  const translatorFor = (locale: string): Translator => (locale === "en" ? tEn : tEs);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Preview · Predicciones de la liga"
        description="Cuando empieza un partido (saque inicial), cada miembro de tu liga ve las predicciones del resto para ese partido. Así se ve la tabla en la página del partido."
      />

      <section className="space-y-10">
        {VARIANTS.map((v) => {
          const t = translatorFor(v.locale);
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
              <MatchPredictionsReveal rows={v.rows} showScorer={v.showScorer} t={t} />
            </div>
          );
        })}
      </section>
    </div>
  );
}
