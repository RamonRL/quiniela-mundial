import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

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
  },
};

export default withSentryConfig(nextConfig, {
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
