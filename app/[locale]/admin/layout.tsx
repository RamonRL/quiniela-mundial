import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { currentLeagueId, getMembershipsForUser } from "@/lib/leagues";
import { AppHeader } from "@/components/shell/header";
import { AdminMobileNav, AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  if (me.leagueId == null) {
    redirect("/onboarding");
  }
  const [currentView, memberships] = await Promise.all([
    currentLeagueId(me),
    getMembershipsForUser(me.id),
  ]);
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          email={me.email}
          nickname={me.nickname}
          avatarUrl={me.avatarUrl}
          isAdmin
          memberships={memberships}
          activeLeagueId={currentView}
        />
        <AdminMobileNav />
        <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-6 lg:px-8 lg:pb-12">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
