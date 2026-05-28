/**
 * Descarga a disco los objetos de los buckets de Supabase Storage que NO son
 * reproducibles desde otra fuente — `avatars` (fotos de perfil que sube el
 * usuario), `news` (portadas de noticias) y `leagues` (logos corporativos).
 * Los buckets `flags` y `players` se regeneran desde fuentes externas, así que
 * no se incluyen por defecto (pásalos con --all si los quieres también).
 *
 * El workflow de GitHub Actions empaqueta el directorio resultante en un
 * .tar.gz y lo sube a Cloudflare R2. Ver docs/disaster-recovery.md.
 *
 * Uso:
 *   pnpm db:backup-storage [--out=./backup-storage] [--all]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const DEFAULT_BUCKETS = ["avatars", "news", "leagues"];
const ALL_BUCKETS = ["avatars", "news", "leagues", "flags", "players"];
const PAGE = 1000;

function parseArgs() {
  const args = process.argv.slice(2);
  const outArg = args.find((a) => a.startsWith("--out="));
  return {
    outDir: outArg ? outArg.slice("--out=".length) : "./backup-storage",
    all: args.includes("--all"),
  };
}

async function listAll(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;
  // Paginamos por si un bucket tiene > PAGE objetos en un mismo nivel.
  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Supabase marca las "carpetas" con id === null → recursión.
      if (entry.id === null) {
        files.push(...(await listAll(supabase, bucket, path)));
      } else {
        files.push(path);
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return files;
}

async function main() {
  const { outDir, all } = parseArgs();
  const buckets = all ? ALL_BUCKETS : DEFAULT_BUCKETS;
  const supabase = createSupabaseServiceClient();

  let total = 0;
  for (const bucket of buckets) {
    const paths = await listAll(supabase, bucket, "");
    console.log(`▸ ${bucket}: ${paths.length} objeto(s)`);
    for (const path of paths) {
      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (error || !data) {
        console.error(`  ✗ ${bucket}/${path}: ${error?.message ?? "sin datos"}`);
        continue;
      }
      const dest = join(outDir, bucket, path);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, Buffer.from(await data.arrayBuffer()));
      total += 1;
    }
  }
  console.log(`✔ Hecho. ${total} objeto(s) descargado(s) en ${outDir}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
