import { unstable_cache } from "next/cache";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, groupStandings, teams } from "@/lib/db/schema";

/**
 * Datos para pintar la clasificación de los 12 grupos (grupos + equipos +
 * standings). Son IDÉNTICOS para todos los usuarios y solo cambian cuando
 * acaba un partido de grupos. Cacheados 30s para que la oleada post-partido
 * sobre el dashboard no dispare 3 queries por cada visita (el dashboard es
 * dinámico por usuario, así que sin esto cada carga las repetía).
 *
 * Los datos van crudos (sin localizar): la localización depende del locale y
 * se hace por petición en el componente.
 */
export const loadGroupBoardData = unstable_cache(
  async () => {
    const [allGroups, allTeams, allStandings] = await Promise.all([
      db.select().from(groups).orderBy(asc(groups.code)),
      db.select().from(teams),
      db.select().from(groupStandings),
    ]);
    return { allGroups, allTeams, allStandings };
  },
  ["group-board-data"],
  { revalidate: 30, tags: ["group-standings"] },
);
