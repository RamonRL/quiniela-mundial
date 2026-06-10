// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://46531a4b2aae006ef47e6f90c4b7a088@o4511371770658816.ingest.de.sentry.io/4511371853299792",

  // Ruido de extensiones del navegador (no es código nuestro): MetaMask y
  // otras carteras inyectan `inpage.js` en cada página y lanzan errores al
  // intentar conectar con su extensión. Sentry los captura porque corren en
  // el contexto de la página, pero no son bugs de la app.
  ignoreErrors: [
    /MetaMask/i,
    /ethereum/i,
    "Failed to connect to MetaMask",
    // Ruido genérico de navegador, inofensivo.
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Modo lector de Firefox/Brave en iOS: inyecta `window.__firefox__` en la
    // página y peta solo. No es código nuestro. Cubre tanto
    // "evaluating 'window.__firefox__.reader'" como "Can't find variable: __firefox__".
    /__firefox__/,
    // Navegador in-app de Instagram (su instrumentación interna).
    "Java object is gone",
    // Ruido conocido de extensiones (puente tipo COM en la página).
    /Object Not Found Matching Id/i,
    // Rechazo de promesa vacío e inaccionable (sin stack ni datos), casi
    // siempre de una extensión.
    /promise rejection with keys: \[object has no keys\]/i,
  ],
  // Descarta cualquier evento cuyo stack venga de un script inyectado por
  // una extensión (inpage.js, chrome-extension://, moz-extension://, …) o por
  // la instrumentación del navegador in-app de Instagram.
  denyUrls: [
    /inpage\.js/i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-(web-)?extension:\/\//i,
    /navigation_performance_logger_android/i,
  ],

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // 10% de trazas en cliente — alineado con server/edge.
  tracesSampleRate: 0.1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
