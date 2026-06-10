import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import { NextMatchCountdown, type CountdownLabels } from "@/components/dashboard/next-match-countdown";
import { MatchWindow, type MatchWindowRow, type MatchWindowLabels } from "@/components/dashboard/match-window";

export const metadata = { title: "Preview · Admin" };
export const dynamic = "force-dynamic";

const COUNTDOWN_LABELS: CountdownLabels = {
  eyebrow: "Próximo partido",
  live: "¡En juego!",
  units: { d: "días", h: "horas", m: "min", s: "seg" },
  group: "Grupo",
  predDone: "Ya tienes pronóstico · editable hasta el inicio",
  predDoneCta: "Editar",
  predMissing: "Aún no has puesto tu pronóstico de este partido",
  predMissingHint: "Puedes hacerlo hasta que empiece",
  predMissingCta: "Predecir",
};
const WINDOW_LABELS: MatchWindowLabels = { next: "Próximo", live: "En vivo", final: "Final" };

const T = (code: string, name: string) => ({ code, name });

type Scenario = {
  title: string;
  desc: string;
  next: {
    home: { code: string; name: string };
    away: { code: string; name: string };
    group: string | null;
    code: string;
    kickoffMin: number; // offset desde ahora (min)
    dateLabel: string;
    hasResult: boolean;
  };
  rows: MatchWindowRow[];
};

const SCENARIOS: Scenario[] = [
  {
    title: "A · Antes del primer partido",
    desc: "Aún no se ha jugado nada: no hay 'anterior', así que arriba va el primer partido y debajo los dos siguientes. Aviso de que falta el pronóstico.",
    next: { home: T("MEX", "México"), away: T("CAN", "Canadá"), group: "A", code: "M1", kickoffMin: 2880, dateLabel: "Jueves 11 de junio, 21:00", hasResult: false },
    rows: [
      { code: "M1", home: T("MEX", "México"), away: T("CAN", "Canadá"), state: "upcoming", timeLabel: "11 jun · 21:00", isNext: true },
      { code: "M2", home: T("USA", "EE. UU."), away: T("WAL", "Gales"), state: "upcoming", timeLabel: "12 jun · 18:00" },
      { code: "M3", home: T("ARG", "Argentina"), away: T("KSA", "Arabia S."), state: "upcoming", timeLabel: "12 jun · 21:00" },
    ],
  },
  {
    title: "B · Caso normal (mitad de torneo)",
    desc: "El anterior ya tiene marcador, en medio el siguiente (el del contador) y debajo el posterior. Aquí el usuario ya tiene su pronóstico puesto.",
    next: { home: T("ESP", "España"), away: T("GER", "Alemania"), group: "E", code: "M23", kickoffMin: 150, dateLabel: "Hoy, 21:00", hasResult: true },
    rows: [
      { code: "M22", home: T("BRA", "Brasil"), away: T("ARG", "Argentina"), state: "finished", homeScore: 2, awayScore: 1 },
      { code: "M23", home: T("ESP", "España"), away: T("GER", "Alemania"), state: "upcoming", timeLabel: "Hoy · 21:00", isNext: true },
      { code: "M24", home: T("FRA", "Francia"), away: T("POR", "Portugal"), state: "upcoming", timeLabel: "Mañana · 18:00" },
    ],
  },
  {
    title: "C · Última jornada de grupos (solo queda 1 partido)",
    desc: "El siguiente es el último con rivales definidos (el de después aún es TBD), así que la ventana retrocede: los dos anteriores con marcador y, abajo, el que queda por jugarse.",
    next: { home: T("KOR", "Corea del Sur"), away: T("GHA", "Ghana"), group: "L", code: "M72", kickoffMin: 90, dateLabel: "Hoy, 20:00", hasResult: false },
    rows: [
      { code: "M70", home: T("URU", "Uruguay"), away: T("SUI", "Suiza"), state: "finished", homeScore: 0, awayScore: 0 },
      { code: "M71", home: T("CRO", "Croacia"), away: T("MAR", "Marruecos"), state: "finished", homeScore: 1, awayScore: 2 },
      { code: "M72", home: T("KOR", "Corea del Sur"), away: T("GHA", "Ghana"), state: "upcoming", timeLabel: "Hoy · 20:00", isNext: true },
    ],
  },
  {
    title: "D · Un partido en juego",
    desc: "El 'anterior' está EN VIVO con su marcador en directo (punto pulsante + minuto). El contador de la izquierda sigue apuntando al siguiente que aún no ha empezado.",
    next: { home: T("ENG", "Inglaterra"), away: T("NED", "Países Bajos"), group: "F", code: "M31", kickoffMin: 120, dateLabel: "Hoy, 21:00", hasResult: true },
    rows: [
      { code: "M30", home: T("ITA", "Italia"), away: T("BEL", "Bélgica"), state: "live", homeScore: 1, awayScore: 0, minute: 34 },
      { code: "M31", home: T("ENG", "Inglaterra"), away: T("NED", "Países Bajos"), state: "upcoming", timeLabel: "Hoy · 21:00", isNext: true },
      { code: "M32", home: T("JPN", "Japón"), away: T("SEN", "Senegal"), state: "upcoming", timeLabel: "Mañana · 18:00" },
    ],
  },
  {
    title: "E · El siguiente y el posterior, a la misma hora",
    desc: "Cuando dos partidos arrancan a la vez, salen ambos con la misma hora. El contador apunta a uno (el siguiente) y debajo el simultáneo.",
    next: { home: T("POR", "Portugal"), away: T("URU", "Uruguay"), group: "H", code: "M47", kickoffMin: 200, dateLabel: "Hoy, 22:00", hasResult: true },
    rows: [
      { code: "M45", home: T("COL", "Colombia"), away: T("ECU", "Ecuador"), state: "finished", homeScore: 3, awayScore: 1 },
      { code: "M47", home: T("POR", "Portugal"), away: T("URU", "Uruguay"), state: "upcoming", timeLabel: "Hoy · 22:00", isNext: true },
      { code: "M48", home: T("GHA", "Ghana"), away: T("KOR", "Corea del Sur"), state: "upcoming", timeLabel: "Hoy · 22:00" },
    ],
  },
  {
    title: "F · Dos partidos en juego a la vez",
    desc: "La ventana retrocede para enseñar los dos directos simultáneos (ambos EN VIVO) y, abajo, el siguiente que aún no empieza. Aviso de pronóstico pendiente.",
    next: { home: T("CRO", "Croacia"), away: T("MAR", "Marruecos"), group: "B", code: "M18", kickoffMin: 75, dateLabel: "Hoy, 21:00", hasResult: false },
    rows: [
      { code: "M16", home: T("FRA", "Francia"), away: T("DEN", "Dinamarca"), state: "live", homeScore: 0, awayScore: 0, minute: 12 },
      { code: "M17", home: T("ESP", "España"), away: T("JPN", "Japón"), state: "live", homeScore: 2, awayScore: 1, minute: 12 },
      { code: "M18", home: T("CRO", "Croacia"), away: T("MAR", "Marruecos"), state: "upcoming", timeLabel: "Hoy · 21:00", isNext: true },
    ],
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
          Dashboard · hero durante el torneo (contador + ventana de 3 partidos)
        </h2>
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          Izquierda: el siguiente partido con cuenta atrás en vivo y aviso de pronóstico. Derecha:
          la ventana de 3 partidos (anterior · siguiente · posterior, con retroceso según el caso).
          Abajo, cada casuística con su descripción.
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

              <div className="rise-in relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="spotlight absolute inset-0" aria-hidden />
                <div className="pitch-grid absolute inset-0 opacity-30" aria-hidden />
                <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.4fr_1fr]">
                  <NextMatchCountdown
                    kickoffISO={at(sc.next.kickoffMin)}
                    matchCode={sc.next.code}
                    home={sc.next.home}
                    away={sc.next.away}
                    group={sc.next.group}
                    dateLabel={sc.next.dateLabel}
                    prediction={{ hasResult: sc.next.hasResult, href: "/predicciones" }}
                    labels={COUNTDOWN_LABELS}
                  />
                  <MatchWindow rows={sc.rows} labels={WINDOW_LABELS} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
