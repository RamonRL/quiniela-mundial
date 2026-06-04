import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import {
  currentLeagueId,
  getLeagueModes,
  getMembershipsForUser,
  type Membership,
} from "@/lib/leagues";
import { canUseBranding } from "@/lib/league-tiers";
import { AppHeader } from "@/components/shell/header";
import { LeagueAnnouncementBar } from "@/components/shell/league-announcement-bar";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileBottomNav } from "@/components/shell/mobile-nav";
import { DeadlineSlot } from "@/components/shell/deadline-slot";
import { TutorialProvider } from "@/components/tutorial/tutorial-provider";

// El layout corre en CADA navegación, así que aquí es donde más duele un
// hang. Sólo bloqueamos lo imprescindible para pintar el shell (auth,
// memberships para el switcher). El banner de deadline va por Suspense
// para que su query (que era el culpable de los timeouts de 4-5s) no
// frene la página.
const LAYOUT_QUERY_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.error(`layout query timeout: ${label} (>${LAYOUT_QUERY_TIMEOUT_MS}ms)`);
      resolve(fallback);
    }, LAYOUT_QUERY_TIMEOUT_MS);
    promise.then(
      (v) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        console.error(`layout query failed: ${label}`, err);
        resolve(fallback);
      },
    );
  });
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  // Onboarding guard: si el usuario aún no tiene liga activa (cuenta nueva
  // sin invite cookie consumida) o no ha terminado el paso de perfil
  // (nickname null), lo mandamos al onboarding antes de cualquier
  // renderizado del shell. /onboarding vive fuera de este layout.
  if (me.leagueId == null || me.nickname == null) {
    redirect("/onboarding");
  }
  const isAdmin = me.role === "admin";
  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get("sidebar_collapsed")?.value === "1";
  const currentView = await currentLeagueId(me);
  const memberships = await withTimeout(
    getMembershipsForUser(me.id),
    [] as Membership[],
    "getMembershipsForUser",
  );
  // Mostramos "Mi Quiniela" en la nav solo cuando la liga activa es privada.
  // En la pública no hay nada que gestionar (no es del usuario, no se invita,
  // no se sale).
  const activeMembership = memberships.find((m) => m.id === currentView);
  const showMyLeague = activeMembership ? !activeMembership.isPublic : false;
  // Branding personalizado: la marca de la liga activa sustituye el logo de QM
  // en el shell (header móvil + sidebar). Solo para Pase Empresa (100) o más.
  const activeCanBrand = activeMembership
    ? canUseBranding(activeMembership.tier)
    : false;
  const brandLogoUrl = activeCanBrand ? (activeMembership?.brandLogoUrl ?? null) : null;
  const brandLogoLightUrl = activeCanBrand
    ? (activeMembership?.brandLogoLightUrl ?? null)
    : null;
  const squareLogoUrl = activeCanBrand ? (activeMembership?.logoUrl ?? null) : null;
  const activeLeagueId = currentView ?? me.leagueId!;
  // Modo de la liga activa → decide qué variante del tutorial se dispara
  // (Completo / Marcador / Solo Ganador), tanto en el primer login como en
  // los replays desde "Mis predicciones".
  const activeMode =
    (await getLeagueModes([activeLeagueId])).get(activeLeagueId) ?? "completo";
  return (
    <TutorialProvider mode={activeMode}>
      <div className="flex min-h-dvh">
        <Sidebar
          isAdmin={isAdmin}
          myId={me.id}
          defaultCollapsed={sidebarCollapsed}
          showMyLeague={showMyLeague}
          brandLogoUrl={brandLogoUrl}
          brandLogoLightUrl={brandLogoLightUrl}
          squareLogoUrl={squareLogoUrl}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense fallback={<div aria-hidden />}>
            <DeadlineSlot userId={me.id} leagueId={activeLeagueId} />
          </Suspense>
          <AppHeader
            email={me.email}
            nickname={me.nickname}
            avatarUrl={me.avatarUrl}
            isAdmin={isAdmin}
            memberships={memberships}
            activeLeagueId={currentView}
            brandLogoUrl={brandLogoUrl}
            brandLogoLightUrl={brandLogoLightUrl}
          />
          {activeMembership?.announcement ? (
            <LeagueAnnouncementBar
              leagueId={activeMembership.id}
              leagueName={activeMembership.name}
              message={activeMembership.announcement}
            />
          ) : null}
          <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-6 lg:px-8 lg:pb-12">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
          <MobileBottomNav
            isAdmin={isAdmin}
            myId={me.id}
            showMyLeague={showMyLeague}
          />
        </div>
      </div>
    </TutorialProvider>
  );
}
