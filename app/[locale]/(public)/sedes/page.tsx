import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import { isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbLD } from "@/components/seo/jsonld";
import { BrandCTA } from "@/components/seo/brand-cta";
import { findVenueByMatchVenue, VENUES } from "@/lib/seo/venues";

// Sedes son contenido estático del torneo — cachear 1 hora reduce a casi
// cero el hit a Postgres en esta ruta.
export const revalidate = 3600;

export const metadata = {
  title: { absolute: "Sedes del Mundial 2026 — los 16 estadios oficiales · Quiniela Mundial" },
  description:
    "Las 16 sedes oficiales del Mundial 2026 en USA, Canadá y México: estadios, ciudades y partidos asignados. La final en Nueva York/Nueva Jersey; la inauguración en el Estadio Azteca.",
  alternates: { canonical: "/sedes" },
  openGraph: {
    title: "Sedes del Mundial 2026 · Quiniela Mundial",
    description:
      "Las 16 sedes del Mundial 2026 repartidas entre Estados Unidos, Canadá y México.",
    url: "/sedes",
  },
};

export default async function VenuesPage() {
  const t = await getTranslations("venuesPage");
  const tt = await getTranslations("tournament");
  // Agregamos por venue contando partidos. La tabla de matches incluye el
  // venue como text, así que sumamos por DISTINCT venue. Se enriquecerá si
  // en el futuro se añade tabla `venues` con lat/long y capacidad.
  const rows = await db
    .select({
      venue: matches.venue,
      count: sql<number>`count(*)::int`,
    })
    .from(matches)
    .where(isNotNull(matches.venue))
    .groupBy(matches.venue)
    .orderBy(sql`count(*) desc`);

  return (
    <div className="space-y-10">
      <BreadcrumbLD
        items={[
          { name: tt("home"), href: "/" },
          { name: t("breadcrumb"), href: "/sedes" },
        ]}
      />
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("desc")}
      />

      {/* Recorremos VENUES (catálogo curado de las 16 sedes oficiales) en
          lugar de hacer GROUP BY sobre matches.venue: así cada sede sale
          aunque todavía no tenga partidos asignados, y enlazamos a la
          página detalle con copy editorial. Le sumamos el conteo desde DB
          por nombre normalizado. */}
      {VENUES.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-5" />}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VENUES.map((venue) => {
            const matchCount = rows
              .filter((r) => r.venue && findVenueByMatchVenue(r.venue)?.slug === venue.slug)
              .reduce((acc, r) => acc + (r.count ?? 0), 0);
            return (
              <Link
                key={venue.slug}
                href={`/sedes/${venue.slug}`}
                className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[var(--color-arena)]/40 hover:shadow-[var(--shadow-elev-2)]"
              >
                <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-4 py-2">
                  <span className="flex items-center gap-2 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
                    <MapPin className="size-3" />
                    {venue.country}
                  </span>
                  <Badge variant="outline" className="text-[0.55rem]">
                    {t("matchCount", { n: matchCount })}
                  </Badge>
                </header>
                <div className="p-5">
                  <h2 className="font-display text-xl tracking-tight">{venue.name}</h2>
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    {venue.city}
                    {venue.region ? ` · ${venue.region}` : ""}
                  </p>
                  <p className="mt-2 font-display tabular text-2xl tracking-tight">
                    {venue.capacity.toLocaleString("es-ES")}
                  </p>
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    {t("capacity")}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-arena)] transition group-hover:translate-x-0.5">
                    {t("seeDetail")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <BrandCTA hint={t("ctaHint")} />
    </div>
  );
}
