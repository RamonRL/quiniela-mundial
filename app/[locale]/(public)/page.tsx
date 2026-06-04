import Image from "next/image";
import Link from "next/link";
import { asc, gte, inArray } from "drizzle-orm";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
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
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { matches, teams } from "@/lib/db/schema";
import { Reveal } from "@/components/animation/reveal";
import { Counter } from "@/components/animation/counter";
import { HeroPhones } from "./hero-phones";
import { featureShotsFor } from "./feature-shots";
import { type StaticImageData } from "next/image";
import { TeamFlag } from "@/components/brand/team-flag";
import { formatDateTime } from "@/lib/utils";
import { FAQPageLD, SportsEventLD, WebSiteLD } from "@/components/seo/jsonld";
import { AnswerText } from "@/components/faq/answer-text";
import { NewsCard } from "@/components/news/news-card";
import { listPublishedNews } from "@/lib/news/queries";
import { PREDICTION_MODES } from "@/lib/prediction-modes";

// Icono por modo para la sección "Modos de juego" de la home.
const MODE_ICON = {
  completo: ListChecks,
  marcador: Target,
  solo_ganador: Swords,
} as const;

// El desvío de logueados a /dashboard vive en el middleware, no aquí
// — así esta página no lee cookies y queda preparada para cache. Las
// queries a DB se regeneran cada 10 minutos vía ISR; lo único que se
// mueve dentro de esa ventana son los próximos partidos destacados
// (a medida que pasan) y la lista de noticias publicadas. 10 min es
// suficiente granularidad sin saturar la DB.
export const revalidate = 600;

// Marketing page: en móvil arranca con zoom out (initialScale 0.5 →
// el viewport de layout se duplica y entran los grids sm:, como una
// mini-tablet). El usuario puede pinch-zoomar libremente (sin
// maximumScale/userScalable por a11y/SEO, igual que el layout raíz).
// themeColor/viewportFit se re-declaran porque el viewport de página
// sustituye al del layout campo a campo.
export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1014" },
  ],
  width: "device-width",
  initialScale: 0.5,
  viewportFit: "cover" as const,
};

const KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

// Las FAQ (también usadas para el JSON-LD FAQPage) se construyen dentro de
// HomePage desde el catálogo i18n (home.faqs.q1..q10 / a1..a10).
const FAQ_COUNT = 10;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tNav = await getTranslations("nav");
  const tShell = await getTranslations("shell");
  const tModes = await getTranslations("modes");
  const tPricing = await getTranslations("pricing");
  const shots = featureShotsFor(locale);
  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`faqs.q${i + 1}`),
    a: t(`faqs.a${i + 1}`),
  }));
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
      <FAQPageLD faqs={faqs} />

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
          <Reveal variant="scale" className="flex flex-col items-center gap-1.5">
            <Image
              src="/fwc26.png"
              alt="FIFA World Cup 26"
              width={1500}
              height={1500}
              priority
              className="h-20 w-auto sm:h-24"
            />
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {t("hero.eyebrowFifa")}
            </p>
          </Reveal>

          <Reveal variant="up" delay={80} className="flex items-center gap-3">
            <span className="h-px w-10 bg-[var(--color-arena)]" />
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-arena)]">
              {t("hero.dateRange")}
            </p>
            <span className="h-px w-10 bg-[var(--color-arena)]" />
          </Reveal>

          <Reveal as="h1" variant="up" delay={140} className="font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl">
            Quiniela Mundial 2026
          </Reveal>

          <Reveal as="p" variant="up" delay={200} className="max-w-xl font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-lg">
            {t("hero.subtitle")}
          </Reveal>

          <Reveal variant="up" delay={320} className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link
              href="/login?next=%2Fonboarding"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90 hover:-translate-y-0.5"
            >
              {t("hero.ctaCreate")}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40 hover:-translate-y-0.5"
            >
              {t("hero.ctaJoin")}
            </Link>
          </Reveal>

          <Reveal variant="fade" delay={400} className="flex items-center gap-2 pt-1">
            <span className="relative flex size-2">
              <span
                aria-hidden
                className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70"
              />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--color-arena)]" />
            </span>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {t("hero.kickoff", { days: daysToKickoff.toString().padStart(2, "0") })}
            </p>
          </Reveal>
        </div>

        {/* ─── Capturas de la app: 3 móviles con entrada + parallax sutil ─── */}
        <HeroPhones />

        {/* ─── Tira de las 48 selecciones — 12 cols móvil (4 filas) /
            24 cols desktop (2 filas) ─── */}
        {allTeams.length > 0 && (
          <div className="relative mx-auto mt-14 w-full max-w-5xl">
            <Reveal variant="fade" className="flex items-center justify-center gap-3 pb-4">
              <span className="h-px w-6 bg-[var(--color-arena)]" />
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                {t("hero.teamsQualified", { count: allTeams.length })}
              </p>
              <span className="h-px w-6 bg-[var(--color-arena)]" />
            </Reveal>
            <ul className="grid grid-cols-12 gap-1.5 sm:gap-2 lg:grid-cols-[repeat(24,minmax(0,1fr))]">
              {allTeams.map((t, i) => (
                <Reveal
                  as="li"
                  variant="scale"
                  delay={(i % 12) * 30}
                  key={t.id}
                  className="aspect-square transition-transform duration-200 hover:scale-110"
                >
                  <Link
                    href={`/equipos/${t.code}`}
                    title={t.name}
                    aria-label={t.name}
                    className="block size-full rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-arena)]"
                  >
                    <TeamFlag code={t.code} fluid />
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ───────── CÓMO FUNCIONA ───────── */}
      <section className="space-y-6">
        <Reveal as="header" variant="up" className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("how.eyebrow")}
          </p>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            {t("how.title")}
          </h2>
          <p className="max-w-3xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            {t("how.intro")}
          </p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StepCard
            n={1}
            delay={0}
            icon={<Users className="size-5" />}
            title={t("how.step1Title")}
            text={t("how.step1Text")}
          />
          <StepCard
            n={2}
            delay={90}
            icon={<ListChecks className="size-5" />}
            title={t("how.step2Title")}
            text={t("how.step2Text")}
          />
          <StepCard
            n={3}
            delay={180}
            icon={<Trophy className="size-5" />}
            title={t("how.step3Title")}
            text={t("how.step3Text")}
          />
          <StepCard
            n={4}
            delay={270}
            icon={<Crown className="size-5" />}
            title={t("how.step4Title")}
            text={t("how.step4Text")}
          />
        </div>
      </section>

      {/* ───────── MODOS DE JUEGO ─────────
          Tres formas de jugar según lo a fondo que quieras predecir. Cada
          modo tiene su quiniela pública y se puede elegir al crear una
          privada. Fuente única: PREDICTION_MODE_META. */}
      <section className="space-y-6">
        <Reveal as="header" variant="up" className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("modes.eyebrow")}
          </p>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            {t("modes.title")}
          </h2>
          <p className="max-w-3xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            {t("modes.intro")}
          </p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-3">
          {PREDICTION_MODES.map((m, i) => {
            const Icon = MODE_ICON[m];
            const primary = m === "completo";
            return (
              <Reveal
                as="article"
                variant="up"
                delay={i * 90}
                key={m}
                className={`relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-6 transition-all hover:-translate-y-0.5 ${
                  primary
                    ? "border-[var(--color-arena)]/50 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-arena)]/40"
                }`}
              >
                {primary ? (
                  <span className="absolute right-4 top-4 rounded-full bg-[var(--color-arena)] px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-white">
                    {t("modes.mostPlayed")}
                  </span>
                ) : null}
                <div
                  className={`grid size-11 place-items-center rounded-lg ${
                    primary
                      ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-arena)]"
                  }`}
                >
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.22em] text-[var(--color-arena)]">
                    {tModes(`${m}Tagline`)}
                  </p>
                  <h3 className="font-display text-2xl tracking-tight">{tModes(m)}</h3>
                </div>
                <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
                  {tModes(`${m}Description`)}
                </p>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ───────── EMPRESAS ─────────
          Sección reposicionada arriba (justo tras "Cómo funciona") y
          ampliada con tier-cards + features visibles. Objetivo: que el
          visitante B2B entienda en la primera visita que existe un
          camino claro para grupos grandes, sin tener que scrollear
          hasta el final ni adivinar precios.
      */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-8 sm:p-10">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--color-arena) 32%, transparent), transparent 70%)",
          }}
        />

        <div className="relative space-y-8">
          <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <Reveal variant="up" className="space-y-2">
              <div className="inline-flex items-center gap-2">
                <Building2 className="size-3.5 text-[var(--color-arena)]" />
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
                  {t("empresas.eyebrow")}
                </p>
              </div>
              <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
                {t("empresas.title")}
              </h2>
              <p className="max-w-2xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
                {t("empresas.intro")}
              </p>
            </Reveal>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href="/precios"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
              >
                {t("empresas.seePlans")}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/precios#contacto"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
              >
                {t("empresas.quote")}
              </Link>
            </div>
          </header>

          {/* Las 3 features premium, EN PANTALLA — capturas reales de la
              liga demo. Cada card enlaza a /precios, donde viven los
              showcases grandes. */}
          <ul className="grid gap-3 sm:grid-cols-3">
            <ShotFeature
              delay={0}
              shot={shots.branding}
              alt={tPricing("scBrandAlt")}
              title={t("empresas.shot1Title")}
              text={t("empresas.shot1Text")}
              tier={tPricing("scBrandTier")}
              tierHighlight
            />
            <ShotFeature
              delay={90}
              shot={shots.depts}
              alt={tPricing("scDeptAlt")}
              title={t("empresas.shot2Title")}
              text={t("empresas.shot2Text")}
              tier={tPricing("scDeptTier")}
            />
            <ShotFeature
              delay={180}
              shot={shots.banner}
              alt={tPricing("scBannerAlt")}
              title={t("empresas.shot3Title")}
              text={t("empresas.shot3Text")}
              tier={tPricing("scBannerTier")}
            />
          </ul>

          {/* Tier cards · prices al frente + qué desbloquea cada escalón.
              La escalera tiene que leerse de un vistazo: el Branding entra
              a partir del Pase Empresa. */}
          <div className="grid gap-3 sm:grid-cols-3">
            <TierTeaser
              priceEur={19}
              regularEur={29}
              label={t("empresas.tier1Label")}
              members={t("empresas.tier1Members")}
              perPerson={t("empresas.tier1PerPerson")}
              unlock={t("empresas.tier1Unlock")}
              popularLabel={t("empresas.mostPopular")}
              highlight
              delay={0}
            />
            <TierTeaser
              priceEur={49}
              regularEur={69}
              label={t("empresas.tier2Label")}
              members={t("empresas.tier2Members")}
              perPerson={t("empresas.tier2PerPerson")}
              unlock={t("empresas.tier2Unlock")}
              unlockHighlight
              delay={90}
            />
            <TierTeaser
              priceEur={99}
              regularEur={149}
              label={t("empresas.tier3Label")}
              members={t("empresas.tier3Members")}
              perPerson={t("empresas.tier3PerPerson")}
              unlock={t("empresas.tier3Unlock")}
              delay={180}
            />
          </div>

          <Reveal variant="fade" className="flex items-center justify-center gap-3">
            <span className="h-px w-6 bg-[var(--color-arena)]" />
            <p className="text-center font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
              {t("empresas.onePayment")}
            </p>
            <span className="h-px w-6 bg-[var(--color-arena)]" />
          </Reveal>
        </div>
      </section>

      {/* ───────── EL TORNEO ───────── */}
      <section className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Reveal as="p" variant="up" className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("tournament.eyebrow")}
          </Reveal>
          <Reveal as="h2" variant="up" delay={60} className="font-display text-4xl tracking-tight sm:text-5xl">
            {t("tournament.title")}
          </Reveal>
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            {t.rich("tournament.intro", {
              b: (chunks) => (
                <strong className="not-italic font-semibold">{chunks}</strong>
              ),
            })}
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile big="48" label={t("tournament.statTeams")} delay={0} />
            <StatTile big="12" label={t("tournament.statGroups")} delay={80} />
            <StatTile big="104" label={t("tournament.statMatches")} delay={160} />
            <StatTile big="16" label={t("tournament.statVenues")} delay={240} />
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/calendario"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              {t("tournament.seeCalendar")}
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/grupos"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              {t("tournament.the12Groups")}
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/equipos"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              {t("tournament.the48Teams")}
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/sedes"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              {t("tournament.the16Venues")}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
        <Reveal variant="right" delay={120} className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div
            aria-hidden
            className="pitch-grid absolute inset-0 opacity-25"
          />
          <div className="relative space-y-4">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
              {t("tournament.featuredMatches")}
            </p>
            {featuredMatches.length === 0 ? (
              <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                {t("tournament.calendarPending")}
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
        </Reveal>
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
            <Reveal variant="up" className="space-y-2">
              <p className="inline-flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                <Newspaper className="size-3.5 text-[var(--color-arena)]" />
                {t("news.eyebrow")}
              </p>
              <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
                {t("news.title")}
              </h2>
              <p className="max-w-3xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
                {t("news.intro")}
              </p>
            </Reveal>
            <Link
              href="/noticias"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              {t("news.seeAll")}
              <ArrowRight className="size-3.5" />
            </Link>
          </header>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latestNews.map((n, i) => (
              <Reveal as="li" variant="up" delay={i * 80} key={n.id}>
                <NewsCard {...n} />
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ───────── EXPLORA EL TORNEO (hub interno + SEO) ───────── */}
      <section className="space-y-6">
        <Reveal as="header" variant="up" className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("explore.eyebrow")}
          </p>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            {t("explore.title")}
          </h2>
          <p className="max-w-3xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            {t("explore.intro")}
          </p>
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ExploreCard
            href="/calendario"
            delay={0}
            icon={<CalendarDays className="size-5" />}
            title={t("explore.calendarTitle")}
            text={t("explore.calendarText")}
          />
          <ExploreCard
            href="/grupos"
            delay={70}
            icon={<Users className="size-5" />}
            title={t("explore.groupsTitle")}
            text={t("explore.groupsText")}
          />
          <ExploreCard
            href="/bracket"
            delay={140}
            icon={<Swords className="size-5" />}
            title={t("explore.bracketTitle")}
            text={t("explore.bracketText")}
          />
          <ExploreCard
            href="/goleadores"
            delay={210}
            icon={<Target className="size-5" />}
            title={t("explore.scorersTitle")}
            text={t("explore.scorersText")}
          />
          <ExploreCard
            href="/equipos"
            delay={280}
            icon={<Trophy className="size-5" />}
            title={t("explore.teamsTitle")}
            text={t("explore.teamsText")}
          />
          <ExploreCard
            href="/sedes"
            delay={350}
            icon={<MapPin className="size-5" />}
            title={t("explore.venuesTitle")}
            text={t("explore.venuesText")}
          />
        </div>
      </section>

      {/* ───────── 6 CATEGORÍAS DE PREDICCIÓN ───────── */}
      <section className="space-y-6">
        <Reveal as="header" variant="up" className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("categories.eyebrow")}
          </p>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            {t("categories.title")}
          </h2>
          <p className="max-w-3xl font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            {t("categories.intro")}
          </p>
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CategoryCard
            delay={0}
            icon={<Users className="size-5" />}
            title={t("categories.groupTitle")}
            text={t("categories.groupText")}
          />
          <CategoryCard
            delay={70}
            icon={<Swords className="size-5" />}
            title={t("categories.bracketTitle")}
            text={t("categories.bracketText")}
          />
          <CategoryCard
            delay={140}
            icon={<Target className="size-5" />}
            title={t("categories.scorerTitle")}
            text={t("categories.scorerText")}
          />
          <CategoryCard
            delay={210}
            icon={<Goal className="size-5" />}
            title={t("categories.matchScoreTitle")}
            text={t("categories.matchScoreText")}
          />
          <CategoryCard
            delay={280}
            icon={<Sparkles className="size-5" />}
            title={t("categories.matchScorerTitle")}
            text={t("categories.matchScorerText")}
          />
          <CategoryCard
            delay={350}
            icon={<ShieldCheck className="size-5" />}
            title={t("categories.specialsTitle")}
            text={t("categories.specialsText")}
          />
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="space-y-6">
        <Reveal as="header" variant="up" className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("faqSection.eyebrow")}
          </p>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            {t("faqSection.title")}
          </h2>
        </Reveal>
        <Reveal variant="up" className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {faqs.map((f, i) => (
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
        </Reveal>
      </section>

      {/* ───────── CTA FINAL ───────── */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] p-8 text-center sm:p-12">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <Reveal variant="up" className="relative space-y-4">
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            {t("ctaFinal.title")}
          </h2>
          <p className="mx-auto max-w-2xl font-editorial text-sm italic text-[var(--color-muted-foreground)] sm:text-base">
            {t("ctaFinal.text")}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/login?next=%2Fonboarding"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]"
            >
              {t("ctaFinal.start")}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/precios"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              {t("ctaFinal.plans")}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ───────── SOBRE LA MARCA · refuerzo de trigrama para SEO ─────────
          Bloque final dedicado al producto-marca (no al torneo). Repite
          "Quiniela Mundial 2026" varias veces de forma natural — contenido
          que Google asocia a la query exacta de marca + año. Va antes
          del footer porque es donde el patrón "About" tradicional vive. */}
      <section className="space-y-4 border-t border-[var(--color-border)] pt-12">
        <Reveal as="header" variant="up" className="space-y-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("about.eyebrow")}
          </p>
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            {t("about.title")}
          </h2>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2">
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            {t.rich("about.p1", {
              b: (chunks) => (
                <strong className="font-semibold not-italic text-[var(--color-foreground)]">
                  {chunks}
                </strong>
              ),
            })}
          </p>
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
            {t.rich("about.p2", {
              em: (chunks) => (
                <em className="not-italic font-medium">{chunks}</em>
              ),
            })}
          </p>
        </div>
        <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
          {t.rich("about.p3", {
            home: (chunks) => (
              <Link
                href="/login?next=%2Fonboarding"
                className="text-[var(--color-arena)] underline-offset-4 hover:underline"
              >
                {chunks}
              </Link>
            ),
            pricing: (chunks) => (
              <Link
                href="/precios"
                className="text-[var(--color-arena)] underline-offset-4 hover:underline"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
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
            <Link href="/calendario" className="hover:text-[var(--color-arena)]">{tNav("calendario")}</Link>
            <Link href="/grupos" className="hover:text-[var(--color-arena)]">{tNav("grupos")}</Link>
            <Link href="/bracket" className="hover:text-[var(--color-arena)]">{tNav("bracket")}</Link>
            <Link href="/goleadores" className="hover:text-[var(--color-arena)]">{tNav("goleadores")}</Link>
            <Link href="/noticias" className="hover:text-[var(--color-arena)]">{tNav("noticias")}</Link>
            <Link href="/equipos" className="hover:text-[var(--color-arena)]">{tNav("selecciones")}</Link>
            <Link href="/sedes" className="hover:text-[var(--color-arena)]">{tNav("sedes")}</Link>
            <Link href="/puntuacion" className="hover:text-[var(--color-arena)]">{t("footer.scoring")}</Link>
            <Link href="/login" className="hover:text-[var(--color-arena)]">{tShell("login")}</Link>
          </nav>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--color-border)] pt-4 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]/80">
          <Link href="/aviso-legal" className="hover:text-[var(--color-arena)]">{t("footer.avisoLegal")}</Link>
          <span aria-hidden>·</span>
          <Link href="/privacidad" className="hover:text-[var(--color-arena)]">{t("footer.privacidad")}</Link>
          <span aria-hidden>·</span>
          <Link href="/cookies" className="hover:text-[var(--color-arena)]">{t("footer.cookies")}</Link>
          <span aria-hidden>·</span>
          <Link href="/terminos" className="hover:text-[var(--color-arena)]">{t("footer.terminos")}</Link>
          <span aria-hidden>·</span>
          <Link href="/contacto" className="hover:text-[var(--color-arena)]">{t("footer.contacto")}</Link>
        </div>
      </footer>
    </div>
  );
}

// ─────────── Helpers ───────────

function TierTeaser({
  priceEur,
  regularEur,
  label,
  members,
  perPerson,
  unlock,
  unlockHighlight,
  popularLabel,
  highlight,
  delay = 0,
}: {
  priceEur: number;
  regularEur?: number;
  label: string;
  members: string;
  perPerson: string;
  /** Qué desbloquea este escalón respecto al anterior. */
  unlock?: string;
  /** true → en arena (el salto clave: Branding desde Pase Empresa). */
  unlockHighlight?: boolean;
  popularLabel?: string;
  highlight?: boolean;
  delay?: number;
}) {
  return (
    <Reveal
      as="article"
      variant="up"
      delay={delay}
      className={`relative overflow-hidden rounded-xl border p-5 transition-all hover:-translate-y-0.5 ${
        highlight
          ? "border-[var(--color-arena)] bg-[var(--color-surface)] shadow-[var(--shadow-arena)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-arena)]/40"
      }`}
    >
      {highlight ? (
        <span className="absolute right-3 top-3 rounded-full bg-[var(--color-arena)] px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-white">
          {popularLabel}
        </span>
      ) : null}
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="font-display tabular text-4xl tracking-tight text-[var(--color-arena)] glow-arena">
          {priceEur} €
        </p>
        {regularEur ? (
          <span className="font-display tabular text-lg tracking-tight text-[var(--color-muted-foreground)] line-through decoration-[var(--color-arena)]/70">
            {regularEur} €
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-display text-base tracking-tight">{members}</p>
      <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        ≈ {perPerson}
      </p>
      {unlock ? (
        <p
          className={`mt-2.5 flex items-start gap-1.5 border-t border-dashed border-[var(--color-border)] pt-2.5 text-[0.72rem] font-medium leading-snug ${
            unlockHighlight ? "text-[var(--color-arena)]" : ""
          }`}
        >
          <Check className="mt-0.5 size-3 shrink-0 text-[var(--color-arena)]" />
          {unlock}
        </p>
      ) : null}
    </Reveal>
  );
}

/**
 * Mini-showcase de feature premium para la sección empresas de la home:
 * captura real localizada con chip de tier encima + título y una línea.
 * Toda la card enlaza a /precios, donde viven los showcases grandes.
 */
function ShotFeature({
  shot,
  alt,
  title,
  text,
  tier,
  tierHighlight,
  delay = 0,
}: {
  shot: StaticImageData;
  alt: string;
  title: string;
  text: string;
  tier: string;
  /** true → chip relleno arena (feature de tier superior: Branding). */
  tierHighlight?: boolean;
  delay?: number;
}) {
  return (
    <Reveal as="li" variant="up" delay={delay} className="group h-full">
      <Link
        href="/precios"
        className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:-translate-y-1 hover:border-[var(--color-arena)]/40 hover:shadow-[var(--shadow-elev-1)]"
      >
        <div className="relative overflow-hidden border-b border-[var(--color-border)]">
          <Image
            src={shot}
            alt={alt}
            placeholder="blur"
            sizes="(min-width: 640px) 33vw, 100vw"
            className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <span
            className={`absolute right-3 top-3 rounded-full px-2.5 py-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.18em] ${
              tierHighlight
                ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
                : "border border-[var(--color-border-strong)] bg-[var(--color-bg)]/85 text-[var(--color-foreground)] backdrop-blur"
            }`}
          >
            {tier}
          </span>
        </div>
        <div className="space-y-1 p-4">
          <h3 className="font-display text-lg tracking-tight">{title}</h3>
          <p className="font-editorial text-xs italic leading-snug text-[var(--color-muted-foreground)]">
            {text}
          </p>
        </div>
      </Link>
    </Reveal>
  );
}

function StepCard({
  n,
  icon,
  title,
  text,
  delay = 0,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  text: string;
  delay?: number;
}) {
  return (
    <Reveal
      as="article"
      variant="up"
      delay={delay}
      className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--color-arena)]/40"
    >
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
    </Reveal>
  );
}

function ExploreCard({
  href,
  icon,
  title,
  text,
  primary,
  delay = 0,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  primary?: boolean;
  delay?: number;
}) {
  const t = useTranslations("home");
  return (
    <Reveal variant="up" delay={delay}>
    <Link
      href={href}
      className={`group relative flex h-full flex-col gap-2.5 overflow-hidden rounded-xl border p-5 transition-all hover:-translate-y-0.5 ${
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
        {t("explore.go")} <ArrowRight className="size-3" />
      </span>
    </Link>
    </Reveal>
  );
}

function CategoryCard({
  icon,
  title,
  text,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  delay?: number;
}) {
  return (
    <Reveal
      as="article"
      variant="up"
      delay={delay}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--color-arena)]/40"
    >
      <div className="flex items-center gap-2.5 pb-2">
        <span className="grid size-8 place-items-center rounded-md border border-[var(--color-arena)]/30 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] text-[var(--color-arena)]">
          {icon}
        </span>
        <h3 className="font-display text-lg tracking-tight">{title}</h3>
      </div>
      <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
        {text}
      </p>
    </Reveal>
  );
}

function StatTile({ big, label, delay = 0 }: { big: string; label: string; delay?: number }) {
  const numeric = Number(big);
  return (
    <Reveal
      as="li"
      variant="up"
      delay={delay}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-[var(--color-arena)]/40"
    >
      <p className="font-display tabular text-3xl leading-none tracking-tight text-[var(--color-arena)] sm:text-4xl">
        {Number.isFinite(numeric) ? <Counter to={numeric} /> : big}
      </p>
      <p className="pt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
    </Reveal>
  );
}
