import { getTranslations } from "next-intl/server";
import type { SponsorLogo } from "@/lib/sponsors";

/**
 * Franja de logos de patrocinadores en la parte superior del dashboard.
 * Sustituye por completo al logo de la FIFA World Cup en las ligas que tengan
 * patrocinadores configurados (feature admin).
 *
 * Layout: flex-wrap centrado con `basis` por breakpoint, así el número de
 * logos por fila está acotado y las filas parciales (y un único logo) quedan
 * centradas automáticamente:
 *   - móvil   → 4 por fila (basis-1/4)
 *   - tablet  → 6 por fila (basis-1/6)
 *   - PC      → 8 por fila (basis-[12.5%])
 * Con 1 logo queda centrado; con 2, uno a cada lado del centro; con 3, centro
 * + lados; con 4, fila completa; a partir de ahí salta a la siguiente fila.
 */
export async function SponsorStrip({ sponsors }: { sponsors: SponsorLogo[] }) {
  if (sponsors.length === 0) return null;
  const t = await getTranslations("dashboard");
  return (
    <div className="space-y-3 pt-2">
      <p className="text-center font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] sm:text-[0.6rem]">
        {t("sponsorsHeader")}
      </p>
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
    </div>
  );
}
