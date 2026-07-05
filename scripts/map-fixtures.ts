/**
 * Mapea nuestros `matches` ↔ fixtures de API-Football, guardando
 * `matches.provider_fixture_id`. Casa por los dos equipos + fecha (±2h).
 * Los KO con equipos por definir (TBD) se mapean cuando ya tengan equipos
 * (re-ejecutar) — aunque en producción esto ya lo hace SOLO el orquestador
 * al poblarse cada ronda (ver lib/automation/auto-map.ts). Este CLI queda para
 * el seed inicial y para arreglos manuales puntuales.
 *
 *   pnpm tsx --env-file=.env.local --env-file-if-exists=.env scripts/map-fixtures.ts            # dry-run
 *   pnpm tsx --env-file=.env.local --env-file-if-exists=.env scripts/map-fixtures.ts --apply
 *
 * Requiere API_FOOTBALL_KEY.
 */
import { mapFixtures } from "@/lib/sports/fixture-mapping";

const APPLY = process.argv.includes("--apply");

async function main() {
  if (!process.env.API_FOOTBALL_KEY) throw new Error("Falta API_FOOTBALL_KEY");

  const r = await mapFixtures({ apply: APPLY, onlyUnmapped: false });

  if (r.unmappedTeams.length) {
    console.log(
      `⚠️ Equipos del proveedor sin mapear (revisar lib/team-names): ${r.unmappedTeams.join(", ")}`,
    );
  }
  console.log(
    `\nPartidos casados: ${r.matched}/${r.scanned} ${
      APPLY ? `(APLICADO: ${r.applied} actualizados)` : "(dry-run)"
    }`,
  );
  if (r.updatedCodes.length) console.log(`  Actualizados: ${r.updatedCodes.join(", ")}`);
  if (r.unmatched.length) console.log(`  Sin casar (TBD o discrepancia): ${r.unmatched.join(", ")}`);
  if (!APPLY) console.log("\nRevisa el resultado y re-ejecuta con --apply para guardar.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
