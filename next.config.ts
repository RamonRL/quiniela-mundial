import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

// next-intl: carga `./i18n/request.ts` por defecto. Envuelve el config base
// (antes de Sentry).
const withNextIntl = createNextIntlPlugin();

// Tras migrar a custom domain (auth.quinielamundial.es), las URLs de
// Storage nuevas usan ese host. Pero hay URLs ya persistidas en DB con
// el host viejo (yrdbjwyvojsmeajcrdli.supabase.co) — Supabase sigue
// sirviéndolas en paralelo como alias. Mantenemos ambos en
// remotePatterns para que next/image no rechace ninguna.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;
const LEGACY_SUPABASE_HOSTNAME = "yrdbjwyvojsmeajcrdli.supabase.co";

const supabaseRemotePatterns = Array.from(
  new Set([supabaseHostname, LEGACY_SUPABASE_HOSTNAME].filter(Boolean) as string[]),
).map((hostname) => ({
  protocol: "https" as const,
  hostname,
  pathname: "/storage/v1/object/public/**",
}));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseRemotePatterns,
    // Coste #1 en Vercel era "Image Optimization Transformation": next/image
    // re-optimizaba las mismas imágenes una y otra vez. Nuestras imágenes
    // (fotos de jugadores, covers, banderas, avatares) son ESTÁTICAS, así que
    // cacheamos la versión optimizada 31 días → cada (imagen, tamaño) se
    // transforma una vez. Sin impacto visual.
    minimumCacheTTL: 2678400,
    // No servimos imágenes a 2K/4K: quitamos esos anchos para generar menos
    // variantes por imagen (Next sirve el más cercano ≤ al solicitado).
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  experimental: {
    // El body de un Server Action está limitado a 1 MB por defecto. La subida
    // de foto del onboarding ya comprime con `compressImage`, pero algún caso
    // borde (HEIC, foto enorme antes de comprimir) superaba el tope y reventaba
    // con "Body exceeded 1 MB limit". 4 MB da margen de sobra.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // 301 permanentes para URLs basura que Google haya indexado por error.
  // El motivo principal del array: durante semanas se ha indexado
  // `quinielamundial.es/$` (origen desconocido, posiblemente un share
  // mal formado). Redirigirlas a `/` consolida el rank en la home y le
  // dice a Google que la canonical real es la home.
  async redirects() {
    return [
      { source: "/$", destination: "/", permanent: true },
      { source: "/%24", destination: "/", permanent: true },
      // Mismo patrón que /$ — alguna fuente externa generó referencias a
      // /& que terminaron en GSC. Lo consolidamos en la home.
      { source: "/&", destination: "/", permanent: true },
      { source: "/%26", destination: "/", permanent: true },
      // Red de seguridad Paddle: si el "Default Payment Link" del
      // dashboard quedó apuntando a /precios (en vez de /checkout),
      // cualquier transaction redirige aquí con ?_ptxn=. Lo reenviamos
      // a la página del overlay sin perder el id de la transaction.
      {
        source: "/precios",
        has: [{ type: "query", key: "_ptxn", value: "(?<ptxn>.*)" }],
        destination: "/checkout?_ptxn=:ptxn",
        permanent: false,
      },
    ];
  },
  // Forzamos a Next a empaquetar las fuentes y logos PNG con las funciones
  // de OG image. Por defecto los archivos de `public/` NO se bundlean con
  // serverless functions (se sirven desde la edge estática), así que un
  // `readFile` desde dentro del handler revienta con ENOENT en Vercel.
  outputFileTracingIncludes: {
    "/**": [
      "./public/fonts/**",
      "./public/fwc26.png",
      "./public/qm-mark.png",
    ],
    // El catch-all `app/admin/playbook/[...slug]/route.ts` lee HTML/CSS/PDF
    // desde `docs/marketing/` en runtime. Sin esta lista Next no bundlea
    // esa carpeta y los archivos no existen en el lambda de Vercel.
    "/admin/playbook/**": ["./docs/marketing/**"],
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "quiniela-mundial",

  project: "quiniela-mundial",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
