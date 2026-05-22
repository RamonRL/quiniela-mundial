/**
 * Helpers de structured data JSON-LD. Cada componente renderiza un
 * <script type="application/ld+json"> en el HTML inicial (no se carga
 * vía next/script porque Google necesita verlo en el primer paint para
 * indexarlo bien). El payload se serializa con dangerouslySetInnerHTML
 * y se sanea (sin <, >, & ni separadores de línea raros).
 *
 * Cuando montes uno nuevo, valida con
 *   https://search.google.com/test/rich-results
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://quinielamundial.es";

// Tickets oficiales del Mundial 2026 (FIFA). Lo usamos como `offers.url` en
// los SportsEvent para responder al warning de Search Console "missing field
// offers". Precios en USD: $60 (group stage más barato) → $6730 (final más
// caro), publicados por FIFA en su Phase 1.
const FIFA_TICKETS_URL =
  "https://www.fifa.com/tournaments/mens/worldcup/canadamexicousa2026/ticketing";

// Imagen estandar para JSON-LD: el OG generado con next/og en /opengraph-image.
// Sirve para "image" en Organization, SportsEvent y SportsEvent (match).
const DEFAULT_LD_IMAGE = `${SITE_URL}/opengraph-image`;

function sanitize(json: unknown): string {
  return JSON.stringify(json)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/[\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

function Script({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: sanitize(data) }}
    />
  );
}

export function OrganizationLD() {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Quiniela Mundial",
        url: SITE_URL,
        logo: `${SITE_URL}/qm-mark.png`,
        description:
          "Quiniela del Mundial 2026 entre amigos. Predicciones, calendario y resultados.",
      }}
    />
  );
}

// WebSite schema → Google lo usa como señal principal para decidir el
// "site name" que aparece encima del título en los resultados de búsqueda
// (sin esto, cae al dominio: "quinielamundial.es"). Va sólo en la homepage
// porque es donde Google lo lee para indexar el site name.
// https://developers.google.com/search/docs/appearance/site-names
export function WebSiteLD() {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Quiniela Mundial",
        alternateName: "Quiniela Mundial 2026",
        url: SITE_URL,
      }}
    />
  );
}

export function WebApplicationLD() {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "WebApplication",
        // Importante: el name debe coincidir LITERAL con Organization,
        // WebSite y el applicationName del metadata global. Google
        // valida consistencia para asignar el "site name" en el SERP.
        // Si difiere ("Quiniela Mundial 2026" vs "Quiniela Mundial"),
        // Google cae al dominio como fallback.
        name: "Quiniela Mundial",
        alternateName: "Quiniela Mundial 2026",
        url: SITE_URL,
        applicationCategory: "GameApplication",
        operatingSystem: "Web, iOS, Android",
        inLanguage: "es-ES",
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        description:
          "App para hacer una quiniela del Mundial 2026 entre amigos. Calendario completo, predicciones por partido, ranking en vivo, bracket FIFA.",
      }}
    />
  );
}

// Selecciones representativas (campeonas históricas + anfitrionas) que
// usamos como `performer` en el SportsEvent macro. No es exhaustivo (las
// 48 son demasiadas) — Google solo necesita una muestra significativa para
// reconocer el array. Los partidos individuales sí declaran las dos
// selecciones que juegan vía MatchLD.
const TOURNAMENT_PERFORMERS = [
  "Argentina",
  "Brasil",
  "Alemania",
  "Italia",
  "Francia",
  "España",
  "Inglaterra",
  "Uruguay",
  "Portugal",
  "Estados Unidos",
  "Canadá",
  "México",
].map((name) => ({ "@type": "SportsTeam", name }));

export function SportsEventLD() {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: "Copa Mundial de la FIFA 2026",
        alternateName: ["Mundial 2026", "FIFA World Cup 2026"],
        startDate: "2026-06-11",
        endDate: "2026-07-19",
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        sport: "Soccer",
        image: DEFAULT_LD_IMAGE,
        organizer: {
          "@type": "SportsOrganization",
          name: "FIFA",
          url: "https://www.fifa.com",
        },
        performer: TOURNAMENT_PERFORMERS,
        offers: {
          "@type": "AggregateOffer",
          url: FIFA_TICKETS_URL,
          priceCurrency: "USD",
          lowPrice: "60",
          highPrice: "6730",
          availability: "https://schema.org/InStock",
          validFrom: "2025-09-10T00:00:00+00:00",
        },
        location: [
          {
            "@type": "Country",
            name: "Estados Unidos",
            address: { "@type": "PostalAddress", addressCountry: "US" },
          },
          {
            "@type": "Country",
            name: "Canadá",
            address: { "@type": "PostalAddress", addressCountry: "CA" },
          },
          {
            "@type": "Country",
            name: "México",
            address: { "@type": "PostalAddress", addressCountry: "MX" },
          },
        ],
        description:
          "Mundial 2026. Primera edición con 48 selecciones, 12 grupos y 104 partidos en 16 sedes de Estados Unidos, Canadá y México.",
        url: SITE_URL,
      }}
    />
  );
}

type Match = {
  id: number;
  code: string;
  scheduledAt: Date | string;
  stage: string;
  venue: string | null;
  homeName: string | null;
  awayName: string | null;
};

export function MatchLD({ match, stageLabel }: { match: Match; stageLabel: string }) {
  const date =
    typeof match.scheduledAt === "string"
      ? match.scheduledAt
      : match.scheduledAt.toISOString();
  const home = match.homeName ?? "TBD";
  const away = match.awayName ?? "TBD";
  const homeTeam = { "@type": "SportsTeam", name: home };
  const awayTeam = { "@type": "SportsTeam", name: away };
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: `${home} vs ${away}`,
        description: `${home} contra ${away} · ${stageLabel} del Mundial 2026.`,
        sport: "Soccer",
        startDate: date,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        image: DEFAULT_LD_IMAGE,
        location: match.venue
          ? { "@type": "Place", name: match.venue }
          : undefined,
        homeTeam,
        awayTeam,
        // performer alimenta el campo recomendado por Google; usamos las
        // dos selecciones que juegan. homeTeam/awayTeam siguen ahí para
        // compatibilidad con el subtipo SportsEvent.
        performer: [homeTeam, awayTeam],
        offers: {
          "@type": "AggregateOffer",
          url: FIFA_TICKETS_URL,
          priceCurrency: "USD",
          lowPrice: "60",
          highPrice: "6730",
          availability: "https://schema.org/InStock",
          validFrom: "2025-09-10T00:00:00+00:00",
        },
        superEvent: {
          "@type": "SportsEvent",
          name: "Copa Mundial de la FIFA 2026",
          url: SITE_URL,
        },
        url: `${SITE_URL}/partido/${match.id}`,
      }}
    />
  );
}

type SportsTeamArgs = {
  /** Nombre oficial de la selección, ej. "España". */
  name: string;
  /** Código FIFA 3-letras, ej. "ESP". */
  code: string;
  /** Nombre del grupo en el que juega ("Grupo A"), si está asignado. */
  groupName: string | null;
  /** Nº de jugadores convocados (opcional). */
  squadSize: number;
  /** URL relativa al sitio, ej. "/equipos/ESP". */
  href: string;
};

/**
 * SportsTeam para una selección concreta. Le decimos a Google que es una
 * selección nacional de fútbol, qué grupo juega en el Mundial y cuántos
 * jugadores tiene su plantilla.
 */
export function SportsTeamLD({
  name,
  code,
  groupName,
  squadSize,
  href,
}: SportsTeamArgs) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name,
    alternateName: code,
    sport: "Soccer",
    nationality: name,
    url: `${SITE_URL}${href}`,
    image: `${SITE_URL}${href}/opengraph-image`,
    memberOf: {
      "@type": "SportsOrganization",
      name: "FIFA",
      url: "https://www.fifa.com",
    },
  };
  if (groupName) {
    data.subOrganization = {
      "@type": "SportsOrganization",
      name: `${groupName} · Mundial 2026`,
    };
  }
  if (squadSize > 0) {
    data.numberOfEmployees = squadSize;
  }
  return <Script data={data} />;
}

type BreadcrumbItem = { name: string; href: string };

export function BreadcrumbLD({ items }: { items: BreadcrumbItem[] }) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: it.name,
          item: it.href.startsWith("http") ? it.href : `${SITE_URL}${it.href}`,
        })),
      }}
    />
  );
}

type NewsArticleArgs = {
  /** Slug del artículo, sin barra inicial. Se concatena al SITE_URL. */
  slug: string;
  headline: string;
  description: string;
  image: string | null;
  datePublished: Date | string;
  dateModified: Date | string;
  /** "Convocatorias", "Previas"…  Va al campo articleSection de Google News. */
  section: string;
  keywords: string[];
  /** Nombre del autor (nickname o "Redacción Quiniela Mundial"). */
  authorName: string;
};

/**
 * NewsArticle structured data. Google News y Search Console usan este
 * schema para colocar el artículo en la barra de "Top Stories" si el
 * sitio tiene buen track record editorial. publisher debe coincidir
 * exactamente con OrganizationLD (mismo nombre + logo) — si no, Search
 * Console marca "publisher mismatch" y degrada la visibilidad.
 */
export function NewsArticleLD({
  slug,
  headline,
  description,
  image,
  datePublished,
  dateModified,
  section,
  keywords,
  authorName,
}: NewsArticleArgs) {
  const url = `${SITE_URL}/noticias/${slug}`;
  const dp =
    typeof datePublished === "string"
      ? datePublished
      : datePublished.toISOString();
  const dm =
    typeof dateModified === "string"
      ? dateModified
      : dateModified.toISOString();
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": url,
        },
        headline,
        description,
        image: image
          ? [image.startsWith("http") ? image : `${SITE_URL}${image}`]
          : [DEFAULT_LD_IMAGE],
        datePublished: dp,
        dateModified: dm,
        author: {
          "@type": "Person",
          name: authorName,
        },
        publisher: {
          "@type": "Organization",
          name: "Quiniela Mundial",
          url: SITE_URL,
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/qm-mark.png`,
          },
        },
        articleSection: section,
        keywords: keywords.join(", "),
        inLanguage: "es-ES",
        url,
      }}
    />
  );
}

type ProductOffer = {
  /** Etiqueta visible del tier — "Pase Equipo · 50 miembros". */
  name: string;
  /** Slug interno del tier, usado como `sku`. */
  sku: string;
  /** Precio en euros, número entero (sin decimales). */
  priceEur: number;
  /** Descripción corta del tier — Google la muestra en SERP cuando hay rich card. */
  description: string;
};

/**
 * Producto con varias ofertas, una por tier de pago. Lo usamos en
 * /precios para que Google muestre rich card con precios en SERPs.
 * Solo se siembran los tiers de pago — el plan Free no aporta
 * estructura comercial y dejarlo dentro confundiría a Google.
 *
 * `priceValidUntil` se fija al fin del Mundial (19 jul 2026) porque
 * los Pases cubren la edición — tras esa fecha la oferta deja de
 * tener sentido y queremos que Google la jubile.
 */
export function ProductOffersLD({ offers }: { offers: ProductOffer[] }) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Pase Mundial 2026 · Quiniela para empresas",
        description:
          "Amplía el tope de miembros de tu quiniela privada para el Mundial 2026. Tres planes: 50, 100 o 250 miembros. Pago único por torneo, sin suscripción.",
        image: DEFAULT_LD_IMAGE,
        brand: { "@type": "Brand", name: "Quiniela Mundial" },
        offers: offers.map((o) => ({
          "@type": "Offer",
          name: o.name,
          sku: o.sku,
          description: o.description,
          price: o.priceEur.toString(),
          priceCurrency: "EUR",
          url: `${SITE_URL}/precios`,
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          validFrom: "2026-05-01",
          priceValidUntil: "2026-07-19",
          seller: {
            "@type": "Organization",
            name: "Quiniela Mundial",
            url: SITE_URL,
          },
        })),
      }}
    />
  );
}

type Faq = { q: string; a: string };

export function FAQPageLD({ faqs }: { faqs: Faq[] }) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }}
    />
  );
}
