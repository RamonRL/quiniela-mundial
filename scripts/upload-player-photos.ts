import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, teams } from "@/lib/db/schema";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Sube en bote las caras de los jugadores que están en
 * `/plantillas/<pais>/<archivo>.png|jpg` al bucket `players` de
 * Supabase Storage y enlaza cada foto al jugador correspondiente en
 * la tabla `players` por nombre.
 *
 * Comportamiento:
 *  - Por defecto sube SOLO a jugadores que aún NO tienen photoUrl.
 *    Con `--force` también pisa los que sí tienen.
 *  - `--dry-run` no toca nada — solo imprime el plan.
 *  - Matching estrictamente por nombre normalizado:
 *      1. nombre completo del jugador === filename
 *      2. último apellido del jugador === filename
 *      3. todos los tokens del filename aparecen en el nombre del
 *         jugador
 *    Si un filename matchea a más de un jugador del mismo equipo,
 *    se descarta para evitar falsos positivos. Si no matchea a
 *    ninguno, se loggea para que tú decidas si renombrar el archivo
 *    o subir manualmente desde /admin.
 *
 * Uso:
 *   pnpm db:upload-player-photos NOR              # solo Noruega
 *   pnpm db:upload-player-photos NOR --dry-run    # plan sin tocar
 *   pnpm db:upload-player-photos                  # todas las carpetas
 *   pnpm db:upload-player-photos --force          # sobreescribe todas
 */

// Mapeo carpeta (español, con espacios) → código FIFA en la DB.
// Mantén sincronizado con `scripts/seed-tournament.ts`.
const FOLDER_BY_CODE: Record<string, string> = {
  GER: "alemania",
  AUT: "austria",
  BEL: "belgica",
  BIH: "bosnia",
  BRA: "brasil",
  CPV: "cabo verde",
  CIV: "costa de marfil",
  CRO: "croacia",
  SCO: "escocia",
  FRA: "francia",
  HAI: "haiti",
  IRN: "iran",
  JPN: "japon",
  KOR: "korea",
  NOR: "noruega",
  NZL: "nueva zelanda",
  POR: "portugal",
  SWE: "suecia",
  SUI: "suiza",
  TUN: "tunez",
};

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function normalize(s: string): string {
  return s
    // Letras "atómicas" que Unicode NFD NO descompone — necesitan
    // mapeo manual. Cubre escandinavo (ø, æ, å funciona vía NFD pero
    // por seguridad), islandés (ð, þ), alemán (ß), polaco (ł), turco
    // (ı), serbocroata (đ).
    .replace(/[øØ]/g, "o")
    .replace(/[æÆ]/g, "ae")
    .replace(/[ðÐ]/g, "d")
    .replace(/[þÞ]/g, "th")
    .replace(/[ßẞ]/g, "ss")
    .replace(/[łŁ]/g, "l")
    .replace(/[ıİ]/g, "i")
    .replace(/[đĐ]/g, "d")
    // Quita acentos descomponibles (á, é, å, ñ, ã, ç, ü, š, ž, ć…).
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type DbPlayer = {
  id: number;
  name: string;
  photoUrl: string | null;
  normalized: string;
  tokens: string[];
  lastName: string;
};

function indexPlayers(rows: { id: number; name: string; photoUrl: string | null }[]): DbPlayer[] {
  return rows.map((r) => {
    const normalized = normalize(r.name);
    const tokens = normalized.split(" ").filter(Boolean);
    return {
      id: r.id,
      name: r.name,
      photoUrl: r.photoUrl,
      normalized,
      tokens,
      lastName: tokens[tokens.length - 1] ?? "",
    };
  });
}

/**
 * Devuelve match único, o `null` si no hay ninguno, o un array de
 * candidatos si hay ambigüedad (para reportar).
 */
function matchFileToPlayer(
  fileNorm: string,
  fileTokens: string[],
  pool: DbPlayer[],
): { player: DbPlayer; rule: string } | { ambiguous: DbPlayer[] } | null {
  // Regla 1: nombre completo == filename
  const exact = pool.filter((p) => p.normalized === fileNorm);
  if (exact.length === 1) return { player: exact[0], rule: "exact-name" };
  if (exact.length > 1) return { ambiguous: exact };

  // Regla 2: apellido == filename
  const lastNameOnly = pool.filter(
    (p) => p.lastName === fileNorm && p.tokens.length > 1,
  );
  if (lastNameOnly.length === 1) return { player: lastNameOnly[0], rule: "last-name" };
  if (lastNameOnly.length > 1) return { ambiguous: lastNameOnly };

  // Regla 3: todos los tokens del file aparecen en el nombre del jugador
  if (fileTokens.length > 0) {
    const tokenMatch = pool.filter((p) =>
      fileTokens.every((t) => p.tokens.includes(t)),
    );
    if (tokenMatch.length === 1) return { player: tokenMatch[0], rule: "tokens-subset" };
    if (tokenMatch.length > 1) return { ambiguous: tokenMatch };
  }

  return null;
}

async function processTeam(
  code: string,
  options: { force: boolean; dryRun: boolean },
): Promise<{ uploaded: number; skipped: number; missing: number; ambiguous: number }> {
  const folder = FOLDER_BY_CODE[code];
  if (!folder) {
    console.log(`  ✗ ${code}: no hay mapeo de carpeta en FOLDER_BY_CODE.`);
    return { uploaded: 0, skipped: 0, missing: 0, ambiguous: 0 };
  }

  const [team] = await db
    .select({ id: teams.id, code: teams.code, name: teams.name })
    .from(teams)
    .where(eq(teams.code, code))
    .limit(1);
  if (!team) {
    console.log(`  ✗ ${code}: equipo no encontrado en DB.`);
    return { uploaded: 0, skipped: 0, missing: 0, ambiguous: 0 };
  }

  const dirPath = path.join(process.cwd(), "plantillas", folder);
  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch {
    console.log(`  ✗ ${code} (${team.name}): carpeta no encontrada: plantillas/${folder}/`);
    return { uploaded: 0, skipped: 0, missing: 0, ambiguous: 0 };
  }

  const files = entries.filter((f) =>
    IMAGE_EXT.has(path.extname(f).toLowerCase()),
  );
  if (files.length === 0) {
    console.log(`  ↷ ${code} (${team.name}): carpeta vacía.`);
    return { uploaded: 0, skipped: 0, missing: 0, ambiguous: 0 };
  }

  const teamPlayers = await db
    .select({
      id: players.id,
      name: players.name,
      photoUrl: players.photoUrl,
    })
    .from(players)
    .where(eq(players.teamId, team.id));
  const pool = indexPlayers(teamPlayers);

  console.log(`\n▸ ${code} ${team.name} · ${files.length} fotos · ${pool.length} jugadores en DB`);

  const supabase = options.dryRun ? null : createSupabaseServiceClient();

  let uploaded = 0;
  let skipped = 0;
  let missing = 0;
  let ambiguous = 0;
  const usedPlayerIds = new Set<number>();

  for (const file of files) {
    const base = file.replace(/\.[^.]+$/, "");
    const fileNorm = normalize(base);
    const fileTokens = fileNorm.split(" ").filter(Boolean);

    const result = matchFileToPlayer(fileNorm, fileTokens, pool);
    if (!result) {
      console.log(`    ⚠ ${file} → sin match en plantilla`);
      missing++;
      continue;
    }
    if ("ambiguous" in result) {
      const names = result.ambiguous.map((p) => p.name).join(", ");
      console.log(`    ⚠ ${file} → ambiguo: ${names}`);
      ambiguous++;
      continue;
    }
    const { player, rule } = result;
    if (usedPlayerIds.has(player.id)) {
      console.log(`    ⚠ ${file} → ${player.name} ya consumido por otro archivo, skip`);
      ambiguous++;
      continue;
    }
    if (player.photoUrl && !options.force) {
      console.log(`    ↷ ${file} → ${player.name} ya tiene foto, skip (--force para pisar)`);
      skipped++;
      usedPlayerIds.add(player.id);
      continue;
    }

    if (options.dryRun) {
      console.log(
        `    ✓ ${file} → ${player.name} (${rule})  [dry-run]`,
      );
      uploaded++;
      usedPlayerIds.add(player.id);
      continue;
    }

    // Subir.
    const ext = path.extname(file).toLowerCase().slice(1);
    const slug = player.name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const remotePath = `${team.code}/${slug}-${Date.now()}.${ext}`;
    const contentType =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
          ? "image/webp"
          : "image/png";

    const buffer = await readFile(path.join(dirPath, file));
    const { error } = await supabase!.storage
      .from("players")
      .upload(remotePath, buffer, { contentType, upsert: true });
    if (error) {
      console.log(`    ✗ ${file} → upload falló: ${error.message}`);
      continue;
    }
    const { data } = supabase!.storage.from("players").getPublicUrl(remotePath);

    await db
      .update(players)
      .set({ photoUrl: data.publicUrl })
      .where(eq(players.id, player.id));

    console.log(`    ✓ ${file} → ${player.name} (${rule})`);
    uploaded++;
    usedPlayerIds.add(player.id);
  }

  // Reporta jugadores sin foto que no han recibido nada — útil para
  // saber si el archivo está mal nombrado o sencillamente no se ha
  // descargado.
  const stillMissing = pool.filter(
    (p) => !p.photoUrl && !usedPlayerIds.has(p.id),
  );
  if (stillMissing.length > 0) {
    console.log(`    ─ ${stillMissing.length} jugador(es) sin foto tras este pase:`);
    for (const p of stillMissing) {
      console.log(`        · ${p.name}`);
    }
  }

  return { uploaded, skipped, missing, ambiguous };
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const codeArg = args.find((a) => !a.startsWith("--"))?.toUpperCase();

  const codes = codeArg ? [codeArg] : Object.keys(FOLDER_BY_CODE);
  if (codeArg && !FOLDER_BY_CODE[codeArg]) {
    console.log(
      `✗ ${codeArg}: añade el mapeo en FOLDER_BY_CODE del script.`,
    );
    process.exit(1);
  }

  console.log(
    `→ Subiendo fotos de jugadores ${dryRun ? "(DRY-RUN)" : ""}${force ? " [FORCE]" : ""}`,
  );

  let totals = { uploaded: 0, skipped: 0, missing: 0, ambiguous: 0 };
  for (const code of codes) {
    const r = await processTeam(code, { force, dryRun });
    totals.uploaded += r.uploaded;
    totals.skipped += r.skipped;
    totals.missing += r.missing;
    totals.ambiguous += r.ambiguous;
  }

  console.log(
    `\n✔ Hecho. Subidas: ${totals.uploaded}, ya tenían foto: ${totals.skipped}, sin match: ${totals.missing}, ambiguas: ${totals.ambiguous}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
