/**
 * Abre (o cierra) la REPESCA del bracket. Abrir = fijar `bracket_repesca_until`
 * en app_settings al saque del 2.º dieciseisavos (deadline). Mientras esté en el
 * futuro, el bracket vuelve a ser editable por todos, con los R32 ya jugados
 * bloqueados por caso (ver lib/bracket-repesca.ts).
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local --env-file-if-exists=.env scripts/open-bracket-repesca.ts          # abre hasta el 2.º R32
 *   pnpm tsx ... scripts/open-bracket-repesca.ts close   # cierra (borra la ventana)
 */
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings, matches } from "@/lib/db/schema";
import { BRACKET_REPESCA_KEY } from "@/lib/bracket-repesca";

async function main() {
  const mode = process.argv[2];

  if (mode === "close") {
    await db.delete(appSettings).where(eq(appSettings.key, BRACKET_REPESCA_KEY));
    console.log("Repesca CERRADA (clave borrada).");
    process.exit(0);
  }

  // Deadline = saque del 2.º partido de R32 por orden cronológico.
  const r32 = await db
    .select({ code: matches.code, scheduledAt: matches.scheduledAt })
    .from(matches)
    .where(eq(matches.stage, "r32"))
    .orderBy(asc(matches.scheduledAt))
    .limit(2);
  if (r32.length < 2) {
    console.error("No hay suficientes partidos de R32.");
    process.exit(1);
  }
  const deadline = r32[1].scheduledAt;
  const value = { until: deadline.toISOString() };

  await db
    .insert(appSettings)
    .values({ key: BRACKET_REPESCA_KEY, valueJson: value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { valueJson: value, updatedAt: new Date() },
    });

  console.log(
    `Repesca ABIERTA hasta ${deadline.toISOString()} (saque de ${r32[1].code}).`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
