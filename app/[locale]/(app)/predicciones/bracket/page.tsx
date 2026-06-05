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
import { currentLeagueId, getLeagueModes } from "@/lib/leagues";
import { formatDateTime } from "@/lib/utils";
import { getBracketStatus, getQualifiedTeamIds } from "@/lib/bracket-state";
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
  const t = await getTranslations("scoring");
  const tb = await getTranslations("predBracket");
  // Solo "completo" tiene bracket. Marcador / Solo Ganador → fuera.
  const guardLeagueId = (await currentLeagueId(me))!;
  const guardMode =
    (await getLeagueModes([guardLeagueId])).get(guardLeagueId) ?? "completo";
  if (guardMode !== "completo") redirect("/predicciones");
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

  // En previa admin: si los slots aún no están resueltos, generamos
  // un emparejamiento sintético posicional con las primeras 32 selecciones
  // por código alfabético. Solo afecta al render — no toca la BD.
  const previewSyntheticR32 = new Map<string, { homeId: number; awayId: number }>();
  if (previewRequested) {
    const realR32Codes = new Set(
      koMatches
        .filter((m) => m.stage === "r32" && m.homeTeamId != null)
        .map((m) => m.code),
    );
    const sorted = [...qualifiedTeams].sort((a, b) => a.code.localeCompare(b.code));
    const first32 = sorted.slice(0, 32);
    const r32Codes = [
      "M73", "M74", "M75", "M76", "M77", "M78", "M79", "M80",
      "M81", "M82", "M83", "M84", "M85", "M86", "M87", "M88",
    ];
    r32Codes.forEach((code, i) => {
      if (realR32Codes.has(code)) return;
      const home = first32[i * 2];
      const away = first32[i * 2 + 1];
      if (home && away) previewSyntheticR32.set(code, { homeId: home.id, awayId: away.id });
    });
  }

  const r32Pairings: Record<string, { homeId: number | null; awayId: number | null }> = {};
  for (const m of koMatches) {
    if (m.stage !== "r32") continue;
    const synthetic = previewSyntheticR32.get(m.code);
    r32Pairings[m.code] = {
      homeId: m.homeTeamId ?? synthetic?.homeId ?? null,
      awayId: m.awayTeamId ?? synthetic?.awayId ?? null,
    };
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

  const description = previewRequested
    ? tb("descPreview")
    : status.state === "open"
      ? tb("descOpen", {
          date: status.closesAt ? formatDateTime(status.closesAt) : tb("closesFirstR32"),
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
      <BracketBuilder
        open={status.state === "open"}
        preview={previewRequested}
        teams={sortedTeams.map<TeamLite>((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          flagUrl: t.flagUrl,
        }))}
        r32Pairings={r32Pairings}
        initial={{ r16, qf, sf, finalists, championTeamId, thirdTeamId }}
      />
    </div>
  );
}
