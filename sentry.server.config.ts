// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { notifyServerError } from "@/lib/telegram/events";

Sentry.init({
  dsn: "https://46531a4b2aae006ef47e6f90c4b7a088@o4511371770658816.ingest.de.sentry.io/4511371853299792",

  // 10% de trazas en server: suficiente para detectar problemas con un
  // grupo de amigos y mucho más barato (sobre todo en pico, donde 100%
  // añadía latencia HTTP por request).
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Ruido conocido del framework — NO son 500 reales para usuarios:
  // "controller[kState].transformAlgorithm is not a function" lo lanza
  // el streaming RSC de Next/undici cuando el cliente aborta la conexión
  // a mitad de respuesta (p. ej. el uptime monitor, que corta tras los
  // headers — por eso llega siempre con la URL interna /?nxtP_locale=…).
  // La página se sirve bien; descartamos el evento entero, lo que también
  // corta el espejo a Telegram (beforeSend no llega a ejecutarse).
  ignoreErrors: [/transformAlgorithm is not a function/],

  // Espejo a Telegram solo en producción y solo para errores reales —
  // Sentry aplica su propio sampling antes, así que esto sigue su
  // fingerprinting (no spam de la misma excepción). El `beforeSend`
  // se ejecuta justo antes del envío al ingest de Sentry; usamos
  // `void` para no bloquear y devolvemos el event tal cual.
  beforeSend(event, hint) {
    if (process.env.NODE_ENV === "production" && event.level !== "warning" && event.level !== "info") {
      const err = hint?.originalException as Error | undefined;
      const message =
        err?.message ??
        event.exception?.values?.[0]?.value ??
        event.message ??
        "Unknown server error";
      void notifyServerError({
        message,
        route: event.request?.url ?? null,
        userId: event.user?.id ? String(event.user.id) : null,
      });
    }
    return event;
  },
});
