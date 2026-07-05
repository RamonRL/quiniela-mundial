/**
 * Mapea nuestros `matches` ↔ fixtures de API-Football, guardando
 * `matches.provider_fixture_id`. Casa por los DOS equipos + fecha (±2h).
 *
 * Reutilizado por:
 *  - `scripts/map-fixtures.ts` (CLI, dry-run / --apply).
 *  - el orquestador post-partido (`auto-map.ts`): al poblarse una ronda KO por
 *    cascada, sus partidos ya tienen equipos y se mapean SOLOS, para que el
 *    sync en vivo los recoja sin intervención manual.
 *
 * El match de equipos es agnóstico de local/visitante: en KO la designación
 * home/away del proveedor puede no coincidir con la nuestra, y un par de
 * equipos + horario identifica el fixture sin ambigüedad.
 *
 * Requiere API_FOOTBALL_KEY (vía los fetchers de api-football.ts).
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, teams } from "@/lib/db/schema";
import { localizedTeamName } from "@/lib/team-names";
import { fetchLeagueFixtures, fetchLeagueTeams } from "@/lib/sports/api-football";

const TOLERANCE_MS = 2 * 60 * 60 * 1000;

// Alias de nombres del proveedor → código FIFA nuestro (variantes que no casan
// por nombre EN/ES directo).
const PROVIDER_ALIASES: Record<string, string> = {
  "czech republic": "CZE",
  "bosnia herzegovina": "BIH",
  "congo dr": "COD",
  "cape verde islands": "CPV",
  usa: "USA",
};

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type FixtureMapResult = {
  /** Partidos considerados (con ambos equipos definidos y, si onlyUnmapped, sin fixId). */
  scanned: number;
  /** Casados con un fixture del proveedor. */
  matched: number;
  /** Filas realmente actualizadas (solo en modo apply). */
  applied: number;
  /** Códigos de partido con ambos equipos pero sin fixture del proveedor. */
  unmatched: string[];
  /** Códigos actualizados en este pase (apply). */
  updatedCodes: string[];
  /** Equipos del proveedor que no supimos mapear (revisar lib/team-names). */
  unmappedTeams: string[];
};

export async function mapFixtures(
  opts: { apply?: boolean; onlyUnmapped?: boolean } = {},
): Promise<FixtureMapResult> {
  const apply = opts.apply ?? false;
  const onlyUnmapped = opts.onlyUnmapped ?? false;

  // Nuestros equipos + índice por nombre normalizado (EN y ES) + alias.
  const ourTeams = await db
    .select({ id: teams.id, code: teams.code, name: teams.name })
    .from(teams);
  const byCode = new Map(ourTeams.map((t) => [t.code, t.id]));
  const byName = new Map<string, number>();
  for (const t of ourTeams) {
    byName.set(norm(localizedTeamName(t.code, t.name, "en")), t.id);
    byName.set(norm(t.name), t.id);
  }
  for (const [alias, code] of Object.entries(PROVIDER_ALIASES)) {
    const id = byCode.get(code);
    if (id) byName.set(alias, id);
  }

  // Equipos del proveedor → nuestro teamId.
  const apiTeams = await fetchLeagueTeams();
  const apiTeamToOurs = new Map<number, number>();
  const unmappedTeams: string[] = [];
  for (const { team } of apiTeams) {
    const ours = byName.get(norm(team.name));
    if (ours) apiTeamToOurs.set(team.id, ours);
    else unmappedTeams.push(team.name);
  }

  const fixtures = await fetchLeagueFixtures();

  const ourMatches = await db
    .select({
      id: matches.id,
      code: matches.code,
      home: matches.homeTeamId,
      away: matches.awayTeamId,
      at: matches.scheduledAt,
      fix: matches.providerFixtureId,
    })
    .from(matches);

  const res: FixtureMapResult = {
    scanned: 0,
    matched: 0,
    applied: 0,
    unmatched: [],
    updatedCodes: [],
    unmappedTeams,
  };

  for (const m of ourMatches) {
    if (m.home == null || m.away == null) continue; // KO con TBD
    if (onlyUnmapped && m.fix != null) continue;
    res.scanned++;
    const cand = fixtures.find((f) => {
      const fh = apiTeamToOurs.get(f.teams.home.id);
      const fa = apiTeamToOurs.get(f.teams.away.id);
      if (fh == null || fa == null) return false;
      // Agnóstico de local/visitante: el par de equipos identifica el fixture.
      const samePair =
        (fh === m.home && fa === m.away) || (fh === m.away && fa === m.home);
      const closeTime =
        Math.abs(new Date(f.fixture.date).getTime() - m.at.getTime()) <= TOLERANCE_MS;
      return samePair && closeTime;
    });
    if (!cand) {
      res.unmatched.push(m.code);
      continue;
    }
    res.matched++;
    if (apply && m.fix !== cand.fixture.id) {
      await db
        .update(matches)
        .set({ providerFixtureId: cand.fixture.id })
        .where(eq(matches.id, m.id));
      res.applied++;
      res.updatedCodes.push(m.code);
    }
  }

  return res;
}
