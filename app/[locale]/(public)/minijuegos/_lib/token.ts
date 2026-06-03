import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC ligero para firmar las respuestas correctas de una partida sin tener
 * que persistirlas en BD. El cliente recibe `token = base64(payload).hexSig`
 * en `startRound` y lo devuelve al servidor en `submitScore`; verificamos la
 * firma + caducidad y leemos las soluciones de dentro del propio token.
 *
 * El secreto se deriva de variables de entorno ya disponibles para no obligar
 * al usuario a configurar una nueva clave: priorizamos MINIGAMES_SECRET pero
 * caemos a la SUPABASE_SERVICE_ROLE_KEY (privada, fija por entorno).
 */
function getSecret(): string {
  const explicit = process.env.MINIGAMES_SECRET;
  if (explicit && explicit.length >= 16) return explicit;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (fallback && fallback.length >= 16) return fallback;
  // En desarrollo sin service role, usamos el DATABASE_URL — siempre presente
  // en local. Suficiente para que el HMAC no sea trivialmente forjable.
  const dev = process.env.DATABASE_URL;
  if (dev) return dev;
  throw new Error("No hay secreto disponible para firmar los tokens de minijuegos.");
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

export function signToken<T>(payload: T): string {
  const json = JSON.stringify(payload);
  const body = b64urlEncode(Buffer.from(json, "utf8"));
  const sig = createHmac("sha256", getSecret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function verifyToken<T>(token: string): T | null {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", getSecret()).update(body).digest("hex");
  const aBuf = Buffer.from(sig, "hex");
  const bBuf = Buffer.from(expected, "hex");
  if (aBuf.length !== bBuf.length) return null;
  if (!timingSafeEqual(aBuf, bBuf)) return null;
  try {
    return JSON.parse(b64urlDecode(body).toString("utf8")) as T;
  } catch {
    return null;
  }
}
