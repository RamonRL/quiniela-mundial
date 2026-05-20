import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Crea el bucket `leagues` en Supabase Storage si aún no existe.
 * Aloja los logos de quinielas privadas — público (URL directa sin
 * signed URL), 2 MB máx por archivo, formatos JPG/PNG/WebP.
 *
 * Idempotente: si ya existe, no hace nada.
 *
 * Uso:
 *   pnpm db:setup-leagues-bucket
 */
async function main() {
  const supabase = createSupabaseServiceClient();
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("✘ No se pudo listar buckets:", listErr.message);
    process.exit(1);
  }
  const exists = buckets?.some((b) => b.name === "leagues");
  if (exists) {
    console.log("✔ El bucket 'leagues' ya existe.");
    return;
  }

  const { error } = await supabase.storage.createBucket("leagues", {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error) {
    console.error("✘ Error creando el bucket:", error.message);
    process.exit(1);
  }
  console.log("✔ Bucket 'leagues' creado (público, 2MB max, JPG/PNG/WebP).");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
