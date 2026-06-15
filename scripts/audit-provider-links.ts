/**
 * Audita los vínculos players.providerPlayerId contra la plantilla de
 * API-Football y detecta los AMBIGUOS: aquellos donde el último token del
 * nombre del proveedor NO mapea unívocamente a ese jugador nuestro (lo que
 * pasa con nombres de apellido-delante, p. ej. coreano "Son"/"Cho" comparten
 * "min"). Esos vínculos pueden acreditar un gol al jugador equivocado.
 *
 *   pnpm db:audit-provider-links            # lista los sospechosos (todos)
 *   pnpm db:audit-provider-links --fix       # los limpia (vuelven a 'pendiente',
 *                                            # seguro; re-vincúlalos en
 *                                            # /admin/jugadores/vincular)
 *   pnpm db:audit-provider-links KOR         # solo una selección (dry-run)
 *   pnpm db:audit-provider-links KOR --fix   # solo una selección, limpiando
 *
 * Requiere API_FOOTBALL_KEY. Solo limpia, nunca crea vínculos.
 */
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, teams } from "@/lib/db/schema";
import { localizedTeamName } from "@/lib/team-names";
import { fetchLeagueTeams, fetchTeamSquad } from "@/lib/sports/api-football";
import { norm, PROVIDER_TEAM_ALIASES } from "@/lib/sports/player-matching";

const FIX = process.argv.includes("--fix");
const ONLY = process.argv.find((a) => /^[A-Z]{3}$/.test(a)) ?? null;
const toks = (s: string) => norm(s).split(" ").filter(Boolean);
const lastTok = (s: string) => {
  const t = toks(s);
  return t[t.length - 1] ?? "";
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!process.env.API_FOOTBALL_KEY) throw new Error("Falta API_FOOTBALL_KEY");

  const apiTeams = await fetchLeagueTeams();
  const allTeams = (await db.select().from(teams).orderBy(asc(teams.code))).filter(
    (t) => (ONLY ? t.code === ONLY : true),
  );
  if (ONLY && allTeams.length === 0) throw new Error(`No existe la selección "${ONLY}".`);

  let suspect = 0;
  for (const t of allTeams) {
    const want = new Set([norm(localizedTeamName(t.code, t.name, "en")), norm(t.name)]);
    for (const [alias, c] of Object.entries(PROVIDER_TEAM_ALIASES)) if (c === t.code) want.add(alias);
    const at = apiTeams.find((x) => want.has(norm(x.team.name)));
    if (!at) continue;

    const squad = (await fetchTeamSquad(at.team.id))[0]?.players ?? [];
    const byId = new Map(squad.map((p) => [p.id, p.name] as const));
    const ours = await db
      .select({ id: players.id, name: players.name, providerPlayerId: players.providerPlayerId })
      .from(players)
      .where(eq(players.teamId, t.id));

    for (const p of ours) {
      if (p.providerPlayerId == null) continue;
      const apiName = byId.get(p.providerPlayerId);
      if (!apiName) continue; // no está en la plantilla actual → no evaluable

      // El vínculo es FIABLE si el último token del nombre de API mapea a un
      // único jugador nuestro y es este (igual que el matcher en vivo).
      const lt = lastTok(apiName);
      const matches = ours.filter((o) => toks(o.name).includes(lt));
      const reliable = matches.length === 1 && matches[0].id === p.id;
      if (reliable) continue;

      suspect += 1;
      console.log(`${FIX ? "LIMPIADO" : "SOSPECHOSO"} ${t.code}: "${p.name}" ⊁ "${apiName}"`);
      if (FIX) {
        await db.update(players).set({ providerPlayerId: null }).where(eq(players.id, p.id));
      }
    }
    await sleep(250);
  }

  console.log(
    `\n${FIX ? "Limpiados" : "Sospechosos"}: ${suspect}.` +
      (FIX
        ? " Re-vincúlalos en /admin/jugadores/vincular."
        : " Repite con --fix para limpiarlos (vuelven a 'pendiente', seguro)."),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("ERR", e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
