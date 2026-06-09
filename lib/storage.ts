import { createSupabaseServiceClient } from "@/lib/supabase/server";

const BUCKET_BY_KIND = {
  flag: "flags",
  player: "players",
  avatar: "avatars",
  news: "news",
  league: "leagues",
  sponsor: "sponsors",
} as const;

export type StorageKind = keyof typeof BUCKET_BY_KIND;

/**
 * Upload an image to a public Supabase Storage bucket and return the public URL.
 * Buckets must be created and set as public via the Supabase dashboard once;
 * see README. Existing files at the same path are overwritten.
 */
export async function uploadImage(args: {
  kind: StorageKind;
  path: string;
  file: File;
}) {
  const bucket = BUCKET_BY_KIND[args.kind];
  const supabase = createSupabaseServiceClient();
  const arrayBuffer = await args.file.arrayBuffer();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(args.path, arrayBuffer, {
      contentType: args.file.type || "image/png",
      upsert: true,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(args.path);
  return publicUrl;
}

export async function deleteImage(args: { kind: StorageKind; path: string }) {
  const bucket = BUCKET_BY_KIND[args.kind];
  const supabase = createSupabaseServiceClient();
  await supabase.storage.from(bucket).remove([args.path]);
}
