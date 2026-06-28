import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, predBracketSlot, teams } from "@/lib/db/schema";
import { Eye, Swords } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { ScoringBox } from "@/components/brand/scoring-box";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId, getLeagueModes, getLeagueBracketFlags } from "@/lib/leagues";
import { getDateContext } from "@/lib/timezone-server";
import { formatDateTime } from "@/lib/utils";
import { getBracketStatus, getQualifiedTeamIds } from "@/lib/bracket-state";
import {
  getBracketRepescaUntil,
  getRepescaLockedR32,
  computeLockedWinners,
} from "@/lib/bracket-repesca";
import { getLocale, getTranslations } from "next-intl/server";
import { localizeTeams } from "@/lib/team-names";
import { bracketScoring, bracketFootnote } from "@/lib/scoring/copy";
import { BracketBuilder } from "./bracket-builder";
import type { TeamLite } from "./bracket-builder";

export const metadata = { title: "Bracket · Predicciones" };

export default async function PredictBracketPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const me = await requireUser();
  const locale = await getLocale();
  const { timeZone, locale: dateLocale } = await getDateContext();
  const t = await getTranslations("scoring");
  const tb = await getTranslations("predBracket");
  // Solo "completo" tiene bracket. Marcador / Solo Ganador → fuera.
  const guardLeagueId = (await currentLeagueId(me))!;
  const guardMode =
    (await getLeagueModes([guardLeagueId])).get(guardLeagueId) ?? "completo";
  if (guardMode !== "completo") redirect("/predicciones");
  // Esta liga puede haber desactivado que el bracket puntúe (decisión del dueño).
  // Se sigue pudiendo rellenar (solo por jugar), pero avisamos de que no suma.
  const bracketScores = (await getLeagueBracketFlags([guardLeagueId])).get(guardLeagueId) ?? true;
  const status = await getBracketStatus();
  const params = await searchParams;
  const previewRequested = params.preview === "1" && me.role === "admin";

  if (status.state === "waiting" && !previewRequested) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={tb("eyebrow")}
          title={tb("title")}
          description={tb("descWaiting")}
        />
        <ScoringBox sections={bracketScoring(t)} footnote={bracketFootnote(t)} />
        <EmptyState
          icon={<Swords className="size-5" />}
          title={tb("emptyTitle")}
          description={tb("emptyDesc")}
          action={
            me.role === "admin" ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/predicciones/bracket?preview=1">
                  <Eye />
                  {tb("adminPreviewBtn")}
                </Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const qualifiedIds = await getQualifiedTeamIds();
  // En modo "previa admin" los grupos aún no han cerrado, así que no hay
  // 32 clasificados — usamos todas las selecciones para que la UI tenga
  // contenido con el que jugar.
  const qualifiedTeamsRaw =
    previewRequested && qualifiedIds.length === 0
      ? await db.select().from(teams)
      : qualifiedIds.length > 0
        ? await db.select().from(teams).where(inArray(teams.id, qualifiedIds))
        : [];
  const qualifiedTeams = localizeTeams(qualifiedTeamsRaw, locale);

  // Cargamos los partidos eliminatorios para conocer el emparejamiento real
  // de R32 (homeTeamId/awayTeamId) cuando los grupos hayan cerrado. Antes de
  // ese cierre los slots vienen vacíos.
  const koMatches = await db
    .select({
      code: matches.code,
      stage: matches.stage,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
    })
    .from(matches)
    .where(inArray(matches.stage, ["r32", "r16", "qf", "sf", "third", "final"]));

  const r32Pairings: Record<string, { homeId: number | null; awayId: number | null }> = {};
  for (const m of koMatches) {
    if (m.stage !== "r32") continue;
    r32Pairings[m.code] = {
      homeId: m.homeTeamId ?? null,
      awayId: m.awayTeamId ?? null,
    };
  }

  // Previa admin: rellena CUALQUIER slot de R32 todavía vacío con una selección
  // libre del pool, para poder probar el bracket entero antes de que se ubiquen
  // los equipos reales (mejores terceros, o grupos aún sin cerrar). Un único
  // relleno que excluye los ya colocados → ninguna selección se repite. Solo
  // afecta al render en preview; nunca toca la BD ni el flujo real de apertura.
  if (previewRequested) {
    const placed = new Set<number>();
    for (const code of Object.keys(r32Pairings)) {
      const p = r32Pairings[code];
      if (p.homeId != null) placed.add(p.homeId);
      if (p.awayId != null) placed.add(p.awayId);
    }
    const fillQueue = qualifiedTeams.map((tm) => tm.id).filter((id) => !placed.has(id));
    let qi = 0;
    for (const code of Object.keys(r32Pairings)) {
      const p = r32Pairings[code];
      if (p.homeId == null && qi < fillQueue.length) p.homeId = fillQueue[qi++];
      if (p.awayId == null && qi < fillQueue.length) p.awayId = fillQueue[qi++];
    }
  }

  const leagueId = (await currentLeagueId(me))!;
  const mine = await db
    .select()
    .from(predBracketSlot)
    .where(
      and(
        eq(predBracketSlot.userId, me.id),
        eq(predBracketSlot.leagueId, leagueId),
      ),
    );

  // Filter previous picks to only those still in the qualified pool (just in
  // case the standings shifted between submissions). En previa admin el pool
  // son todas las selecciones, así que aceptamos cualquier id existente.
  const poolSet = new Set(qualifiedTeams.map((t) => t.id));
  const inPool = (id: number | null): id is number => id != null && poolSet.has(id);

  const r16 = mine
    .filter((m) => m.stage === "r16")
    .map((m) => m.predictedTeamId)
    .filter(inPool);
  const qf = mine
    .filter((m) => m.stage === "qf")
    .map((m) => m.predictedTeamId)
    .filter(inPool);
  const sf = mine
    .filter((m) => m.stage === "sf")
    .map((m) => m.predictedTeamId)
    .filter(inPool);
  const finalists = mine
    .filter((m) => m.stage === "final" && m.slotPosition !== 0)
    .map((m) => m.predictedTeamId)
    .filter(inPool);
  const champion = mine.find(
    (m) => m.stage === "final" && m.slotPosition === 0,
  )?.predictedTeamId;
  const championTeamId = inPool(champion ?? null) ? champion! : null;
  const third = mine.find(
    (m) => m.stage === "third" && m.slotPosition === 0,
  )?.predictedTeamId;
  const thirdTeamId = inPool(third ?? null) ? third! : null;

  const sortedTeams = [...qualifiedTeams].sort((a, b) => a.name.localeCompare(b.name));

  // ── Repesca: reapertura corta con los R32 ya jugados bloqueados por caso ──
  const repescaUntil = await getBracketRepescaUntil();
  const repescaActive = repescaUntil != null && Date.now() < repescaUntil.getTime();
  const lockedR32 = repescaActive && repescaUntil ? await getRepescaLockedR32(repescaUntil) : [];
  // El equipo fijado por cruce se decide con lo que el usuario tenía en octavos.
  const lockedWinners = computeLockedWinners(lockedR32, new Set(r16));
  // Sembramos en r16 el equipo fijado (y quitamos su pareja) para que el builder
  // lo muestre ya marcado; repescados sin pick reciben el perdedor (Sudáfrica).
  let seededR16 = [...r16];
  for (const l of lockedR32) {
    const lockTeam = lockedWinners[l.code];
    const mate = lockTeam === l.advancerTeamId ? l.loserTeamId : l.advancerTeamId;
    seededR16 = seededR16.filter((id) => id !== mate && id !== lockTeam);
    seededR16.push(lockTeam);
  }
  const editable = status.state === "open" || repescaActive;

  const description = previewRequested
    ? tb("descPreview")
    : repescaActive && repescaUntil
      ? tb("descOpen", { date: formatDateTime(repescaUntil, { timeZone, locale: dateLocale }) })
      : status.state === "open"
        ? tb("descOpen", {
            date: status.closesAt ? formatDateTime(status.closesAt, { timeZone, locale: dateLocale }) : tb("closesFirstR32"),
          })
        : tb("descClosed");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tb("eyebrow")}
        title={tb("title")}
        description={description}
      />
      <ScoringBox sections={bracketScoring(t)} footnote={bracketFootnote(t)} />
      {repescaActive ? (
        <p className="rounded-lg border border-dashed border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] px-4 py-2.5 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          {tb("repescaBanner")}
        </p>
      ) : null}
      {!bracketScores ? (
        <p className="rounded-lg border border-dashed border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 px-4 py-2.5 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          {tb("notScored")}
        </p>
      ) : null}
      <BracketBuilder
        open={editable}
        preview={previewRequested}
        teams={sortedTeams.map<TeamLite>((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          flagUrl: t.flagUrl,
        }))}
        r32Pairings={r32Pairings}
        initial={{ r16: seededR16, qf, sf, finalists, championTeamId, thirdTeamId }}
        lockedWinners={lockedWinners}
      />
    </div>
  );
}
