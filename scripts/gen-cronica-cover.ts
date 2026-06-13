/**
 * Genera la portada "marcador de retransmisión" de la crónica de un
 * partido y la escribe como PNG en disco (por defecto
 * `/tmp/cronica-cover-<CODE>.png`).
 *
 * El comando `/cronica-qm` lo invoca antes del upsert y pasa esa ruta
 * como `coverFile` en el JSON → `db:upsert-news` la sube al bucket `news`.
 *
 * Uso:
 *   pnpm db:gen-cronica-cover M02
 *   pnpm db:gen-cronica-cover M02 --out /tmp/foo.png
 *
 * Imprime en stdout la ruta del PNG generado (última línea), para que el
 * caller la capture.
 */
import { writeFile } from "node:fs/promises";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, matches, teams } from "@/lib/db/schema";
import { renderCronicaCover, type CronicaCoverData } from "@/lib/og/cronica-cover";

const STAGE_LABEL: Record<string, string> = {
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinales",
  third: "Tercer puesto",
  final: "Final",
};

function dateLabel(d: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Madrid",
  })
    .format(d)
    .replace(/\./g, "")
    .toUpperCase();
}

async function main() {
  const argv = process.argv.slice(2);
  const code = argv.find((a) => !a.startsWith("--"));
  const outIdx = argv.indexOf("--out");
  const out =
    outIdx >= 0 && argv[outIdx + 1]
      ? argv[outIdx + 1]
      : `/tmp/cronica-cover-${code}.png`;

  if (!code || !/^[A-Z]{1,3}[0-9]{1,3}$/.test(code)) {
    console.error("Uso: pnpm db:gen-cronica-cover <CODE> [--out ruta.png]");
    process.exit(1);
  }

  const [m] = await db.select().from(matches).where(eq(matches.code, code)).limit(1);
  if (!m) {
    console.error(`NO_MATCH: no existe el partido ${code}`);
    process.exit(1);
  }
  if (m.homeScore == null || m.awayScore == null) {
    console.error(`SIN_MARCADOR: el partido ${code} no tiene resultado en la BD`);
    process.exit(1);
  }

  const tids = [m.homeTeamId, m.awayTeamId].filter(Boolean) as number[];
  const ts = tids.length ? await db.select().from(teams).where(inArray(teams.id, tids)) : [];
  const tById = new Map(ts.map((t) => [t.id, t]));
  const home = m.homeTeamId ? tById.get(m.homeTeamId) : null;
  const away = m.awayTeamId ? tById.get(m.awayTeamId) : null;

  // Etiqueta de fase: en grupos, el código del grupo ("GRUPO A").
  let stageLabel = STAGE_LABEL[m.stage] ?? m.stage.toUpperCase();
  if (m.stage === "group" && home?.groupId) {
    const [g] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, home.groupId))
      .limit(1);
    if (g?.code) stageLabel = `Grupo ${g.code}`;
  }

  const winner: CronicaCoverData["winner"] = m.winnerTeamId
    ? m.winnerTeamId === m.homeTeamId
      ? "home"
      : m.winnerTeamId === m.awayTeamId
        ? "away"
        : null
    : null;

  const data: CronicaCoverData = {
    homeName: home?.name ?? "?",
    awayName: away?.name ?? "?",
    homeCode: home?.code ?? null,
    awayCode: away?.code ?? null,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    wentToPens: m.wentToPens ?? false,
    homePen: m.homeScorePen,
    awayPen: m.awayScorePen,
    stageLabel: stageLabel.toUpperCase(),
    dateLabel: m.scheduledAt ? dateLabel(m.scheduledAt) : null,
    venue: m.venue,
    winner,
  };

  const image = await renderCronicaCover(data);
  const buf = Buffer.from(await image.arrayBuffer());
  await writeFile(out, buf);
  console.error(
    `✔ Portada generada: ${home?.name} ${m.homeScore}-${m.awayScore} ${away?.name} (${stageLabel})`,
  );
  // Última línea de stdout = la ruta, para que el caller la capture.
  console.log(out);
  process.exit(0);
}

main().catch((e) => {
  console.error("ERR", e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
