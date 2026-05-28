/**
 * Auditor de puntos. Detecta divergencias (drift) entre lo que dice el
 * `points_ledger` vivo y lo que debería decir según las reglas y resultados
 * actuales.
 *
 * Cómo: toma un snapshot de los totales por (usuario, liga), ejecuta
 * `recomputeAllScoring()` —que es IDEMPOTENTE: re-derivar los puntos no causa
 * daño y es lo mismo que dispara el admin al editar reglas— y vuelve a tomar el
 * snapshot. Si algún total cambió, el ledger estaba desactualizado (p. ej. se
 * entró un resultado sin que recalculara): el script lo reporta Y lo deja
 * corregido (self-healing). Sin cambios = todo cuadra.
 *
 * Uso:
 *   pnpm db:audit-points
 *
 * Sale con código 1 si encontró drift (útil para alertas/CI tras una jornada).
 */
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pointsLedger } from "@/lib/db/schema";
import { recomputeAllScoring } from "@/lib/scoring/persistence";

async function snapshot(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      key: sql<string>`${pointsLedger.userId} || ':' || ${pointsLedger.leagueId}`,
      total: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int`,
    })
    .from(pointsLedger)
    .groupBy(pointsLedger.userId, pointsLedger.leagueId);
  return new Map(rows.map((r) => [r.key, r.total]));
}

async function main() {
  console.log("▸ Snapshot del points_ledger…");
  const before = await snapshot();
  console.log(`  ${before.size} (usuario, liga) con puntos.`);

  console.log("▸ Recalculando todo el scoring (idempotente)…");
  const t0 = Date.now();
  await recomputeAllScoring();
  console.log(`  recompute terminó en ${((Date.now() - t0) / 1000).toFixed(1)}s.`);

  const after = await snapshot();

  const keys = new Set([...before.keys(), ...after.keys()]);
  const drift: { key: string; before: number; after: number }[] = [];
  for (const k of keys) {
    const b = before.get(k) ?? 0;
    const a = after.get(k) ?? 0;
    if (b !== a) drift.push({ key: k, before: b, after: a });
  }

  if (drift.length === 0) {
    console.log("✔ Sin divergencias: el ledger ya estaba al día.");
    process.exit(0);
  }

  console.warn(
    `⚠ ${drift.length} (usuario, liga) cambiaron al recalcular — el ledger estaba desactualizado y se ha corregido:`,
  );
  for (const d of drift.slice(0, 50)) {
    const delta = d.after - d.before;
    console.warn(`  · ${d.key}: ${d.before} → ${d.after} (${delta > 0 ? "+" : ""}${delta})`);
  }
  if (drift.length > 50) console.warn(`  · … (+${drift.length - 50} más)`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
