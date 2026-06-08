import { NextResponse } from "next/server";
import { runWatchdog, syncLiveMatches } from "@/lib/automation/match-sync";
import { notifyServerError } from "@/lib/telegram/events";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron de sincronización de resultados/goleadores (Vercel Cron, 1/min).
 *
 * Protegido por `CRON_SECRET`: Vercel inyecta `Authorization: Bearer
 * <CRON_SECRET>` cuando el secreto está configurado. También aceptamos el
 * mismo header para poder dispararlo a mano (panel /admin/sync, curl).
 *
 * Es barato cuando no hay partidos en ventana (no llama al proveedor).
 * Reusa el camino idempotente `applyMatchUpdate`, así que reintentos o
 * solapes no duplican puntos.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const report = await syncLiveMatches();
    // El watchdog no debe tumbar el sync si falla.
    await runWatchdog().catch(() => {});
    return NextResponse.json({ ok: true, ...report });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync failed";
    // Espejo a Telegram para que el admin se entere de un fallo del cron.
    if (process.env.NODE_ENV === "production") {
      void notifyServerError({ message: `cron/sync-matches: ${message}`, route: "/api/cron/sync-matches" });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// Permite POST también (algunos schedulers usan POST).
export const POST = GET;
