/**
 * `fetch` con timeout duro para las llamadas del cliente de Supabase Auth
 * (GoTrue). El SDK de Supabase no pone timeout a sus peticiones, así que si
 * GoTrue va lento, se cae o te rate-limitea, `supabase.auth.getUser()` se
 * queda colgado SIN LÍMITE — y como esa llamada está en el camino crítico de
 * cada request protegida (middleware) y de cada render autenticado
 * (`getCurrentUser`), una request colgada = página colgada para el usuario.
 *
 * Esto acota cualquier llamada de auth a `AUTH_FETCH_TIMEOUT_MS`: pasado ese
 * tiempo se aborta y el caller decide (el middleware falla ABIERTO, ver
 * middleware.ts). Convierte un cuelgue indefinido en, como mucho, un fallo de
 * unos segundos — muy por debajo del límite de función de Vercel.
 */
export const AUTH_FETCH_TIMEOUT_MS = 5000;

export const fetchWithTimeout: typeof fetch = (input, init) => {
  // Si el SDK ya pasó su propio AbortSignal, respetamos el suyo y no
  // interferimos (no queremos pisar una cancelación intencionada).
  if (init?.signal) return fetch(input, init);
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error(`supabase auth fetch timeout (${AUTH_FETCH_TIMEOUT_MS}ms)`)),
    AUTH_FETCH_TIMEOUT_MS,
  );
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
};
