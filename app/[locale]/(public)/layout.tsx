import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/guards";
import { currentLeagueId, getMembershipsForUser } from "@/lib/leagues";
import { canUseBranding } from "@/lib/league-tiers";
import { AppHeader } from "@/components/shell/header";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileBottomNav } from "@/components/shell/mobile-nav";
import { TimezoneSync } from "@/components/shell/timezone-sync";
import { getCurrentCalendarStage } from "@/lib/calendar-stage";

/**
 * Layout PÚBLICO. Igual que (app)/layout.tsx pero sin requireUser():
 * pages dentro de (public) son indexables por Google. Si hay sesión,
 * conserva todo el shell autenticado (header con UserMenu, sidebar
 * completo, deadline banner, league switcher); si no, renderiza un
 * shell reducido con CTAs para entrar / crear quiniela.
 *
 * Las pages dentro deciden por sí mismas qué secciones mostrar a
 * visitantes vs. logueados (predicciones, ranking, etc. solo cuando
 * `me != null`).
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();
  const isAuthenticated = me != null;
  const isAdmin = me?.role === "admin";
  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get("sidebar_collapsed")?.value === "1";

  let activeLeagueId: number | null = null;
  let memberships: Awaited<ReturnType<typeof getMembershipsForUser>> = [];
  if (me) {
    activeLeagueId = await currentLeagueId(me);
    memberships = await getMembershipsForUser(me.id);
  }

  const activeMembership = memberships.find((m) => m.id === activeLeagueId);
  const showMyLeague = activeMembership ? !activeMembership.isPublic : false;
  // Branding de la liga activa — mismo criterio que (app)/layout.tsx, para
  // que la marca de la empresa NO desaparezca al pasar a Calendario, Grupos,
  // etc. Solo lo ve quien tiene esa liga premium como activa; visitantes y
  // el resto de usuarios siguen viendo el logo de QM.
  const activeCanBrand = activeMembership
    ? canUseBranding(activeMembership.tier)
    : false;
  const brandLogoUrl = activeCanBrand ? (activeMembership?.brandLogoUrl ?? null) : null;
  const brandLogoLightUrl = activeCanBrand
    ? (activeMembership?.brandLogoLightUrl ?? null)
    : null;
  const squareLogoUrl = activeCanBrand ? (activeMembership?.logoUrl ?? null) : null;
  // Ronda KO actual → el enlace de Calendario del menú va directo a ella
  // (cacheado 5 min en lib/calendar-stage).
  const calendarStage = await getCurrentCalendarStage();

  return (
    <div className="flex min-h-dvh">
      {/* Cliente: refresca la cookie de TZ (display local del visitante).
          No vuelve dinámica la página — solo escribe la cookie que lee
          <LocalDateTime/> en cliente. Respeta la TZ fijada a mano si hay
          sesión. */}
      <TimezoneSync pinnedTz={me?.timezone ?? null} />
      <Sidebar
        isAdmin={isAdmin}
        myId={me?.id ?? ""}
        defaultCollapsed={sidebarCollapsed}
        showMyLeague={showMyLeague}
        isAuthenticated={isAuthenticated}
        calendarStage={calendarStage}
        brandLogoUrl={brandLogoUrl}
        brandLogoLightUrl={brandLogoLightUrl}
        squareLogoUrl={squareLogoUrl}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          email={me?.email ?? null}
          nickname={me?.nickname ?? null}
          avatarUrl={me?.avatarUrl ?? null}
          isAdmin={isAdmin}
          memberships={memberships}
          activeLeagueId={activeLeagueId}
          brandLogoUrl={brandLogoUrl}
          brandLogoLightUrl={brandLogoLightUrl}
        />
        <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-6 lg:px-8 lg:pb-12">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <MobileBottomNav
          isAdmin={isAdmin}
          myId={me?.id ?? ""}
          showMyLeague={showMyLeague}
          isAuthenticated={isAuthenticated}
          calendarStage={calendarStage}
        />
      </div>
    </div>
  );
}
