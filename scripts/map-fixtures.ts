/**
 * Mapea (una vez) nuestros `matches` ↔ fixtures de API-Football, guardando
 * `matches.provider_fixture_id`. Casa por fecha (±2h) + los dos equipos,
 * resolviendo el equipo del proveedor (nombre EN) a nuestro código FIFA con
 * `localizedTeamName`. Los partidos KO con equipos aún por definir (TBD) se
 * mapean cuando ya tengan equipos (re-ejecutar) o a mano desde /admin/sync.
 *
 *   pnpm tsx --env-file=.env.local --env-file-if-exists=.env scripts/map-fixtures.ts            # dry-run
 *   pnpm tsx --env-file=.env.local --env-file-if-exists=.env scripts/map-fixtures.ts --apply
 *
 * Requiere API_FOOTBALL_KEY.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, teams } from "@/lib/db/schema";
import { localizedTeamName } from "@/lib/team-names";
import { WORLD_CUP_LEAGUE_ID, WORLD_CUP_SEASON } from "@/lib/sports/api-football";

const APPLY = process.argv.includes("--apply");
const KEY = process.env.API_FOOTBALL_KEY;
const TOLERANCE_MS = 2 * 60 * 60 * 1000;

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function af<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`https://v3.football.api-sports.io${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { "x-apisports-key": KEY! } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
  const json = (await res.json()) as { response: T };
  return json.response;
}

type AfTeamRow = { team: { id: number; name: string } };
type AfFixtureRow = {
  fixture: { id: number; date: string };
  teams: { home: { id: number }; away: { id: number } };
};

async function main() {
  if (!KEY) throw new Error("Falta API_FOOTBALL_KEY");

  // Nuestros equipos + índice por nombre normalizado (EN y ES).
  const ourTeams = await db.select({ id: teams.id, code: teams.code, name: teams.name }).from(teams);
  const byName = new Map<string, number>();
  for (const t of ourTeams) {
    byName.set(norm(localizedTeamName(t.code, t.name, "en")), t.id);
    byName.set(norm(t.name), t.id);
  }

  // Equipos del proveedor → nuestro teamId.
  const apiTeams = await af<AfTeamRow[]>("/teams", {
    league: WORLD_CUP_LEAGUE_ID,
    season: WORLD_CUP_SEASON,
  });
  const apiTeamToOurs = new Map<number, number>();
  const unmappedTeams: string[] = [];
  for (const { team } of apiTeams) {
    const ours = byName.get(norm(team.name));
    if (ours) apiTeamToOurs.set(team.id, ours);
    else unmappedTeams.push(team.name);
  }
  console.log(`Equipos proveedor: ${apiTeams.length} · mapeados: ${apiTeamToOurs.size}`);
  if (unmappedTeams.length) console.log(`  ⚠️ sin mapear (revisar lib/team-names): ${unmappedTeams.join(", ")}`);

  // Fixtures del torneo.
  const fixtures = await af<AfFixtureRow[]>("/fixtures", {
    league: WORLD_CUP_LEAGUE_ID,
    season: WORLD_CUP_SEASON,
  });

  // Nuestros partidos con ambos equipos definidos.
  const ourMatches = await db
    .select({ id: matches.id, code: matches.code, home: matches.homeTeamId, away: matches.awayTeamId, at: matches.scheduledAt })
    .from(matches);

  let matched = 0;
  const unmatched: string[] = [];
  for (const m of ourMatches) {
    if (m.home == null || m.away == null) continue; // KO con TBD
    const cand = fixtures.find((f) => {
      const fh = apiTeamToOurs.get(f.teams.home.id);
      const fa = apiTeamToOurs.get(f.teams.away.id);
      if (fh == null || fa == null) return false;
      const sameTeams = fh === m.home && fa === m.away;
      const closeTime = Math.abs(new Date(f.fixture.date).getTime() - m.at.getTime()) <= TOLERANCE_MS;
      return sameTeams && closeTime;
    });
    if (!cand) {
      unmatched.push(m.code);
      continue;
    }
    matched++;
    if (APPLY) {
      await db
        .update(matches)
        .set({ providerFixtureId: cand.fixture.id })
        .where(eq(matches.id, m.id));
    }
  }

  console.log(`\nPartidos casados: ${matched}/${ourMatches.length} ${APPLY ? "(APLICADO)" : "(dry-run)"}`);
  if (unmatched.length) console.log(`  Sin casar (TBD o discrepancia): ${unmatched.join(", ")}`);
  if (!APPLY) console.log("\nRevisa el resultado y re-ejecuta con --apply para guardar.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
