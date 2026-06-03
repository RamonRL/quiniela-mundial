import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to your .env.local.");
}

declare global {
  // eslint-disable-next-line no-var
  var __pg: ReturnType<typeof postgres> | undefined;
}

// Reuse the same client across invocations on the same Lambda instance — on
// Vercel the global object survives between requests for tens of seconds to
// minutes, so this avoids paying TCP+TLS handshake cost on every page load.
//
// Timeouts (defensa en profundidad para que el dashboard nunca se cuelgue
// más de lo que aguanta Vercel — 10s en Hobby):
//   - statement_timeout=7s a nivel de sesión postgres → la BD aborta sola
//     cualquier query lenta y devuelve la conexión al pool. Es lo que evita
//     que una conexión muerta envenene el pool para futuras requests.
//   - idle_in_transaction_session_timeout=7s → mata transacciones colgadas.
//   - connect_timeout=5s → fallar rápido en handshake TCP/TLS roto.
//   - idle_timeout=20s → reciclar conexiones idle sin churn excesivo.
//   - max_lifetime=30 min → reciclar duro periódicamente.
//
// Pool: `max: 25` — HEADROOM es lo importante. Cuando una Lambda se congela
// o Vercel la mata a mitad de query, esa conexión queda "ocupada" en el pool
// (y huérfana en `ClientRead` en Postgres) hasta que Supavisor la recicla.
// Con un pool pequeño (probamos 10), unas pocas huérfanas AGOTAN el pool: las
// queries nuevas esperan una conexión libre PARA SIEMPRE (postgres.js no tiene
// timeout de adquisición) y el dashboard se cuelga sin que el statement_timeout
// lo salve (la query ni empezó). 25 da margen de sobra para absorber huérfanas
// mientras Supavisor las limpia. El `CONNECTION_CLOSED` que motivó bajarlo lo
// cubre ahora `withDbRetry`, y las rutas críticas tienen timeout (ver retry.ts).
const client =
  globalThis.__pg ??
  postgres(connectionString, {
    max: 25,
    prepare: false,
    connect_timeout: 5,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connection: {
      statement_timeout: 7000,
      idle_in_transaction_session_timeout: 7000,
    },
  });

globalThis.__pg = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Database = typeof db;
export { schema };
