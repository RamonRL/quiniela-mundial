import * as Sentry from "@sentry/nextjs";

/**
 * Mensaje genérico para fallos inesperados de BD (timeout, pool agotado,
 * violación de constraint, caída transitoria de Supabase). Lo suficientemente
 * tranquilizador para que el usuario reintente sin pensar que perdió nada.
 */
export const ACTION_DB_ERROR = "No pudimos guardar. Reinténtalo en unos segundos.";

type ActionContext = {
  /** Nombre del action, para etiquetar el evento en Sentry. */
  action: string;
  userId?: string;
  leagueId?: number | null;
};

/**
 * Envuelve el bloque de BD de un Server Action que muta datos.
 *
 * Si el callback lanza (error inesperado de BD, no de validación), lo reporta
 * a Sentry con contexto de usuario/liga y devuelve un resultado de error
 * TIPADO en vez de dejar que la excepción burbujee hasta el error boundary y
 * le pinte al usuario una pantalla de error. El usuario ve un toast "reinténtalo"
 * y conserva todo lo que llevaba en pantalla.
 *
 * Importante: llama a esto SOLO alrededor del trabajo de BD, después de haber
 * validado la entrada — los errores de validación deben devolver su mensaje
 * específico, no el genérico.
 *
 * `onError` construye el shape de error concreto de cada action
 * (`FormState`, `SaveResult`, …) a partir del mensaje genérico. Se tipa como
 * `E` aparte de `T` (el valor de éxito) para que devolver `{ ok: false, … }`
 * no choque con un tipo de éxito `{ ok: true }`; el retorno es la unión `T | E`,
 * compatible con los tipos `FormState`/`SaveResult` de los actions.
 */
export async function runAction<T, E = T>(
  context: ActionContext,
  fn: () => Promise<T>,
  onError: (message: string) => E,
): Promise<T | E> {
  try {
    return await fn();
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("action", context.action);
      if (context.userId) scope.setUser({ id: context.userId });
      if (context.leagueId != null) scope.setTag("leagueId", String(context.leagueId));
      Sentry.captureException(err);
    });
    console.error(`[action:${context.action}] failed`, err);
    return onError(ACTION_DB_ERROR);
  }
}
