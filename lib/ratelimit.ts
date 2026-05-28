import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

export type RateLimitResult = { ok: boolean; retryAfterMs: number };

/**
 * Limitador fixed-window por clave, respaldado por la tabla `rate_limits`.
 *
 * Atómico en una sola sentencia: un upsert por la PK `key` que incrementa el
 * contador dentro de la ventana actual o lo reinicia a 1 si la ventana ya
 * expiró. Devuelve `ok: false` cuando se supera `limit` dentro de la ventana.
 *
 * **Fail-open**: si la BD falla, devolvemos `ok: true`. El rate limit es una
 * protección frente a abuso/DOS, no una puerta de negocio — nunca debe impedir
 * a un usuario legítimo guardar por un problema transitorio de infra.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  try {
    const [row] = await db
      .insert(rateLimits)
      .values({ key, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          // Mismo tramo → +1; tramo nuevo (la fila era de una ventana vieja) → 1.
          count: sql`case when ${rateLimits.windowStart} = ${windowStart} then ${rateLimits.count} + 1 else 1 end`,
          windowStart: sql`${windowStart}`,
        },
      })
      .returning({ count: rateLimits.count });
    const count = row?.count ?? 1;
    if (count > limit) {
      return { ok: false, retryAfterMs: windowStart.getTime() + windowMs - now };
    }
    return { ok: true, retryAfterMs: 0 };
  } catch {
    return { ok: true, retryAfterMs: 0 };
  }
}
