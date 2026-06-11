import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import { HeroCard, type HeroData } from "@/components/dashboard/hero-card";

export const metadata = { title: "Preview · Admin" };
export const dynamic = "force-dynamic";

const T = (code: string, name: string) => ({ code, name });

type Scenario = { title: string; desc: string; data: (at: (min: number) => string) => HeroData };

const SCENARIOS: Scenario[] = [
  {
    title: "A · Antes del primer partido",
    desc: "Aún no se ha jugado nada: el siguiente partido es el protagonista con su cuenta atrás y el aviso (en rojo) de que falta el pronóstico. Debajo, los dos siguientes en la tira.",
    data: (at) => ({
      featuredKind: "next",
      featured: [
        {
          code: "M1", group: "A", status: "upcoming",
          home: T("MEX", "México"), away: T("CAN", "Canadá"),
          kickoffISO: at(2880), dateLabel: "Jueves 11 de junio, 21:00", venue: "Estadio Azteca",
          prediction: { hasResult: false, href: "/predicciones" },
        },
      ],
      context: [
        { code: "M2", group: "D", status: "upcoming", home: T("USA", "EE. UU."), away: T("WAL", "Gales"), dateLabel: "12 jun · 18:00" },
        { code: "M3", group: "E", status: "upcoming", home: T("ARG", "Argentina"), away: T("KSA", "Arabia S."), dateLabel: "12 jun · 21:00" },
      ],
    }),
  },
  {
    title: "B · Caso normal (mitad de torneo)",
    desc: "El siguiente partido con su cuenta atrás y el pronóstico ya puesto (recordatorio sutil 'editar'). Tira: el anterior con marcador y el posterior.",
    data: (at) => ({
      featuredKind: "next",
      featured: [
        {
          code: "M23", group: "E", status: "upcoming",
          home: T("ESP", "España"), away: T("GER", "Alemania"),
          kickoffISO: at(150), dateLabel: "Hoy, 21:00", venue: "MetLife Stadium",
          prediction: { hasResult: true, href: "/predicciones" },
        },
      ],
      context: [
        { code: "M22", group: "C", status: "finished", home: T("BRA", "Brasil"), away: T("ARG", "Argentina"), homeScore: 2, awayScore: 1 },
        { code: "M24", group: "G", status: "upcoming", home: T("FRA", "Francia"), away: T("POR", "Portugal"), dateLabel: "Mañana · 18:00" },
      ],
    }),
  },
  {
    title: "C · Última jornada de grupos (solo queda 1 partido)",
    desc: "El de después aún es TBD, así que la tira retrocede: los dos anteriores con marcador, y el último por jugar como protagonista.",
    data: (at) => ({
      featuredKind: "next",
      featured: [
        {
          code: "M72", group: "L", status: "upcoming",
          home: T("KOR", "Corea del Sur"), away: T("GHA", "Ghana"),
          kickoffISO: at(90), dateLabel: "Hoy, 20:00", venue: "BC Place",
          prediction: { hasResult: false, href: "/predicciones" },
        },
      ],
      context: [
        { code: "M70", group: "K", status: "finished", home: T("URU", "Uruguay"), away: T("SUI", "Suiza"), homeScore: 0, awayScore: 0 },
        { code: "M71", group: "L", status: "finished", home: T("CRO", "Croacia"), away: T("MAR", "Marruecos"), homeScore: 1, awayScore: 2 },
      ],
    }),
  },
  {
    title: "D · Un partido en juego",
    desc: "El directo manda: marcador en vivo con minuto y goleadores ocupa el cuerpo. El siguiente queda en la tira con un mini-contador.",
    data: (at) => ({
      featuredKind: "live",
      featured: [
        {
          code: "M30", group: "F", status: "live",
          home: T("ITA", "Italia"), away: T("BEL", "Bélgica"),
          homeScore: 1, awayScore: 0, minute: 34,
          scorers: [{ name: "Retegui", teamCode: "ITA", minute: 22, isOwnGoal: false, isPenalty: false }],
        },
      ],
      context: [
        { code: "M31", group: "F", status: "upcoming", home: T("ENG", "Inglaterra"), away: T("NED", "Países Bajos"), kickoffISO: at(120) },
        { code: "M32", group: "G", status: "upcoming", home: T("JPN", "Japón"), away: T("SEN", "Senegal"), dateLabel: "Mañana · 18:00" },
      ],
    }),
  },
  {
    title: "E · El siguiente y el posterior, a la misma hora",
    desc: "Dos partidos arrancan a la vez: el siguiente es protagonista y el simultáneo aparece en la tira con la etiqueta '· a la vez'.",
    data: (at) => ({
      featuredKind: "next",
      featured: [
        {
          code: "M47", group: "H", status: "upcoming",
          home: T("POR", "Portugal"), away: T("URU", "Uruguay"),
          kickoffISO: at(200), dateLabel: "Hoy, 22:00", venue: "Hard Rock Stadium",
          prediction: { hasResult: true, href: "/predicciones" },
        },
      ],
      context: [
        { code: "M45", group: "G", status: "finished", home: T("COL", "Colombia"), away: T("ECU", "Ecuador"), homeScore: 3, awayScore: 1 },
        { code: "M48", group: "H", status: "upcoming", home: T("GHA", "Ghana"), away: T("KOR", "Corea del Sur"), dateLabel: "Hoy · 22:00", note: "· a la vez" },
      ],
    }),
  },
  {
    title: "F · Dos partidos en juego a la vez",
    desc: "El cuerpo se parte en dos marcadores en vivo (apilan en móvil). El siguiente queda en la tira con mini-contador.",
    data: (at) => ({
      featuredKind: "live",
      featured: [
        {
          code: "M16", group: "B", status: "live",
          home: T("FRA", "Francia"), away: T("DEN", "Dinamarca"),
          homeScore: 0, awayScore: 0, minute: 12,
        },
        {
          code: "M17", group: "C", status: "live",
          home: T("ESP", "España"), away: T("JPN", "Japón"),
          homeScore: 2, awayScore: 1, minute: 12,
          scorers: [
            { name: "Yamal", teamCode: "ESP", minute: 5, isOwnGoal: false, isPenalty: false },
            { name: "Mitoma", teamCode: "JPN", minute: 9, isOwnGoal: false, isPenalty: false },
          ],
        },
      ],
      context: [
        { code: "M18", group: "B", status: "upcoming", home: T("CRO", "Croacia"), away: T("MAR", "Marruecos"), kickoffISO: at(75) },
      ],
    }),
  },
  {
    title: "G · Nombres largos + fase final (octavos)",
    desc: "Prueba de estrés: nombres largos (Bosnia y Herzegovina, República Checa…) para ver saltos de línea / truncado, y la etiqueta de RONDA (Octavos) en vez de grupo.",
    data: (at) => ({
      featuredKind: "next",
      featured: [
        {
          code: "M89", stage: "r16", status: "upcoming",
          home: T("BIH", "Bosnia y Herzegovina"), away: T("CZE", "República Checa"),
          kickoffISO: at(300), dateLabel: "Hoy, 21:00", venue: "AT&T Stadium",
          prediction: { hasResult: false, href: "/predicciones" },
        },
      ],
      context: [
        { code: "M88", stage: "r16", status: "finished", home: T("KOR", "Corea del Sur"), away: T("CIV", "Costa de Marfil"), homeScore: 2, awayScore: 1 },
        { code: "M90", stage: "r16", status: "upcoming", home: T("USA", "Estados Unidos"), away: T("KSA", "Arabia Saudí"), dateLabel: "Mañana · 18:00" },
      ],
    }),
  },
];

export default async function PreviewPage() {
  await requireAdmin();
  const now = Date.now();
  const at = (min: number) => new Date(now + min * 60000).toISOString();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Preview"
        description="Maquetas en pruebas, visibles solo para ti. El resto de usuarios sigue viendo el dashboard normal. Estrecha la ventana para ver el móvil."
      />

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-tight">
          Dashboard · card principal en modo torneo (marcador de retransmisión)
        </h2>
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          El protagonista son los partidos en directo si los hay; si no, el siguiente con su cuenta
          atrás. Debajo, la tira de contexto. Abajo, las casuísticas con su descripción.
        </p>

        <div className="space-y-10">
          {SCENARIOS.map((sc) => (
            <div key={sc.title} className="space-y-2">
              <div>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
                  {sc.title}
                </p>
                <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                  {sc.desc}
                </p>
              </div>
              <HeroCard data={sc.data(at)} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
