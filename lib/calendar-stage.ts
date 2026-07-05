import { asc, desc, ne } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";

/** Rondas KO que el filtro del calendario admite (`?stage=`). */
export type KoCalendarStage = "r32" | "r16" | "qf" | "sf" | "final";

const KO_STAGES = new Set<string>(["r32", "r16", "qf", "sf", "final"]);

/**
 * Ronda "en la que estamos" para el enlace del menú a Calendario: el stage del
 * PRÓXIMO partido sin terminar (o, si ya acabó todo, el del último). Solo
 * devuelve rondas KO — en fase de grupos no hay un `?stage` que aplicar, así
 * que devuelve null y el menú enlaza al calendario completo.
 *
 * Cacheado 5 min: la ronda cambia como mucho una vez cada varios días, y así no
 * pegamos a Postgres en cada navegación (el layout se renderiza en cada ruta).
 */
export const getCurrentCalendarStage = unstable_cache(
  async (): Promise<KoCalendarStage | null> => {
    const [next] = await db
      .select({ stage: matches.stage })
      .from(matches)
      .where(ne(matches.status, "finished"))
      .orderBy(asc(matches.scheduledAt))
      .limit(1);

    let stage: string | undefined = next?.stage;
    if (!stage) {
      // Torneo terminado: usa el stage del último partido (la final).
      const [last] = await db
        .select({ stage: matches.stage })
        .from(matches)
        .orderBy(desc(matches.scheduledAt))
        .limit(1);
      stage = last?.stage;
    }

    return stage && KO_STAGES.has(stage) ? (stage as KoCalendarStage) : null;
  },
  ["current-calendar-stage"],
  { revalidate: 300, tags: ["current-calendar-stage"] },
);
