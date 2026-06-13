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
import { renderCronicaCover } from "@/lib/og/cronica-cover";
import { loadCronicaCoverData } from "@/lib/og/cronica-cover-data";

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

  const data = await loadCronicaCoverData({ code });
  if (!data) {
    console.error(
      `SIN_DATOS: el partido ${code} no existe o no tiene resultado en la BD`,
    );
    process.exit(1);
  }

  const image = await renderCronicaCover(data);
  const buf = Buffer.from(await image.arrayBuffer());
  await writeFile(out, buf);
  console.error(
    `✔ Portada generada: ${data.homeName} ${data.homeScore}-${data.awayScore} ${data.awayName} (${data.stageLabel})`,
  );
  // Última línea de stdout = la ruta, para que el caller la capture.
  console.log(out);
  process.exit(0);
}

main().catch((e) => {
  console.error("ERR", e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
