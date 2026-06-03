import * as Sentry from "@sentry/nextjs";

/**
 * Reintentos para errores TRANSITORIOS de conexión a Postgres.
 *
 * El caso que nos duele en producción: tras un freeze de la Lambda de Vercel
 * (o un redeploy → cold start), el cliente `postgres` cacheado en `globalThis`
 * conserva un socket hacia el pooler (Supavisor) que ya está muerto. La PRIMERA
 * query tras descongelar revienta con `CONNECTION_CLOSED` / `ECONNRESET` antes
 * de ejecutarse en una conexión viva. `postgres.js` descarta ese socket y la
 * siguiente query abre uno nuevo y sano — por eso reintentar UNA vez basta casi
 * siempre y convierte un 500/timeout de cara al usuario en un hipo invisible.
 *
 * IMPORTANTE — seguridad de reintentar:
 *   Solo reintentamos errores a nivel de CONEXIÓN (el socket estaba muerto → la
 *   query NO llegó a ejecutarse ni a commitear). NO reintentamos errores de
 *   query (violación de constraint, `statement_timeout` 57014, sintaxis…) que
 *   son deterministas: reintentarlos solo gastaría tiempo y, peor, podría
 *   duplicar trabajo. Por eso las mutaciones que envolvemos deben ser
 *   transaccionales o idempotentes (upsert/`onConflictDo*`), que es el caso de
 *   nuestros server actions de guardado.
 */

// Códigos de `postgres.js` / Node que significan "el socket estaba muerto, la
// query no corrió". Seguros de reintentar.
const RETRYABLE_CODES = new Set([
  "CONNECTION_CLOSED",
  "CONNECTION_ENDED",
  "CONNECTION_DESTROYED",
  "CONNECT_TIMEOUT",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNREFUSED",
]);

const RETRYABLE_MESSAGE =
  /CONNECTION_(CLOSED|ENDED|DESTROYED)|ECONNRESET|EPIPE|terminating connection|connection (closed|terminated|reset|ended)/i;

/**
 * ¿Es un error de conexión transitorio (seguro de reintentar)? Mira primero el
 * `.code` (lo más fiable) y cae al texto del mensaje como red de seguridad,
 * porque `postgres.js` a veces sepulta el código dentro del mensaje.
 */
export function isTransientDbError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  if (typeof code === "string" && RETRYABLE_CODES.has(code)) return true;
  const message = (err as { message?: unknown }).message;
  return typeof message === "string" && RETRYABLE_MESSAGE.test(message);
}

type RetryOpts = {
  /** Intentos adicionales tras el primero. Default 2 (→ 3 intentos en total). */
  retries?: number;
  /** Backoff base en ms; crece exponencial: base, base*2, … Default 80ms. */
  baseDelayMs?: number;
  /**
   * Tope duro por intento. Si una query tarda más, abortamos con error en vez
   * de colgarnos sin límite. CLAVE: postgres.js no tiene timeout de adquisición
   * de conexión — si el pool está agotado (p. ej. por conexiones huérfanas en
   * `ClientRead`), un `await sql\`…\`` espera una conexión libre PARA SIEMPRE, y
   * el `statement_timeout` no lo salva porque la query ni ha empezado. Este
   * timeout convierte ese cuelgue infinito en un fallo rápido (8s) que, en una
   * página con fallback (`safe()`/`withTimeout`), degrada en vez de tumbarla.
   * Default 8000ms (por encima del statement_timeout de 7s, así para queries que
   * SÍ ejecutan salta antes el de Postgres).
   */
  timeoutMs?: number;
  /** Etiqueta para el breadcrumb de Sentry / logs. */
  label?: string;
};

/** Error de timeout de `withDbRetry`. No es transitorio → no se reintenta. */
export class DbTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`db op '${label}' superó el timeout de ${ms}ms`);
    this.name = "DbTimeoutError";
  }
}

function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new DbTimeoutError(label, ms)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Ejecuta `fn`, reintentando solo si lanza un error de conexión transitorio
 * (ver `isTransientDbError`). Cualquier otro error se propaga al instante.
 *
 * Backoff por defecto: 80ms, 160ms → como mucho ~240ms de latencia extra en el
 * peor caso. Cabe de sobra dentro del límite de función de Vercel y del
 * presupuesto de 4s del loader de deadlines.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOpts = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const base = opts.baseDelayMs ?? 80;
  const timeoutMs = opts.timeoutMs ?? 8000;
  const label = opts.label ?? "query";
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withDeadline(fn(), timeoutMs, label);
    } catch (err) {
      lastErr = err;
      // Un timeout NO se reintenta: si el pool está agotado, reintentar solo
      // añade más presión. Falla rápido y deja que el caller degrade.
      if (err instanceof DbTimeoutError) throw err;
      if (attempt === retries || !isTransientDbError(err)) throw err;
      const delay = base * 2 ** attempt;
      Sentry.addBreadcrumb({
        category: "db.retry",
        level: "warning",
        message: `transient db error (${opts.label ?? "query"}) → retry ${
          attempt + 1
        }/${retries} en ${delay}ms`,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}
