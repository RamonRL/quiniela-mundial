import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, Sparkles } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueDepartments, leagueMemberships, leagues, profiles } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";
import { canUseDepartments } from "@/lib/league-tiers";
import { loadDepartmentRankings } from "@/lib/leaderboard";
import { DepartmentsManager } from "./departments-manager";

export const metadata = { title: "Departamentos" };
export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const me = await requireUser();
  const leagueId = await currentLeagueId(me);
  if (leagueId == null) redirect("/onboarding");

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league || league.isPublic) redirect("/dashboard");
  if (league.createdBy !== me.id) redirect("/mi-quiniela");

  const hasPaidPlan = canUseDepartments(league.tier) && league.paidAt != null;

  if (!hasPaidPlan) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
          <Link href="/mi-quiniela">
            <ArrowLeft />
            Volver a Mi Quiniela
          </Link>
        </Button>
        <PageHeader
          eyebrow="Plan empresa"
          title="Departamentos"
          description="Crea sub-grupos (Marketing, Ventas, Ingeniería…) y deja que compitan por media de puntos."
        />
        <div className="rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
              <Sparkles className="size-5" />
            </span>
            <div className="min-w-0 space-y-2">
              <h2 className="font-display text-2xl tracking-tight">Esta feature es de los Pases Mundial 2026</h2>
              <p className="font-editorial text-base italic leading-relaxed text-[var(--color-muted-foreground)]">
                Los departamentos están incluidos en los planes de 50, 100 y 250 miembros. Tu quiniela actual aún
                no tiene Pase activo — contrátalo desde <Link href="/precios" className="text-[var(--color-arena)] underline">/precios</Link>.
              </p>
              <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                Cada departamento aparece como un equipo aparte en el ranking. Compiten por <strong>media de puntos</strong>,
                no por totales — así que un dept. de 5 personas tiene las mismas posibilidades que uno de 50.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Miembros de la liga con su dept actual.
  const members = await db
    .select({
      userId: profiles.id,
      email: profiles.email,
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
      departmentId: leagueMemberships.departmentId,
    })
    .from(leagueMemberships)
    .innerJoin(profiles, eq(profiles.id, leagueMemberships.userId))
    .where(eq(leagueMemberships.leagueId, league.id))
    .orderBy(asc(profiles.email));

  const [departments, rankings] = await Promise.all([
    db
      .select()
      .from(leagueDepartments)
      .where(eq(leagueDepartments.leagueId, league.id))
      .orderBy(asc(leagueDepartments.createdAt)),
    loadDepartmentRankings(league.id),
  ]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
        <Link href="/mi-quiniela">
          <ArrowLeft />
          Volver a Mi Quiniela
        </Link>
      </Button>
      <PageHeader
        eyebrow={league.name}
        title="Departamentos"
        description="Crea sub-grupos y asigna miembros. El ranking de departamentos se actualiza solo y compite por media de puntos (no totales)."
      />
      {departments.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-5" />}
          title="Aún no hay departamentos"
          description="Crea el primero con el botón de abajo. Lo típico: Marketing, Ventas, Ingeniería, Operaciones."
        />
      ) : null}
      <DepartmentsManager
        leagueId={league.id}
        departments={departments.map((d) => ({
          id: d.id,
          name: d.name,
          emoji: d.emoji,
          color: d.color,
        }))}
        rankings={rankings}
        members={members.map((m) => ({
          userId: m.userId,
          email: m.email,
          nickname: m.nickname,
          avatarUrl: m.avatarUrl,
          departmentId: m.departmentId,
        }))}
      />
    </div>
  );
}
