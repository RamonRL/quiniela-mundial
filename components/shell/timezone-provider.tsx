"use client";

import { createContext, useContext, type ReactNode } from "react";
import { SPAIN_TZ } from "@/lib/timezone";

/**
 * Expone el contexto de formato de fechas (TZ efectiva + locale BCP-47,
 * resueltos en el server) a los client components que pintan horas (chat,
 * formularios y tours de predicción). Evita ir pasándolo por props por todo
 * el árbol.
 */
type DateContext = { timeZone: string; locale: string };

const Ctx = createContext<DateContext>({ timeZone: SPAIN_TZ, locale: "es-ES" });

export function TimeZoneProvider({
  tz,
  locale,
  children,
}: {
  tz: string;
  locale: string;
  children: ReactNode;
}) {
  return <Ctx.Provider value={{ timeZone: tz, locale }}>{children}</Ctx.Provider>;
}

/** TZ efectiva del usuario (client). Pásala como `{ timeZone }` a formatDateTime. */
export function useTimeZone(): string {
  return useContext(Ctx).timeZone;
}

/**
 * Contexto completo de fecha (client): `{ timeZone, locale }`. Pásalo tal
 * cual a formatDateTime para zona + idioma correctos:
 * `formatDateTime(x, { ...useDateFormat(), hour: "2-digit" })`.
 */
export function useDateFormat(): DateContext {
  return useContext(Ctx);
}
