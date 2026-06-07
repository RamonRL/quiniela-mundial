"use client";

import { createContext, useContext, type ReactNode } from "react";
import { SPAIN_TZ } from "@/lib/timezone";

/**
 * Expone la TZ efectiva (resuelta en el server) a los client components
 * que pintan horas (chat, formularios de predicción, tours). Evita ir
 * pasándola por props por todo el árbol.
 */
const TimeZoneContext = createContext<string>(SPAIN_TZ);

export function TimeZoneProvider({
  tz,
  children,
}: {
  tz: string;
  children: ReactNode;
}) {
  return <TimeZoneContext.Provider value={tz}>{children}</TimeZoneContext.Provider>;
}

/** TZ efectiva del usuario (client). Pásala como `{ timeZone }` a formatDateTime. */
export function useTimeZone(): string {
  return useContext(TimeZoneContext);
}
