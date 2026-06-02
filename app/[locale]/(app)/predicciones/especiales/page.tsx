import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, predSpecial, specialPredictions, teams } from "@/lib/db/schema";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { ScoringBox } from "@/components/brand/scoring-box";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { getTranslations } from "next-intl/server";
import { specialsScoring, specialsFootnote } from "@/lib/scoring/copy";
import { InteractiveModeBanner } from "@/components/predictions/interactive-mode-banner";
import { isSpecialAnswered, type SpecialType } from "./types";
import { SpecialsForm } from "./specials-form";

export const metadata = { title: "Predicciones especiales" };

export default async function PredictSpecialsPage() {
  const me = await requireUser();
  const t = await getTranslations("scoring");
  const leagueId = (await currentLeagueId(me))!;
  // Solo "completo" tiene especiales. Marcador / Solo Ganador → fuera.
  const mode = (await getLeagueModes([leagueId])).get(leagueId) ?? "completo";
  if (mode !== "completo") redirect("/predicciones");
  const [specials, mine, allPlayers, allTeams] = await Promise.all([
    db.select().from(specialPredictions).orderBy(asc(specialPredictions.orderIndex)),
    db
      .select()
      .from(predSpecial)
      .where(and(eq(predSpecial.userId, me.id), eq(predSpecial.leagueId, leagueId))),
    db.select().from(players).orderBy(asc(players.name)),
    db.select().from(teams).orderBy(asc(teams.name)),
  ]);
  const myByKey = new Map(mine.map((m) => [m.specialId, m]));

  // Modo paso a paso por defecto mientras quede alguna pregunta abierta sin
  // responder. Cuando todas estén respondidas (o cerradas), modo full con
  // banner para volver al interactivo.
  const nowMs = Date.now();
  const anyOpenUnanswered = specials.some((s) => {
    if (new Date(s.closesAt).getTime() <= nowMs) return false;
    const v = myByKey.get(s.id)?.valueJson as Record<string, unknown> | undefined;
    return !isSpecialAnswered(v, s.type as SpecialType);
  });
  if (anyOpenUnanswered) redirect("/predicciones/especiales/tour");

  if (specials.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Categoría 3"
          title="Predicciones especiales"
          description="Balón, Guante, anfitrión más lejos…"
        />
        <ScoringBox sections={specialsScoring(t)} footnote={specialsFootnote(t)} />
        <EmptyState
          icon={<Sparkles className="size-5" />}
          title="Sin predicciones especiales todavía"
          description="Pendiente de seed."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Categoría 3"
        title="Predicciones especiales"
        description="Cada una con su propio cierre."
      />
      {specials.some((s) => new Date(s.closesAt).getTime() > Date.now()) ? (
        <InteractiveModeBanner
          href="/predicciones/especiales/tour"
          hint="Repasa pregunta a pregunta."
        />
      ) : null}
      <ScoringBox sections={specialsScoring(t)} footnote={specialsFootnote(t)} />
      <SpecialsForm
        specials={specials.map((s) => ({
          id: s.id,
          key: s.key,
          question: s.question,
          type: s.type,
          optionsJson: s.optionsJson as unknown,
          pointsConfigJson: s.pointsConfigJson as unknown,
          closesAt: s.closesAt.toISOString(),
        }))}
        existing={Array.from(myByKey.entries()).map(([specialId, row]) => ({
          specialId,
          valueJson: row.valueJson as Record<string, unknown>,
        }))}
        players={allPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          position: p.position,
          teamId: p.teamId,
        }))}
        teams={allTeams.map((t) => ({ id: t.id, code: t.code, name: t.name }))}
      />
    </div>
  );
}
