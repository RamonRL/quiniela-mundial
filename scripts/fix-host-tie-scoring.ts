import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { specialPredictions } from "@/lib/db/schema";
import { evalHostFurthestRound } from "@/lib/automation/specials-auto";
import { recomputeSpecialPredictionForAllUsers } from "@/lib/scoring/persistence";

/**
 * Corrige el `resolvedValueJson` de la special `host_furthest_round` cuando
 * quedó resuelta con el shape antiguo de un solo ganador (`{ teamCode }`) en
 * vez del nuevo shape que soporta empates (`{ teamCodes: string[] }`).
 *
 * Reutiliza `evalHostFurthestRound()` (la misma lógica que usa el
 * auto-resolver) para recalcular el valor correcto a partir del estado real
 * de `matches`, y solo recompute los puntos de esta special —
 * `recomputeSpecialPredictionForAllUsers` está acotado a
 * `source_key = 'special:<id>'`, así que no toca ninguna otra categoría.
 *
 * Idempotente: si el valor ya está correcto, no hace nada.
 *
 *   pnpm db:fix-host-tie
 *   pnpm db:fix-host-tie --dry-run
 */
const dryRun = process.argv.includes("--dry-run");

function sameResolution(a: unknown, b: { teamCodes: string[]; round: string }): boolean {
  if (!a || typeof a !== "object") return false;
  const obj = a as { teamCodes?: string[]; teamCode?: string; round?: string };
  const codesA = obj.teamCodes ?? (obj.teamCode ? [obj.teamCode] : []);
  if (obj.round !== b.round) return false;
  if (codesA.length !== b.teamCodes.length) return false;
  const sortedA = [...codesA].sort();
  const sortedB = [...b.teamCodes].sort();
  return sortedA.every((code, i) => code === sortedB[i]);
}

async function main() {
  const [row] = await db
    .select()
    .from(specialPredictions)
    .where(eq(specialPredictions.key, "host_furthest_round"))
    .limit(1);
  if (!row) {
    console.log("No existe el special 'host_furthest_round'. Nada que corregir.");
    return;
  }

  const correct = await evalHostFurthestRound();
  if (!correct) {
    console.log(
      "El torneo aún no está en un estado resoluble para 'host_furthest_round' (no todos los anfitriones están eliminados/campeón). Nada que hacer.",
    );
    return;
  }

  const before = row.resolvedValueJson;
  const beforeLabel = JSON.stringify(before);
  const afterLabel = JSON.stringify(correct.value);
  // jsonb no preserva el orden de las claves de un objeto al persistir, así
  // que comparamos por contenido (ronda + set de equipos) en vez de por la
  // cadena JSON tal cual viene de la BD.
  if (sameResolution(before, correct.value)) {
    console.log("Ya está correcto. Nada que corregir:", afterLabel);
    return;
  }

  console.log(`Corrigiendo special #${row.id} (${row.key}):`);
  console.log("  antes:", beforeLabel);
  console.log("  ahora:", afterLabel);

  if (dryRun) {
    console.log("--dry-run: no escribo nada.");
    return;
  }

  await db
    .update(specialPredictions)
    .set({ resolvedValueJson: correct.value, resolvedAt: new Date() })
    .where(eq(specialPredictions.id, row.id));
  await recomputeSpecialPredictionForAllUsers(row.id);
  console.log("✓ Valor corregido y puntos recalculados (solo esta special).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
