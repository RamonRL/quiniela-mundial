/**
 * Validación de integración del parser contra un partido REAL ya finalizado
 * de API-Football (cualquier liga). Comprueba que `parseFixture` +
 * `mapEventsToScorers` producen marcador y goleadores correctos antes de
 * confiar en el sync. No toca la DB.
 *
 *   pnpm tsx --env-file=.env.local --env-file-if-exists=.env scripts/test-fixture-parse.ts <fixtureId>
 *
 * Requiere API_FOOTBALL_KEY. Busca un fixtureId finalizado en api-football
 * (p. ej. un partido reciente de cualquier liga).
 */
import {
  fetchFixtureById,
  fetchFixtureEvents,
  mapEventsToScorers,
  parseFixture,
} from "@/lib/sports/api-football";

async function main() {
  const id = Number(process.argv[2]);
  if (!Number.isFinite(id)) throw new Error("Uso: scripts/test-fixture-parse.ts <fixtureId>");

  const item = await fetchFixtureById(id);
  if (!item) throw new Error(`Fixture ${id} no encontrado`);
  const f = parseFixture(item);
  const events = await fetchFixtureEvents(id);
  const scorers = mapEventsToScorers(events, f.homeProviderTeamId, f.awayProviderTeamId);

  console.log("Estado:", f.rawStatus, "→", f.status);
  console.log(`Marcador: ${f.homeScore}-${f.awayScore}`, f.wentToPens ? `(pens ${f.homePenScore}-${f.awayPenScore})` : "");
  console.log("Ganador (KO):", f.winnerSide ?? "—");
  console.log("Goleadores:");
  for (const s of scorers) {
    console.log(
      `  ${s.side.padEnd(4)} min ${String(s.minute ?? "?").padStart(3)} · ${s.playerName}` +
        `${s.isOwnGoal ? " (autogol)" : ""}${s.isPenalty ? " (penalti)" : ""}`,
    );
  }
  console.log(
    `\nGoles contados (no autogol): ${scorers.filter((s) => !s.isOwnGoal).length} ·` +
      ` total eventos de gol: ${scorers.length}`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
