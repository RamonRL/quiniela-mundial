import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Crea el bucket `news` en Supabase Storage si aún no existe, marcándolo
 * como público (las portadas se sirven directamente desde la URL
 * pública). Se ejecuta con la service-role key, así que requiere
 * SUPABASE_SERVICE_ROLE_KEY en .env.local.
 *
 * Uso:
 *   pnpm db:setup-news-bucket
 */
async function main() {
  const supabase = createSupabaseServiceClient();
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("✘ No se pudo listar buckets:", listErr.message);
    process.exit(1);
  }
  const exists = buckets?.some((b) => b.name === "news");
  if (exists) {
    console.log("✔ El bucket 'news' ya existe.");
    return;
  }

  const { error } = await supabase.storage.createBucket("news", {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error) {
    console.error("✘ Error creando el bucket:", error.message);
    process.exit(1);
  }
  console.log("✔ Bucket 'news' creado (público, 5MB max, JPG/PNG/WebP).");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
