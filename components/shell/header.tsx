import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { UserMenu } from "./user-menu";
import { LeagueSwitcher } from "./league-switcher";
import { LanguageSwitcher } from "./language-switcher";
import type { Membership } from "@/lib/leagues";

type Props = {
  email: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  memberships: Membership[];
  activeLeagueId: number | null;
};

export function AppHeader({
  email,
  nickname,
  avatarUrl,
  isAdmin,
  memberships,
  activeLeagueId,
}: Props) {
  const isAuthenticated = !!email;
  const t = useTranslations("shell");
  return (
    // Mobile: flex con LeagueSwitcher en flex-1 → se centra en el espacio
    //   entre logo y UserMenu (no en el centro geométrico de la pantalla).
    //   Comportamiento original; el desfase con el FWC26 da igual aquí.
    // Desktop (lg+): grid 1fr_auto_1fr → centro geométrico para alinear
    //   con el logo FWC26 que vive centrado en la columna de contenido.
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-bg)_88%,transparent)] px-4 backdrop-blur-md lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-8">
      <div className="flex items-center">
        <Link
          // Si no hay sesión (visitante en pages públicas), el logo lleva
          // a la landing en /. Con sesión activa, sigue siendo el atajo a
          // /dashboard como hasta ahora.
          href={isAuthenticated ? "/dashboard" : "/"}
          aria-label="Quiniela Mundial"
          className="block transition-opacity hover:opacity-80 lg:hidden"
        >
          <BrandWordmark priority className="h-9 w-auto" />
        </Link>
      </div>
      <div className="flex flex-1 justify-center lg:flex-initial">
        {isAuthenticated && memberships.length > 0 ? (
          <LeagueSwitcher
            memberships={memberships}
            activeLeagueId={activeLeagueId}
          />
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-3">
        <LanguageSwitcher />
        {isAuthenticated && email ? (
          <UserMenu
            email={email}
            nickname={nickname}
            avatarUrl={avatarUrl}
            isAdmin={isAdmin}
          />
        ) : (
          <>
            <Link
              href="/precios"
              className="hidden text-xs font-mono uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)] sm:inline-flex"
            >
              {t("companies")}
            </Link>
            <Link
              href="/login"
              className="text-xs font-mono uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
            >
              {t("login")}
            </Link>
            <Link
              href="/login?next=%2Fonboarding"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
            >
              {t("createPool")}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
