/**
 * Pre-cachea `players.providerPlayerId` casando nuestra plantilla con la de
 * API-Football (`/players/squads`). Así, cuando llegue un gol, `resolveScorers`
 * encuentra al goleador por id (cache hit) y NUNCA cae a "pendiente".
 *
 *   pnpm db:match-provider-players              # dry-run, todos los equipos
 *   pnpm db:match-provider-players --apply       # aplica los cambios
 *   pnpm db:match-provider-players MEX           # un solo equipo (dry-run)
 *   pnpm db:match-provider-players MEX --apply
 *
 * Reporta, por equipo:
 *   - jugadores nuestros cacheados,
 *   - jugadores nuestros SIN equivalente en API-Football,
 *   - jugadores de API-Football SIN equivalente nuestro  ← estos son los
 *     futuros "goleadores desconocidos": añádelos a la convocatoria.
 *
 * Requiere API_FOOTBALL_KEY.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, teams } from "@/lib/db/schema";
import { localizedTeamName } from "@/lib/team-names";
import {
  fetchLeagueTeams,
  fetchTeamSquad,
  type AfSquadPlayer,
} from "@/lib/sports/api-football";

const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.find((a) => /^[A-Z]{3}$/.test(a)) ?? null;

// Alias de nombres del proveedor que no casan por nombre EN/ES directo
// (mismos que scripts/map-fixtures.ts).
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
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function surnameOf(name: string): string {
  const words = norm(name)
    .split(" ")
    .filter((w) => w.length > 0);
  return words[words.length - 1] ?? "";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type OurPlayer = {
  id: number;
  name: string;
  jerseyNumber: number | null;
  providerPlayerId: number | null;
};

/**
 * Casa cada jugador NUESTRO (que aún NO tenga id de proveedor) con uno de
 * API-Football. Estrategia en cascada y 1:1 (un jugador del proveedor no se
 * asigna dos veces):
 *   1) nombre completo normalizado idéntico,
 *   2) apellido único,
 *   3) apellido + dorsal.
 * No toca a quien ya tiene `providerPlayerId` (confirmado por un gol real):
 * reserva su id del proveedor y lo cuenta como ya cacheado.
 */
function matchSquad(ours: OurPlayer[], api: AfSquadPlayer[]) {
  // Reserva los ids ya confirmados para no reasignarlos a otro jugador.
  const usedApi = new Set<number>(
    ours.map((p) => p.providerPlayerId).filter((x): x is number => x != null),
  );
  const alreadyCached = ours.filter((p) => p.providerPlayerId != null).length;
  const pairs: { player: OurPlayer; apiId: number; apiName: string; how: string }[] = [];
  const ourUnmatched: OurPlayer[] = [];

  const pick = (cands: AfSquadPlayer[]) => cands.filter((a) => !usedApi.has(a.id));

  for (const p of ours) {
    if (p.providerPlayerId != null) continue; // ya confirmado, no tocar
    const nFull = norm(p.name);
    const sn = surnameOf(p.name);

    // 1) nombre completo exacto
    let cands = pick(api).filter((a) => norm(a.name) === nFull);
    let how = "nombre";
    // 2) apellido único
    if (cands.length !== 1) {
      const bySurname = pick(api).filter((a) => surnameOf(a.name) === sn && sn.length >= 3);
      if (bySurname.length === 1) {
        cands = bySurname;
        how = "apellido";
      } else if (bySurname.length > 1 && p.jerseyNumber != null) {
        // 3) apellido + dorsal
        const byNum = bySurname.filter((a) => a.number === p.jerseyNumber);
        if (byNum.length === 1) {
          cands = byNum;
          how = "apellido+dorsal";
        } else {
          cands = [];
        }
      } else {
        cands = [];
      }
    }

    if (cands.length === 1) {
      usedApi.add(cands[0].id);
      pairs.push({ player: p, apiId: cands[0].id, apiName: cands[0].name, how });
    } else {
      ourUnmatched.push(p);
    }
  }

  const apiUnmatched = api.filter((a) => !usedApi.has(a.id));
  return { pairs, ourUnmatched, apiUnmatched, alreadyCached };
}

async function main() {
  if (!process.env.API_FOOTBALL_KEY) throw new Error("Falta API_FOOTBALL_KEY");

  // Índice nombre-normalizado (EN + ES + alias) → nuestro teamId.
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

  // Equipos del proveedor → nuestro teamId, y el inverso teamId → providerTeamId.
  const apiTeams = await fetchLeagueTeams();
  const providerByOurTeam = new Map<number, number>();
  for (const { team } of apiTeams) {
    const ours = byName.get(norm(team.name));
    if (ours) providerByOurTeam.set(ours, team.id);
  }

  const targetTeams = ourTeams
    .filter((t) => (ONLY ? t.code === ONLY : true))
    .sort((a, b) => a.code.localeCompare(b.code));

  console.log(
    `${APPLY ? "APPLY" : "DRY-RUN"} · equipos a procesar: ${targetTeams.length}${ONLY ? ` (${ONLY})` : ""}\n`,
  );

  let totalCached = 0;
  const teamsNoProvider: string[] = [];
  const gaps: { code: string; apiUnmatched: string[]; ourUnmatched: string[] }[] = [];

  for (const t of targetTeams) {
    const providerTeamId = providerByOurTeam.get(t.id);
    if (!providerTeamId) {
      teamsNoProvider.push(t.code);
      continue;
    }

    const squadRes = await fetchTeamSquad(providerTeamId).catch(() => []);
    const api = squadRes[0]?.players ?? [];
    const ours = await db
      .select({
        id: players.id,
        name: players.name,
        jerseyNumber: players.jerseyNumber,
        providerPlayerId: players.providerPlayerId,
      })
      .from(players)
      .where(eq(players.teamId, t.id));

    if (api.length === 0) {
      console.log(`${t.code}: ⚠️ API-Football no devolvió plantilla (id ${providerTeamId})`);
      await sleep(300);
      continue;
    }

    const { pairs, ourUnmatched, apiUnmatched, alreadyCached } = matchSquad(ours, api);

    if (APPLY) {
      for (const m of pairs) {
        await db
          .update(players)
          .set({ providerPlayerId: m.apiId })
          .where(eq(players.id, m.player.id))
          .catch((e) => console.log(`   ✗ ${t.code} ${m.player.name}: ${e.message}`));
      }
    }
    totalCached += pairs.length;

    const flags: string[] = [];
    if (apiUnmatched.length) flags.push(`${apiUnmatched.length} API sin casar`);
    if (ourUnmatched.length) flags.push(`${ourUnmatched.length} nuestros sin casar`);
    const cachedNote = alreadyCached ? ` (+${alreadyCached} ya)` : "";
    console.log(
      `${t.code}: nuevos ${pairs.length}/${ours.length}${cachedNote}` +
        (flags.length ? `  ⚠️ ${flags.join(" · ")}` : "  ✓"),
    );
    if (apiUnmatched.length || ourUnmatched.length) {
      gaps.push({
        code: t.code,
        apiUnmatched: apiUnmatched.map((a) => `${a.number ?? "·"} ${a.name}`),
        ourUnmatched: ourUnmatched.map((p) => `${p.jerseyNumber ?? "·"} ${p.name}`),
      });
    }
    await sleep(300); // respetar rate limit del proveedor
  }

  console.log(`\n${APPLY ? "Cacheados" : "Se cachearían"}: ${totalCached} jugadores.`);
  if (teamsNoProvider.length)
    console.log(`Equipos sin id de proveedor (revisar nombres/alias): ${teamsNoProvider.join(", ")}`);

  if (gaps.length) {
    console.log(`\n── Huecos a revisar (posibles goleadores desconocidos) ──`);
    for (const g of gaps) {
      console.log(`\n[${g.code}]`);
      if (g.apiUnmatched.length)
        console.log(`  API sin equivalente nuestro (añadir a convocatoria):\n    - ${g.apiUnmatched.join("\n    - ")}`);
      if (g.ourUnmatched.length)
        console.log(`  Nuestros sin equivalente API (sin cachear, no críticos):\n    - ${g.ourUnmatched.join("\n    - ")}`);
    }
  }

  if (!APPLY) console.log(`\n(DRY-RUN — nada escrito. Repite con --apply para cachear.)`);
  process.exit(0);
}

main().catch((e) => {
  console.error("ERR", e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
