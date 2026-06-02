import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Swords } from "lucide-react";
import { db } from "@/lib/db";
import { groupStandings, groups, matches, teams } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { requireAdmin } from "@/lib/auth/guards";
import { isGroupStageComplete } from "@/lib/automation/bracket-population";
import { R32_SLOTS } from "@/lib/bracket-format";
import { MejoresTercerosForm, type ThirdOption, type ThirdSlot } from "./mejores-terceros-form";

export const metadata = { title: "Mejores terceros · Admin" };
export const dynamic = "force-dynamic";

export default async function MejoresTercerosPage() {
  await requireAdmin();
  const groupsDone = await isGroupStageComplete();

  if (!groupsDone) {
    return (
      <div className="space-y-6">
        <BackLink />
        <PageHeader
          eyebrow="Admin · Operaciones"
          title="Mejores terceros"
          description="Espera a que terminen todos los partidos de la fase de grupos."
        />
        <EmptyState
          icon={<Swords className="size-5" />}
          title="Aún no es el momento"
          description="Esta pantalla se desbloquea en cuanto el último partido de fase de grupos esté finalizado."
        />
      </div>
    );
  }

  // Cargar las 12 terceras (una por grupo) y rankearlas por criterio FIFA.
  const thirds = await db
    .select({
      groupId: groupStandings.groupId,
      teamId: groupStandings.teamId,
      points: groupStandings.points,
      goalsFor: groupStandings.goalsFor,
      goalsAgainst: groupStandings.goalsAgainst,
    })
    .from(groupStandings)
    .where(eq(groupStandings.position, 3));

  if (thirds.length === 0) {
    return (
      <div className="space-y-6">
        <BackLink />
        <PageHeader
          eyebrow="Admin · Operaciones"
          title="Mejores terceros"
          description="No hay terceras posiciones todavía."
        />
      </div>
    );
  }

  const teamIds = thirds.map((t) => t.teamId);
  const groupIds = thirds.map((t) => t.groupId);
  const [teamRows, groupRows] = await Promise.all([
    db.select().from(teams).where(inArray(teams.id, teamIds)),
    db.select().from(groups).where(inArray(groups.id, groupIds)),
  ]);
  const teamById = new Map(teamRows.map((t) => [t.id, t]));
  const groupById = new Map(groupRows.map((g) => [g.id, g]));

  // Top 8 mejores terceras (mismo criterio que getQualifiedTeamIds).
  const sorted = [...thirds].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
  const top8 = sorted.slice(0, 8);

  const options: ThirdOption[] = top8.map((s) => {
    const team = teamById.get(s.teamId)!;
    const group = groupById.get(s.groupId)!;
    return {
      teamId: team.id,
      teamCode: team.code,
      teamName: team.name,
      groupCode: group.code,
      points: s.points,
      goalDiff: s.goalsFor - s.goalsAgainst,
      goalsFor: s.goalsFor,
    };
  });

  // Slots de R32 que esperan una tercera. De cada uno extraemos el pool.
  const slots: ThirdSlot[] = [];
  for (const [code, slot] of Object.entries(R32_SLOTS)) {
    const isHomeThird = slot.home.kind === "thirdPlace";
    const isAwayThird = slot.away.kind === "thirdPlace";
    if (!isHomeThird && !isAwayThird) continue;
    const side: "home" | "away" = isHomeThird ? "home" : "away";
    const pool =
      slot[side].kind === "thirdPlace"
        ? (slot[side] as { kind: "thirdPlace"; pool: string[] }).pool
        : [];
    slots.push({ matchCode: code, side, pool });
  }
  // Estado actual: si ya hay teamId asignado, lo mostramos.
  const r32 = await db
    .select({
      code: matches.code,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
    })
    .from(matches)
    .where(eq(matches.stage, "r32"));
  const currentByCode = new Map(r32.map((r) => [r.code, r]));
  const initial: Record<string, number | null> = {};
  for (const slot of slots) {
    const r = currentByCode.get(slot.matchCode);
    if (!r) continue;
    initial[slot.matchCode] = slot.side === "home" ? r.homeTeamId : r.awayTeamId;
  }

  return (
    <div className="space-y-6">
      <BackLink />
      <PageHeader
        eyebrow="Admin · Operaciones"
        title="Ubicar mejores terceros"
        description="Asigna a cada slot de R32 la tercera correspondiente. La predicción del bracket se desbloqueará en cuanto guardes."
      />
      <MejoresTercerosForm options={options} slots={slots} initial={initial} />
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
      <Link href="/admin/operaciones">
        <ArrowLeft />
        Volver a Operaciones
      </Link>
    </Button>
  );
}
