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

// ── Mock: liga de 50 personas. Marcador real del partido: 2-1. Las filas son
//    las predicciones que la liga ve a partir del saque inicial. ─────────────
const NAMES = [
  "Ramón", "Lucía", "Diego", "María José", "Olivares", "Aleix", "Carmen", "Pablo",
  "Nuria", "Javi", "Sofía", "Marc", "Elena", "Rubén", "Paula", "Iker", "Noa",
  "Hugo", "Vega", "Bruno", "Alba", "Mateo", "Lola", "Gonzalo", "Irene", "Pol",
  "Daniela", "Unai", "Claudia", "Sergio", "Ainhoa", "Adrián", "Marta", "Nico",
  "Valeria", "Álvaro", "Jimena", "Cristian", "Lara", "Manu", "Ángela", "Joel",
  "Rocío", "Saúl", "Teresa", "Izan", "Candela", "Borja", "Greta", "Dani",
];

const SCORERS = [
  "Santiago Giménez", "Raúl Jiménez", "Hirving Lozano", "Edson Álvarez",
  "Percy Tau", "Themba Zwane", null, null,
];

// Genera 50 filas deterministas (sin Math.random, no disponible aquí). Variamos
// marcadores, goleadores, empates/penaltis y aciertos de forma cíclica.
const ROWS: RevealRow[] = NAMES.map((name, i) => {
  const homeScore = i % 7 === 6 ? null : (i % 4); // alguna fila sin enviar
  const awayScore = homeScore == null ? null : (i % 3);
  const willGoToPens = homeScore != null && homeScore === awayScore && i % 5 === 0;
  const exactScore = homeScore === 2 && awayScore === 1;
  const scorerName = SCORERS[i % SCORERS.length];
  const scorerScored = scorerName === "Santiago Giménez" || scorerName === "Percy Tau";
  return {
    userId: `u${i}`,
    display: name,
    avatarUrl: null,
    isMe: i === 0,
    homeScore,
    awayScore,
    willGoToPens,
    exactScore,
    scorerName,
    scorerScored: scorerName != null && scorerScored,
  };
});

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
    heading: "Liga de 50 · Modo completo · ES",
    desc: "Marcador + goleador, paginado de 20 en 20 (3 páginas). Mi fila resaltada, marcador exacto en verde, punto verde si el goleador marcó. Estrecha la ventana para el móvil.",
  },
  {
    locale: "es",
    showScorer: false,
    rows: ROWS_NO_SCORER,
    heading: "Liga de 50 · Modo marcador / solo ganador · ES",
    desc: "Sin columna de goleador (esos modos no la predicen).",
  },
  {
    locale: "en",
    showScorer: true,
    rows: ROWS,
    heading: "Liga de 50 · Modo completo · EN",
    desc: "Misma tabla paginada en inglés para revisar el i18n.",
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
        description="Cuando empieza un partido (saque inicial), cada miembro de tu liga ve las predicciones del resto. Con ligas grandes la tabla se pagina (20 por página). Mock de una liga de 50 personas."
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
