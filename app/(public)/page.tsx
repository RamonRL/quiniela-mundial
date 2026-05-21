import Image from "next/image";
import Link from "next/link";
import { asc, gte, inArray } from "drizzle-orm";
import {
  ArrowRight,
  CalendarDays,
  Crown,
  Goal,
  ListChecks,
  MapPin,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { matches, teams } from "@/lib/db/schema";
import { TeamFlag } from "@/components/brand/team-flag";
import { formatDateTime } from "@/lib/utils";
import { FAQPageLD, SportsEventLD, WebSiteLD } from "@/components/seo/jsonld";
import { AnswerText } from "@/components/faq/answer-text";
import { NewsCard } from "@/components/news/news-card";
import { listPublishedNews } from "@/lib/news/queries";

// El desvío de logueados a /dashboard vive en el middleware, no aquí
// — así esta página no lee cookies y queda preparada para cache. Las
// queries a DB se regeneran cada 10 minutos vía ISR; lo único que se
// mueve dentro de esa ventana son los próximos partidos destacados
// (a medida que pasan) y la lista de noticias publicadas. 10 min es
// suficiente granularidad sin saturar la DB.
export const revalidate = 600;

const KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

// FAQ usadas también para JSON-LD FAQPage. Cada pregunta apunta a una
// keyword objetivo en español ("quiniela mundial gratis", "código de
// invitación", "android iOS", "máximo participantes").
const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Cómo funciona Quiniela Mundial 2026?",
    a: "Te unes a una quiniela (la pública o una privada con código de 4 dígitos), predices las posiciones de los 12 grupos, el bracket completo, los goleadores, los marcadores partido a partido y otras predicciones especiales. Vas sumando puntos según aciertes. Hay ranking general y por liga.",
  },
  {
    q: "¿Es gratis hacer una quiniela?",
    a: "Sí, hasta 20 miembros por quiniela privada. Puedes crear hasta 5 privadas gratis con tus amigos y participar siempre en la Quiniela Pública. Para empresas o grupos más grandes (50, 100 o 250 miembros), tenemos Pases Mundial 2026 desde 29 € — mira /precios.",
  },
  {
    q: "¿Hay planes para empresas y grupos grandes?",
    a: "Sí. La versión Free aguanta hasta 20 miembros por quiniela. Para empresas, comunidades o eventos con más gente hay Pases Mundial 2026 que escalan la liga a 50, 100 o 250 miembros. Pago único por torneo, vía PayPal previo contacto. Detalles en /precios.",
  },
  {
    q: "¿Hay app para iPhone y Android?",
    a: "Funciona como Progressive Web App: desde Safari (iPhone/iPad) o Chrome (Android) puedes 'Añadir a pantalla de inicio' y se comporta como una app nativa, en pantalla completa y con su icono propio.",
  },
  {
    q: "¿Cuándo y dónde se juega el Mundial 2026?",
    a: "Del 11 de junio al 19 de julio de 2026 en Estados Unidos, Canadá y México. Es la primera edición con 48 selecciones, 12 grupos, 104 partidos y 16 sedes repartidas entre los tres países anfitriones.",
  },
  {
    q: "¿Cómo me uno a la quiniela de mis amigos?",
    a: "Pídele al creador el código de 4 dígitos o el enlace de invitación. Lo introduces en la pantalla de unirme y entras al instante. Cada usuario puede pertenecer a la pública más 5 quinielas privadas.",
  },
  {
    q: "¿Puedo cambiar mi predicción después?",
    a: "Sí, mientras no se haya cerrado la jornada o la fase. Cada categoría tiene su deadline (la fase de grupos cierra en el kickoff del primer partido de la jornada; los marcadores cierran al inicio de cada partido).",
  },
  {
    q: "¿Quién organiza el torneo y publica los partidos?",
    a: "El Mundial 2026 lo organiza la FIFA. Esta web no está afiliada — es solo una herramienta de predicciones. Toda la información de calendario, grupos y sedes refleja la programación oficial publicada por FIFA.",
  },
  {
    q: "¿Cuántas quinielas privadas puedo crear o unirme?",
    a: "Hasta 5 privadas por usuario, además de la Quiniela Pública (siempre activa). Puedes ser creador de unas y simple participante en otras; cada una con su propio ranking.",
  },
];

export default async function HomePage() {
  // Próximos 6 partidos para el destacado del calendario. Si la base
  // está vacía (entorno fresco), simplemente no se renderiza la sección.
  const now = new Date();
  const featuredMatches = await db
    .select()
    .from(matches)
    .where(gte(matches.scheduledAt, now))
    .orderBy(asc(matches.scheduledAt))
    .limit(6);
  const teamIds = Array.from(
    new Set(
      featuredMatches.flatMap((m) =>
        [m.homeTeamId, m.awayTeamId].filter((x): x is number => x != null),
      ),
    ),
  );
  const teamRows =
    teamIds.length > 0
      ? await db.select().from(teams).where(inArray(teams.id, teamIds))
      : [];
  const teamMap = new Map(teamRows.map((t) => [t.id, t]));

  // Las 48 selecciones, en orden alfabético: alimenta la tira visual del
  // hero. Es una sola query barata y nos da masa visual sin meter texto.
  const allTeams = await db
    .select({ id: teams.id, code: teams.code, name: teams.name })
    .from(teams)
    .orderBy(asc(teams.name));

  // Últimas noticias para la sección editorial del home. 3 cards entre
  // "El torneo" y "Explora el torneo". Si aún no hay noticias publicadas
  // simplemente no renderizamos la sección.
  const latestNews = await listPublishedNews({ limit: 3 });

  const daysToKickoff = Math.max(
    0,
    Math.ceil((KICKOFF.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="space-y-20">
      <WebSiteLD />
      <SportsEventLD />
      <FAQPageLD faqs={FAQS} />

      {/* ───────── HERO ─────────
          Minimalista, mismo lenguaje que /login: centrado, eyebrow con
          reglas a ambos lados, h1 conciso y línea editorial corta. Las
          keywords ricas (calendario, bracket, goleadores, código de 4
          dígitos, etc.) viven en las secciones de abajo, así que ningún
          recorte aquí afecta al SEO.
      */}
      <section className="relative -mx-4 overflow-hidden border-b border-[var(--color-border)] px-4 pb-16 pt-12 sm:pt-20 lg:-mx-8 lg:px-8">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--color-arena) 28%, transparent), transparent 70%)",
          }}
        />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-7 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <Image
              src="/fwc26.png"
              alt="FIFA World Cup 26"
              width={1500}
              height={1500}
              priority
              className="h-20 w-auto sm:h-24"
            />
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Copa Mundial de la FIFA 2026
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-[var(--color-arena)]" />
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-arena)]">
              11 jun – 19 jul · USA · México · Canadá
            </p>
            <span className="h-px w-10 bg-[var(--color-arena)]" />
          </div>

          <h1 className="font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl">
            Quiniela Mundial 2026
          </h1>

          <p className="max-w-xl font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-lg">
            Predice los 104 partidos del Mundial con tu grupo de amigos, tu equipo o
            toda tu empresa.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link
              href="/login?next=%2Fonboarding"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
            >
              Crear quiniela
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              Unirme con código
            </Link>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="relative flex size-2">
              <span
                aria-hidden
                className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70"
              />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--color-arena)]" />
            </span>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              T-{daysToKickoff.toString().padStart(2, "0")} días al kickoff
            </p>
          </div>
        </div>

        {/* ─── Tira de las 48 selecciones — 12 cols móvil (4 filas) /
            24 cols desktop (2 filas) ─── */}
        {allTeams.length > 0 && (
          <div className="relative mx-auto mt-14 w-full max-w-5xl">
            <div className="flex items-center justify-center gap-3 pb-4">
              <span className="h-px w-6 bg-[var(--color-arena)]" />
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                Las {allTeams.length} selecciones clasificadas
              </p>
              <span className="h-px w-6 bg-[var(--color-arena)]" />
            </div>
            <ul className="grid grid-cols-12 gap-1.5 sm:gap-2 lg:grid-cols-[repeat(24,minmax(0,1fr))]">
              {allTeams.map((t) => (
                <li
                  key={t.id}
                  className="aspect-square transition hover:scale-110"
                >
                  <Link
                    href={`/equipos/${t.code}`}
                    title={t.name}
                    aria-label={t.name}
                    className="block size-full rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
                  >
                    <TeamFlag code={t.code} fluid />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ───────── CÓMO FUNCIONA ───────── */}
      <section className="space-y-6">
        <header className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Cómo funciona
          </p>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            Te unes, predices, comparas, ganas
          </h2>
          <p className="max-w-3xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            Una quiniela del Mundial entre amigos sin Excel ni grupos de WhatsApp
            con capturas: la app guarda las predicciones, calcula los puntos en
            tiempo real y muestra el ranking en cada momento del torneo.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StepCard
            n={1}
            icon={<Users className="size-5" />}
            title="Crea o únete"
            text="Crea tu quiniela privada y reparte el código de 4 dígitos, o únete con el de tus amigos."
          />
          <StepCard
            n={2}
            icon={<ListChecks className="size-5" />}
            title="Predice"
            text="Posiciones de los 12 grupos, bracket completo FIFA, Bota de Oro y marcadores partido a partido."
          />
          <StepCard
            n={3}
            icon={<Trophy className="size-5" />}
            title="Compite"
            text="Conforme se juegan los partidos, los puntos se suman al instante. El ranking se actualiza en vivo."
          />
          <StepCard
            n={4}
            icon={<Crown className="size-5" />}
            title="Gana"
            text="El que mejor lea el torneo gana. Premio: la gloria, lo que pacten los amigos, o ambas."
          />
        </div>
      </section>

      {/* ───────── EL TORNEO ───────── */}
      <section className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div className="space-y-5">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            El torneo
          </p>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            Primera edición a 48 selecciones
          </h2>
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            El Mundial 2026 estrena formato: <strong className="not-italic font-semibold">12 grupos</strong> de
            cuatro equipos, top 2 + los 8 mejores terceros pasan a una nueva
            ronda de dieciseisavos (R32). Después: octavos, cuartos,
            semifinales y final el <strong className="not-italic font-semibold">19 de julio en Nueva York-NJ</strong>.
            Un total de <strong className="not-italic font-semibold">104 partidos en 39 días</strong> repartidos
            entre Estados Unidos, Canadá y México.
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile big="48" label="Selecciones" />
            <StatTile big="12" label="Grupos" />
            <StatTile big="104" label="Partidos" />
            <StatTile big="16" label="Sedes" />
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/calendario"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              Ver calendario completo
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/grupos"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              Los 12 grupos
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/equipos"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              48 selecciones
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/sedes"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              16 sedes
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div
            aria-hidden
            className="pitch-grid absolute inset-0 opacity-25"
          />
          <div className="relative space-y-4">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
              Próximos partidos destacados
            </p>
            {featuredMatches.length === 0 ? (
              <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                Calendario pendiente de publicar.
              </p>
            ) : (
              <ul className="space-y-2">
                {featuredMatches.map((m) => {
                  const home = m.homeTeamId ? teamMap.get(m.homeTeamId) : null;
                  const away = m.awayTeamId ? teamMap.get(m.awayTeamId) : null;
                  return (
                    <li key={m.id}>
                      <div className="group relative flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 transition hover:border-[var(--color-arena)]/40">
                        <Link
                          href={`/partido/${m.id}`}
                          aria-label={`Partido ${home?.name ?? "TBD"} vs ${away?.name ?? "TBD"}`}
                          className="absolute inset-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
                        />
                        <span className="relative flex min-w-0 items-center gap-2">
                          {home ? (
                            <Link
                              href={`/equipos/${home.code}`}
                              className="flex shrink-0 items-center gap-1 rounded-full px-0.5 hover:opacity-80"
                              aria-label={home.name}
                            >
                              <TeamFlag code={home.code} size={20} />
                            </Link>
                          ) : (
                            <TeamFlag code={undefined} size={20} />
                          )}
                          <span className="truncate text-sm font-medium">
                            {home ? (
                              <Link
                                href={`/equipos/${home.code}`}
                                className="hover:text-[var(--color-arena)]"
                              >
                                {home.name}
                              </Link>
                            ) : (
                              "TBD"
                            )}{" "}
                            <span className="text-[var(--color-muted-foreground)]">·</span>{" "}
                            {away ? (
                              <Link
                                href={`/equipos/${away.code}`}
                                className="hover:text-[var(--color-arena)]"
                              >
                                {away.name}
                              </Link>
                            ) : (
                              "TBD"
                            )}
                          </span>
                          {away ? (
                            <Link
                              href={`/equipos/${away.code}`}
                              className="flex shrink-0 items-center gap-1 rounded-full px-0.5 hover:opacity-80"
                              aria-label={away.name}
                            >
                              <TeamFlag code={away.code} size={20} />
                            </Link>
                          ) : (
                            <TeamFlag code={undefined} size={20} />
                          )}
                        </span>
                        <span className="relative shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                          {formatDateTime(m.scheduledAt, {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ───────── ÚLTIMAS NOTICIAS ─────────
          Sección editorial frecuente — señal de "sitio vivo" a Google
          y captura long-tail tipo "convocatoria España mundial" /
          "previa partido inaugural". Va aquí (entre EL TORNEO y
          EXPLORA) para no robarle el hueco al hero ni al onboarding.
      */}
      {latestNews.length > 0 ? (
        <section className="space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                <Newspaper className="size-3.5 text-[var(--color-arena)]" />
                Últimas noticias
              </p>
              <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
                Convocatorias, previas y todo el Mundial
              </h2>
              <p className="max-w-3xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
                Lo último de las 48 selecciones, lesiones de última hora,
                previas con alineaciones probables y crónicas partido a
                partido. Actualizado a diario durante el torneo.
              </p>
            </div>
            <Link
              href="/noticias"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              Ver todas
              <ArrowRight className="size-3.5" />
            </Link>
          </header>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latestNews.map((n) => (
              <li key={n.id}>
                <NewsCard {...n} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ───────── EXPLORA EL TORNEO (hub interno + SEO) ───────── */}
      <section className="space-y-6">
        <header className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Explora el torneo
          </p>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            Todo el Mundial 2026, organizado
          </h2>
          <p className="max-w-3xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            Calendario completo, los 12 grupos, el bracket FIFA con su cruz hasta
            la final, la tabla de máximos goleadores, las 48 selecciones y las 16
            sedes. Toda la información en abierto, sin registro.
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ExploreCard
            href="/calendario"
            icon={<CalendarDays className="size-5" />}
            title="Calendario completo"
            text="Los 104 partidos del Mundial 2026 ordenados por fecha y jornada."
          />
          <ExploreCard
            href="/grupos"
            icon={<Users className="size-5" />}
            title="Los 12 grupos"
            text="Las cuatro selecciones de cada grupo y sus enfrentamientos directos."
          />
          <ExploreCard
            href="/bracket"
            icon={<Swords className="size-5" />}
            title="Bracket eliminatorio"
            text="El cuadro FIFA: dieciseisavos, octavos, cuartos, semifinales y final."
            primary
          />
          <ExploreCard
            href="/goleadores"
            icon={<Target className="size-5" />}
            title="Máximos goleadores"
            text="La carrera por la Bota de Oro 2026 actualizada partido a partido."
          />
          <ExploreCard
            href="/equipos"
            icon={<Trophy className="size-5" />}
            title="48 selecciones"
            text="Plantilla completa de cada selección clasificada al Mundial 2026."
          />
          <ExploreCard
            href="/sedes"
            icon={<MapPin className="size-5" />}
            title="16 sedes"
            text="Estadios y ciudades de Estados Unidos, Canadá y México que acogen el torneo."
          />
        </div>
      </section>

      {/* ───────── 6 CATEGORÍAS DE PREDICCIÓN ───────── */}
      <section className="space-y-6">
        <header className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Las 6 categorías
          </p>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            Seis formas de sumar puntos
          </h2>
          <p className="max-w-3xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            La quiniela no se limita a marcadores. Combinas predicciones a largo
            plazo (grupos, bracket, goleador del torneo) con apuestas más
            inmediatas (marcador exacto y goleador de cada partido).
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CategoryCard
            icon={<Users className="size-5" />}
            title="Posiciones por grupo"
            text="Ordenas los 4 equipos de cada uno de los 12 grupos. Cierra al inicio del torneo."
          />
          <CategoryCard
            icon={<Swords className="size-5" />}
            title="Bracket FIFA completo"
            text="R32, octavos, cuartos, semifinales y final. Predices la cruz entera y al campeón."
          />
          <CategoryCard
            icon={<Target className="size-5" />}
            title="Goleador del torneo"
            text="Tu Bota de Oro. Si tu jugador acaba como máximo goleador, set de puntos extra."
          />
          <CategoryCard
            icon={<Goal className="size-5" />}
            title="Marcadores partido a partido"
            text="Predices el resultado exacto de cada partido. Bonus por acertar marcador y ganador."
          />
          <CategoryCard
            icon={<Sparkles className="size-5" />}
            title="Goleador por partido"
            text="Eliges quién marca en cada uno de los 104 enfrentamientos."
          />
          <CategoryCard
            icon={<ShieldCheck className="size-5" />}
            title="Predicciones especiales"
            text="Preguntas estilo '¿habrá tanda de penales en cuartos?'. Sorpresas con peso."
          />
        </div>
      </section>

      {/* ───────── EMPRESAS ───────── */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--color-arena) 28%, transparent), transparent 70%)",
          }}
        />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1.3fr_auto] lg:gap-10">
          <div className="space-y-3">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
              Empresas y grupos grandes
            </p>
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
              ¿Una quiniela para todo el equipo?
            </h2>
            <p className="max-w-2xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
              Las quinielas privadas Free aguantan 20 miembros. Para empresas,
              comunidades o eventos con más gente, los Pases Mundial 2026
              amplían el tope de miembros y añaden logo corporativo y soporte
              prioritario. Pago único por torneo.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
            <Link
              href="/precios"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
            >
              Ver planes
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/contacto#empresas"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              Contactar
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="space-y-6">
        <header className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Preguntas frecuentes
          </p>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            Lo que la gente pregunta
          </h2>
        </header>
        <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {FAQS.map((f, i) => (
            <details key={i} className="group px-5 py-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
                <span className="font-display text-base tracking-tight">{f.q}</span>
                <span
                  aria-hidden
                  className="font-mono text-xs text-[var(--color-arena)] transition group-open:rotate-45"
                >
                  ＋
                </span>
              </summary>
              <p className="pt-3 font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
                <AnswerText text={f.a} />
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ───────── CTA FINAL ───────── */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] p-8 text-center sm:p-12">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div className="relative space-y-4">
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            Tu quiniela del Mundial está a un click
          </h2>
          <p className="mx-auto max-w-2xl font-editorial text-sm italic text-[var(--color-muted-foreground)] sm:text-base">
            Crea la tuya, comparte el código con los tuyos y que empiece la pelea.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/login?next=%2Fonboarding"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
            >
              Empezar gratis
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/precios"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              Planes para empresas
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── FOOTER LINKS ───────── */}
      <footer className="border-t border-[var(--color-border)] pt-8 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/qm-mark.png"
              alt="Quiniela Mundial"
              width={940}
              height={973}
              className="size-10 object-contain"
            />
            <div>
              <p className="font-display text-base tracking-tight">Quiniela Mundial 2026</p>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                quinielamundial.es
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            <Link href="/calendario" className="hover:text-[var(--color-arena)]">Calendario</Link>
            <Link href="/grupos" className="hover:text-[var(--color-arena)]">Grupos</Link>
            <Link href="/bracket" className="hover:text-[var(--color-arena)]">Bracket</Link>
            <Link href="/goleadores" className="hover:text-[var(--color-arena)]">Goleadores</Link>
            <Link href="/noticias" className="hover:text-[var(--color-arena)]">Noticias</Link>
            <Link href="/equipos" className="hover:text-[var(--color-arena)]">Selecciones</Link>
            <Link href="/sedes" className="hover:text-[var(--color-arena)]">Sedes</Link>
            <Link href="/login" className="hover:text-[var(--color-arena)]">Entrar</Link>
          </nav>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--color-border)] pt-4 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]/80">
          <Link href="/aviso-legal" className="hover:text-[var(--color-arena)]">Aviso legal</Link>
          <span aria-hidden>·</span>
          <Link href="/privacidad" className="hover:text-[var(--color-arena)]">Privacidad</Link>
          <span aria-hidden>·</span>
          <Link href="/cookies" className="hover:text-[var(--color-arena)]">Cookies</Link>
          <span aria-hidden>·</span>
          <Link href="/terminos" className="hover:text-[var(--color-arena)]">Términos</Link>
          <span aria-hidden>·</span>
          <Link href="/contacto" className="hover:text-[var(--color-arena)]">Contacto</Link>
        </div>
      </footer>
    </div>
  );
}

// ─────────── Helpers ───────────

function StepCard({
  n,
  icon,
  title,
  text,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <span className="absolute -right-3 -top-3 font-display text-7xl leading-none tracking-tighter text-[var(--color-arena)]/10">
        {n.toString().padStart(2, "0")}
      </span>
      <div className="relative space-y-2.5">
        <span className="grid size-9 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
          {icon}
        </span>
        <h3 className="font-display text-xl tracking-tight">{title}</h3>
        <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
          {text}
        </p>
      </div>
    </article>
  );
}

function ExploreCard({
  href,
  icon,
  title,
  text,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col gap-2.5 overflow-hidden rounded-xl border p-5 transition-all hover:-translate-y-0.5 ${
        primary
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] hover:border-[var(--color-arena)] hover:shadow-[var(--shadow-arena)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-arena)]/40 hover:shadow-[var(--shadow-elev-1)]"
      }`}
    >
      <span
        className={`grid size-9 place-items-center rounded-md ${
          primary
            ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
            : "bg-[var(--color-surface-2)] text-[var(--color-arena)]"
        }`}
      >
        {icon}
      </span>
      <h3 className="font-display text-xl tracking-tight">{title}</h3>
      <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
        {text}
      </p>
      <span className="mt-1 inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-arena)] transition-transform group-hover:translate-x-1">
        Ir <ArrowRight className="size-3" />
      </span>
    </Link>
  );
}

function CategoryCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2.5 pb-2">
        <span className="grid size-8 place-items-center rounded-md border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] text-[var(--color-arena)]">
          {icon}
        </span>
        <h3 className="font-display text-lg tracking-tight">{title}</h3>
      </div>
      <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
        {text}
      </p>
    </article>
  );
}

function StatTile({ big, label }: { big: string; label: string }) {
  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="font-display tabular text-3xl leading-none tracking-tight text-[var(--color-arena)] sm:text-4xl">
        {big}
      </p>
      <p className="pt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
    </li>
  );
}
