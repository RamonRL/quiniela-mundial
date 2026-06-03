import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, predGroupRanking, teams } from "@/lib/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { ScoringBox } from "@/components/brand/scoring-box";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { formatDateTime } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { groupsScoring, groupsFootnote } from "@/lib/scoring/copy";
import { InteractiveModeBanner } from "@/components/predictions/interactive-mode-banner";
import { GroupRankingForm } from "./group-ranking-form";

export const metadata = { title: "Posiciones por grupo · Predicciones" };

const KICKOFF = new Date(
  process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z",
);

export default async function PredictGroupsPage() {
  const me = await requireUser();
  const t = await getTranslations("scoring");
  const tg = await getTranslations("predGroups");
  const leagueId = (await currentLeagueId(me))!;
  // Solo el modo "completo" tiene pre-torneo. Marcador / Solo Ganador no
  // predicen grupos: cortamos el acceso directo por URL.
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  if (mode !== "completo") redirect("/predicciones");
  const [allGroups, allTeams, myPreds] = await Promise.all([
    db.select().from(groups).orderBy(asc(groups.code)),
    db.select().from(teams).orderBy(asc(teams.name)),
    db
      .select()
      .from(predGroupRanking)
      .where(
        and(
          eq(predGroupRanking.userId, me.id),
          eq(predGroupRanking.leagueId, leagueId),
        ),
      ),
  ]);

  const teamsByGroup = new Map<number, typeof allTeams>();
  for (const t of allTeams) {
    if (t.groupId == null) continue;
    const arr = teamsByGroup.get(t.groupId) ?? [];
    arr.push(t);
    teamsByGroup.set(t.groupId, arr);
  }

  const predByGroup = new Map(myPreds.map((p) => [p.groupId, p]));
  const open = KICKOFF.getTime() > Date.now();
  const ready = allGroups.length === 12 && Array.from(teamsByGroup.values()).every((arr) => arr.length === 4);

  // Modo paso a paso por defecto mientras quede algún grupo por ordenar.
  // Solo se queda en el modo full cuando los 12 grupos tienen las 4
  // posiciones rellenadas — entonces tiene sentido "ver todo de un vistazo".
  if (ready && open) {
    const completed = myPreds.filter(
      (p) => p.pos1TeamId && p.pos2TeamId && p.pos3TeamId && p.pos4TeamId,
    ).length;
    if (completed < 12) redirect("/predicciones/grupos/tour");
  }

  if (!ready) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={tg("eyebrow")}
          title={tg("title")}
          description={tg("descShort")}
        />
        <EmptyState
          icon={<Users className="size-5" />}
          title={tg("emptyTitle")}
          description={tg("emptyDesc")}
        />
      </div>
    );
  }

  const initialOrders: Record<number, number[]> = {};
  for (const g of allGroups) {
    const groupTeams = teamsByGroup.get(g.id) ?? [];
    const pred = predByGroup.get(g.id);
    if (
      pred &&
      pred.pos1TeamId &&
      pred.pos2TeamId &&
      pred.pos3TeamId &&
      pred.pos4TeamId
    ) {
      initialOrders[g.id] = [
        pred.pos1TeamId,
        pred.pos2TeamId,
        pred.pos3TeamId,
        pred.pos4TeamId,
      ];
    } else {
      // default: alphabetical (could be coefficient-sorted later)
      initialOrders[g.id] = groupTeams.map((t) => t.id);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tg("eyebrow")}
        title={tg("title")}
        description={
          open
            ? tg("descOpen", { date: formatDateTime(KICKOFF) })
            : tg("descClosed")
        }
      />
      {open ? (
        <InteractiveModeBanner
          href="/predicciones/grupos/tour"
          hint={tg("bannerHint")}
        />
      ) : null}
      <ScoringBox sections={groupsScoring(t)} footnote={groupsFootnote(t)} />
      <GroupRankingForm
        open={open}
        groups={allGroups.map((g) => ({
          id: g.id,
          code: g.code,
          name: g.name,
          teams: (teamsByGroup.get(g.id) ?? []).map((t) => ({
            id: t.id,
            code: t.code,
            name: t.name,
            flagUrl: t.flagUrl,
          })),
          initialOrder: initialOrders[g.id],
        }))}
      />
    </div>
  );
}
