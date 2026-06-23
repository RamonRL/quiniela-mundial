/**
 * Arreglo puntual: cierra un partido que quedó atascado en `live` porque una
 * suspensión larga (p. ej. temporal) hizo que terminara fuera de la ventana de
 * sync (3.5h tras el kickoff) y el cron dejó de mirarlo.
 *
 * Reusa la MISMA lógica del cron (resolveScorers + applyMatchUpdate con
 * actor:"auto"): toma el resultado, ganador y goleadores tal cual del proveedor
 * —cero valores inventados—, pone el partido en `finished`, limpia el minuto en
 * vivo y dispara el scoring.
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local --env-file-if-exists=.env scripts/finish-stuck-match.ts <matchId>
 *   # o por código:
 *   pnpm tsx ... scripts/finish-stuck-match.ts M42
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import {
  fetchFixtureById,
  fetchFixtureEvents,
  mapEventsToScorers,
  parseFixture,
} from "@/lib/sports/api-football";
import { resolveScorers } from "@/lib/automation/match-sync";
import { applyMatchUpdate } from "@/lib/automation/apply-match-update";
import { onMatchFinalized } from "@/lib/automation/orchestrator";

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Falta el id o código del partido. Ej: scripts/finish-stuck-match.ts M42");
    process.exit(1);
  }

  const isNumeric = /^\d+$/.test(arg);
  const [m] = isNumeric
    ? await db.select().from(matches).where(eq(matches.id, Number(arg))).limit(1)
    : await db.select().from(matches).where(eq(matches.code, arg)).limit(1);

  if (!m) {
    console.error(`No existe partido ${arg}.`);
    process.exit(1);
  }
  if (m.homeTeamId == null || m.awayTeamId == null) {
    console.error(`Partido ${m.code} sin equipos asignados.`);
    process.exit(1);
  }
  if (m.providerFixtureId == null) {
    console.error(`Partido ${m.code} sin providerFixtureId — no se puede sincronizar.`);
    process.exit(1);
  }

  const item = await fetchFixtureById(m.providerFixtureId);
  if (!item) {
    console.error("El proveedor no devolvió el fixture.");
    process.exit(1);
  }

  const f = parseFixture(item);
  console.log(
    `Proveedor: status=${f.status} (${f.rawStatus}) score=${f.homeScore}-${f.awayScore} winner=${f.winnerSide}`,
  );
  if (f.status !== "finished") {
    console.error(`El proveedor aún NO da el partido por terminado (${f.rawStatus}). Aborto.`);
    process.exit(1);
  }

  const events = await fetchFixtureEvents(m.providerFixtureId);
  const providerScorers = mapEventsToScorers(events, f.homeProviderTeamId, f.awayProviderTeamId);
  const { resolved, pending } = await resolveScorers(m.homeTeamId, m.awayTeamId, providerScorers);
  const winnerTeamId =
    f.winnerSide === "home" ? m.homeTeamId : f.winnerSide === "away" ? m.awayTeamId : null;

  console.log(
    `Aplicando: ${resolved.length} goleadores resueltos, ${pending.length} pendientes.`,
  );

  try {
    await applyMatchUpdate(
      {
        matchId: m.id,
        homeScore: f.homeScore ?? 0,
        awayScore: f.awayScore ?? 0,
        status: f.status,
        wentToPens: f.wentToPens,
        homeScorePen: f.homePenScore,
        awayScorePen: f.awayPenScore,
        winnerTeamId,
        scorers: resolved,
        pendingScorerMinutes: pending.map((p) => p.minute),
        liveMinute: null,
        livePhase: null,
      },
      { actor: "auto" },
    );
  } catch (e) {
    // `applyMatchUpdate` llama a `revalidatePath`, que requiere el contexto de
    // petición de Next y NO existe en un script de CLI. El error salta DESPUÉS
    // de que la transacción (match + goleadores), el scoring y los standings ya
    // se han persistido, pero ANTES de `onMatchFinalized`. Si es ese error
    // concreto, lo tragamos y completamos la orquestación a mano (el
    // orquestador no revalida, así que sí corre desde CLI). Cualquier otro
    // error se relanza.
    const msg = (e as Error).message ?? "";
    if (!msg.includes("static generation store")) throw e;
    console.log("(revalidatePath omitido fuera de Next — completando orquestación a mano)");
    await onMatchFinalized(m.id);
  }

  const [after] = await db.select().from(matches).where(eq(matches.id, m.id)).limit(1);
  console.log(
    `LISTO ${after.code}: status=${after.status} ${after.homeScore}-${after.awayScore} winner=${after.winnerTeamId} liveMinute=${after.liveMinute}`,
  );
  if (pending.length > 0) {
    console.log(
      `⚠️ Quedan ${pending.length} goleador(es) sin mapear; revísalos en /admin si hace falta.`,
    );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
