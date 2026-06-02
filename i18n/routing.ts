import { defineRouting } from "next-intl/routing";

/**
 * Config de enrutado i18n. Español es el idioma por defecto y se sirve SIN
 * prefijo (`localePrefix: "as-needed"`), así las URLs ya indexadas
 * (`/calendario`, `/precios`, …) NO cambian. Los idiomas nuevos viven bajo
 * `/en`, `/fr`, `/pt`. Decisión SEO deliberada: cero migración de URLs es.
 */
export const routing = defineRouting({
  locales: ["es", "en", "fr", "pt"],
  defaultLocale: "es",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
