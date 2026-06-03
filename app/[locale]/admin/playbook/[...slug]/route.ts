import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";

/**
 * Sirve los HTML/CSS/PDF estáticos del playbook de marketing
 * (`docs/marketing/*`) gateando por admin. Los archivos NO viven en
 * `/public` precisamente para que solo administradores puedan abrirlos.
 *
 * Tracing: en producción Next no incluye `docs/` por defecto en los
 * bundles serverless. Lo forzamos vía `outputFileTracingIncludes` en
 * `next.config.ts`.
 */
export const dynamic = "force-dynamic";

const ROOT = path.resolve(process.cwd(), "docs/marketing");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string[] }> },
) {
  await requireAdmin();

  const { slug } = await ctx.params;
  if (!slug || slug.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const rel = slug.join("/");
  const full = path.resolve(ROOT, rel);
  // Anti path-traversal: el path resuelto debe estar bajo ROOT.
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let buf: Buffer;
  try {
    buf = await readFile(full);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(full).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  // Buffer → Blob porque NextResponse espera BodyInit y la versión TS de
  // Buffer no satisface el tipo directamente.
  const body = new Blob([new Uint8Array(buf)], { type: contentType });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      // Sin cache compartida — el playbook se edita y queremos ver
      // cambios inmediatos al navegar entre devices.
      "cache-control": "private, no-store",
    },
  });
}
