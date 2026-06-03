import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

/**
 * Config por request de next-intl: resuelve el locale (con fallback al
 * defecto) y carga su catálogo de mensajes. La ruta por defecto que busca
 * `createNextIntlPlugin` es justamente `./i18n/request.ts`.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
