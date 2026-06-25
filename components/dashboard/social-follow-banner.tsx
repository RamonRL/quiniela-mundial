import type { ComponentType, CSSProperties, SVGProps } from "react";
import { getTranslations } from "next-intl/server";
import { TutorialMascot } from "@/components/tutorial/mascot";
import { InstagramIcon, TikTokIcon, XIcon } from "@/components/icons/social";
import { LEGAL_OWNER } from "@/lib/legal";

/**
 * Banner del dashboard que invita a seguir nuestras redes. Es una apelación
 * directa de la mascota al jugador ya enganchado. Server component: lee los
 * destinos de `LEGAL_OWNER.social` y los textos del namespace `dashboard`.
 *
 * Firma visual: los 3 destinos son tiles monocromos en reposo (cohesión con la
 * card) que al hover/focus se encienden con el color REAL de cada marca — el ojo
 * reconoce al instante la red. Sin estado de cliente: el color de marca viaja
 * como variables CSS inline (`--brand`/`--brand-ink`) y el resto es :hover puro.
 *
 * `locale` opcional: sin él usa el locale de la request (uso real en el
 * dashboard); con él renderiza en un idioma concreto (preview en /admin/preview).
 */
type SocialNet = {
  key: string;
  label: string;
  handle: string;
  url: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Color de marca: borde + glow al hover, y fondo del icono. */
  brand: string;
  /** Tinte del glyph cuando el fondo pasa a `brand` (contraste). */
  brandInk: string;
};

const NETWORKS: SocialNet[] = [
  {
    key: "instagram",
    label: "Instagram",
    handle: LEGAL_OWNER.social.instagram.handle,
    url: LEGAL_OWNER.social.instagram.url,
    Icon: InstagramIcon,
    brand: "#E1306C",
    brandInk: "#ffffff",
  },
  {
    key: "tiktok",
    label: "TikTok",
    handle: LEGAL_OWNER.social.tiktok.handle,
    url: LEGAL_OWNER.social.tiktok.url,
    Icon: TikTokIcon,
    brand: "#FE2C55",
    brandInk: "#ffffff",
  },
  {
    key: "x",
    label: "X",
    handle: LEGAL_OWNER.social.x.handle,
    url: LEGAL_OWNER.social.x.url,
    Icon: XIcon,
    // X es blanco/negro: el glyph (oscuro) va sobre un fondo claro (foreground).
    brand: "var(--color-foreground)",
    brandInk: "var(--color-bg)",
  },
];

export async function SocialFollowBanner({ locale }: { locale?: string }) {
  const t = locale
    ? await getTranslations({ locale, namespace: "dashboard" })
    : await getTranslations("dashboard");

  return (
    <section
      aria-label={t("socialEyebrow")}
      className="rise-in relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-elev-1)]"
    >
      {/* Atmósfera de estadio — misma capa que la hero card. */}
      <span aria-hidden className="spotlight pointer-events-none absolute inset-0 opacity-60" />
      <span aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-[0.04]" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-arena)]/40 to-transparent"
      />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        {/* Mascota + mensaje */}
        <div className="flex items-center gap-4">
          <TutorialMascot />
          <div className="space-y-1">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-arena)]">
              {t("socialEyebrow")}
            </p>
            <h2 className="font-display text-2xl leading-none tracking-tight sm:text-3xl">
              {t("socialTitle")}
            </h2>
            <p className="max-w-md text-sm text-[var(--color-muted-foreground)]">
              {t("socialSubtitle")}
            </p>
          </div>
        </div>

        {/* Tiles de seguir — encienden con el color de marca al hover/focus. */}
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:shrink-0">
          {NETWORKS.map((n) => (
            <li key={n.key}>
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={`${t("socialCta")} ${n.label} ${n.handle}`}
                style={
                  { "--brand": n.brand, "--brand-ink": n.brandInk } as CSSProperties
                }
                className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-3.5 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)] hover:bg-[var(--color-surface-2)] hover:shadow-[0_0_0_1px_var(--brand),0_12px_32px_-16px_var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:min-w-[8.5rem]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-3)] text-[var(--color-foreground)] transition-colors duration-200 group-hover:bg-[var(--brand)] group-hover:text-[var(--brand-ink)]">
                  <n.Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm leading-tight tracking-tight">
                    {n.label}
                  </span>
                  <span className="block truncate font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    {n.handle}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
