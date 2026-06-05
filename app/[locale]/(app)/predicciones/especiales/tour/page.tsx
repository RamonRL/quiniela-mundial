import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, predSpecial, specialPredictions, teams } from "@/lib/db/schema";
import { getLocale } from "next-intl/server";
import { localizeTeams } from "@/lib/team-names";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { isSpecialAnswered, type SpecialType } from "../types";
import { SpecialsTourClient } from "./tour-client";

export const metadata = { title: "Modo interactivo · Especiales" };
export const dynamic = "force-dynamic";

export default async function SpecialsTourPage(props: {
  searchParams: Promise<{ step?: string }>;
}) {
  const me = await requireUser();
  const locale = await getLocale();
  const leagueId = (await currentLeagueId(me))!;
  // Solo "completo" tiene especiales. Marcador / Solo Ganador → fuera.
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  if (mode !== "completo") redirect("/predicciones");

  const [specials, mine, allPlayers, allTeamsRaw] = await Promise.all([
    db.select().from(specialPredictions).orderBy(asc(specialPredictions.orderIndex)),
    db
      .select()
      .from(predSpecial)
      .where(and(eq(predSpecial.userId, me.id), eq(predSpecial.leagueId, leagueId))),
    db.select().from(players).orderBy(asc(players.name)),
    db.select().from(teams).orderBy(asc(teams.name)),
  ]);
  const allTeams = localizeTeams(allTeamsRaw, locale);

  // Solo entran al tour las preguntas todavía abiertas.
  const now = Date.now();
  const open = specials.filter((s) => new Date(s.closesAt).getTime() > now);
  if (open.length === 0) {
    redirect("/predicciones/especiales");
  }

  const myByKey = new Map(mine.map((m) => [m.specialId, m.valueJson as Record<string, unknown>]));

  const items = open.map((s) => ({
    id: s.id,
    key: s.key,
    question: s.question,
    type: s.type as SpecialType,
    optionsJson: s.optionsJson as unknown,
    pointsConfigJson: s.pointsConfigJson as unknown,
    closesAt: s.closesAt.toISOString(),
    existingValue: myByKey.get(s.id) ?? {},
  }));

  // Primer no-respondido.
  let firstUnpredicted = -1;
  items.forEach((it, idx) => {
    if (firstUnpredicted !== -1) return;
    if (!isSpecialAnswered(it.existingValue, it.type)) {
      firstUnpredicted = idx;
    }
  });
  const allComplete = firstUnpredicted === -1;
  const defaultStep = allComplete ? 0 : firstUnpredicted;
  const sp = await props.searchParams;
  const fromUrl = sp.step != null ? parseInt(sp.step, 10) : NaN;
  const initialStep = Number.isFinite(fromUrl)
    ? Math.max(0, Math.min(items.length - 1, fromUrl))
    : defaultStep;

  return (
    <SpecialsTourClient
      items={items}
      players={allPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        teamId: p.teamId,
      }))}
      teams={allTeams.map((t) => ({ id: t.id, code: t.code, name: t.name }))}
      initialStep={initialStep}
      allCompleteOnEntry={allComplete}
    />
  );
}
