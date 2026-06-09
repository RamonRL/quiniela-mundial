import { getTranslations } from "next-intl/server";
import type { SponsorLogo } from "@/lib/sponsors";

/**
 * Franja de logos de patrocinadores en la parte superior del dashboard.
 * Sustituye por completo al logo de la FIFA World Cup en las ligas que tengan
 * patrocinadores configurados (feature admin).
 *
 * Dos modos según cuántos haya:
 *  - UN solo patrocinador → modo BANNER: ocupa el ancho (hasta un máximo en
 *    PC) y se escala para caber en móvil. Ideal para banners largos de Twitch
 *    (p.ej. Flexicar).
 *  - VARIOS → rejilla flex-wrap centrada con `basis` por breakpoint, con el
 *    número de logos por fila acotado y filas parciales centradas:
 *      móvil → 4 por fila · tablet → 6 · PC → 8.
 *    Con 2 logos uno a cada lado del centro; con 3, centro + lados; con 4, fila
 *    completa; a partir de ahí salta a la siguiente fila.
 */
export async function SponsorStrip({ sponsors }: { sponsors: SponsorLogo[] }) {
  if (sponsors.length === 0) return null;
  const t = await getTranslations("dashboard");
  const single = sponsors.length === 1;
  return (
    <div className="space-y-3 pt-2">
      <p className="text-center font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] sm:text-[0.6rem]">
        {t("sponsorsHeader")}
      </p>
      {single ? (
        // Banner único: ancho completo en móvil, acotado y centrado en PC.
        // h-auto + max-h preservan el aspecto (un banner ancho queda bajo el
        // tope de altura; uno casi cuadrado se limita por altura sin deformar).
        // eslint-disable-next-line @next/next/no-img-element -- banner de aspecto variable
        <img
          src={sponsors[0].imageUrl}
          alt={sponsors[0].alt ?? "Patrocinador"}
          loading="lazy"
          className="mx-auto block h-auto w-full max-w-2xl max-h-24 object-contain sm:max-w-3xl sm:max-h-28"
        />
      ) : (
        <ul className="mx-auto flex max-w-5xl flex-wrap items-center justify-center">
          {sponsors.map((s) => (
            <li
              key={s.id}
              className="flex basis-1/4 items-center justify-center px-3 py-2 sm:basis-1/6 sm:px-4 lg:basis-[12.5%]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- logos de aspecto variable; <img> con altura fija es lo correcto */}
              <img
                src={s.imageUrl}
                alt={s.alt ?? "Patrocinador"}
                loading="lazy"
                className="h-9 w-auto max-w-full object-contain sm:h-11 lg:h-12"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
