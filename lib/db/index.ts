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
//   - idle_timeout=8s → reciclar conexiones idle pronto. Es la principal
//     defensa contra `CONNECTION_CLOSED`: si el CLIENTE cierra la conexión
//     idle antes de que la mate Supavisor (o la red entre freezes de la
//     Lambda), evitamos reutilizar sockets zombie y escribir sobre ellos.
//   - max_lifetime=15 min → reciclar duro periódicamente.
//
// Pool: `max: 10` — con el transaction pooler (6543) Supavisor MULTIPLEXA
// muchos clientes sobre pocas conexiones backend, así que no hace falta un
// pool grande por instancia. 10 cubre de sobra el `Promise.all` de ~14
// queries del dashboard (las que sobran se encolan unos ms) y, sobre todo,
// deja muchas menos conexiones idle sueltas → menos sockets que se quedan
// stale (causa de CONNECTION_CLOSED) y menos presión de memoria/conexiones.
const client =
  globalThis.__pg ??
  postgres(connectionString, {
    max: 10,
    prepare: false,
    connect_timeout: 5,
    idle_timeout: 8,
    max_lifetime: 60 * 15,
    connection: {
      statement_timeout: 7000,
      idle_in_transaction_session_timeout: 7000,
    },
  });

globalThis.__pg = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Database = typeof db;
export { schema };
