import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string | null | undefined, fallback = "·") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || fallback;
}

export function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

export function formatPoints(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value} pt${Math.abs(value) === 1 ? "" : "s"}`;
}

const SPAIN_TZ = "Europe/Madrid";

// Defaults intentionally omit seconds — partidos y deadlines se hablan en
// minutos, no en segundos. Pasar options explícitas las pisa.
const DEFAULT_DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const DEFAULT_TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

const DEFAULT_LOCALE = "es-ES";

/**
 * Opciones de Intl + dos campos con manejo especial:
 *   - `timeZone`: si es undefined NO debe sobreescribir el default
 *     (dejaría a toLocaleString cayendo al TZ del runtime — UTC en Vercel
 *     —, descuadrando los partidos). Lo extraemos y aplicamos fallback a
 *     España.
 *   - `locale`: BCP-47 para los NOMBRES (día de la semana, mes). Por
 *     defecto es-ES; pásalo (en-GB/fr-FR/pt-PT) para que "Thursday",
 *     "jeudi"… salgan en el idioma del usuario. Mapea el locale de
 *     next-intl con `intlLocale()` de `@/lib/timezone`.
 */
type FormatOptions = Intl.DateTimeFormatOptions & { locale?: string };

function resolveTz(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  const { timeZone, ...rest } = options;
  return { timeZone: timeZone ?? SPAIN_TZ, ...rest };
}

export function formatDateTime(
  value: Date | string | number,
  options: FormatOptions = {},
) {
  const date = value instanceof Date ? value : new Date(value);
  const { locale, ...intl } = options;
  const { timeZone, ...rest } = resolveTz(intl);
  return date.toLocaleString(locale ?? DEFAULT_LOCALE, {
    timeZone,
    ...DEFAULT_DATETIME_OPTS,
    ...rest,
  });
}

export function formatDate(
  value: Date | string | number,
  options: FormatOptions = {},
) {
  const date = value instanceof Date ? value : new Date(value);
  const { locale, ...intl } = options;
  return date.toLocaleDateString(locale ?? DEFAULT_LOCALE, resolveTz(intl));
}

export function formatTime(
  value: Date | string | number,
  options: FormatOptions = {},
) {
  const date = value instanceof Date ? value : new Date(value);
  const { locale, ...intl } = options;
  const { timeZone, ...rest } = resolveTz(intl);
  return date.toLocaleTimeString(locale ?? DEFAULT_LOCALE, {
    timeZone,
    ...DEFAULT_TIME_OPTS,
    ...rest,
  });
}

/**
 * "hace 2 min", "hace 3 h", "hace 4 d" en español. Para timestamps recientes
 * usados en feeds de actividad / dashboards donde la hora exacta importa
 * menos que la cercanía. Si el delta supera ~7 días, cae a fecha corta.
 */
export function formatRelative(value: Date | string | number, now: Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const deltaSec = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  if (deltaSec < 45) return "ahora";
  const deltaMin = Math.round(deltaSec / 60);
  if (deltaMin < 60) return `hace ${deltaMin} min`;
  const deltaH = Math.round(deltaMin / 60);
  if (deltaH < 24) return `hace ${deltaH} h`;
  const deltaD = Math.round(deltaH / 24);
  if (deltaD < 7) return `hace ${deltaD} d`;
  return formatDate(date, { day: "2-digit", month: "short" });
}
