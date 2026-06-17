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
// Pool: `max: 10` por instancia. El límite real que petaba en los picos
// post-partido es "Max client connections" del pooler (Supavisor): cada
// instancia abre hasta `max` conexiones, así que el total = instancias × max.
// Con 25 reventábamos 600 con solo ~24 instancias; con 10 hay margen para ~60.
//
// Antes 10 colgaba el dashboard porque, con huérfanas en `ClientRead` y sin
// timeout de adquisición en postgres.js, un pool pequeño se agotaba. Ya no:
//   · el recompute pesado es batch (~2,5s, no retiene conexiones 14 min),
//   · Fluid Compute reutiliza instancias (menos Lambdas muertas → menos huérfanas),
//   · statement_timeout=7s libera rápido cualquier conexión ocupada,
//   · `withDbRetry` cubre los CONNECTION_CLOSED transitorios.
// Si reapareciera algún cuelgue, la vía no es subir `max` sino cachear más
// lecturas compartidas (menos demanda concurrente de conexiones).
const client =
  globalThis.__pg ??
  postgres(connectionString, {
    max: 10,
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
