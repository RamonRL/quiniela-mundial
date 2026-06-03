"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnnouncementBanner } from "./announcement-banner";

/**
 * Barra de ANUNCIO de la liga activa, montada en el layout `(app)` → visible en
 * TODAS las páginas (dashboard, predicciones, ranking…), no en una tab escondida.
 *
 * Descarte inteligente: se guarda en localStorage el anuncio descartado por
 * liga. Si el owner publica uno NUEVO (texto distinto), reaparece — así un
 * anuncio importante no se pierde por un descarte antiguo.
 */
export function LeagueAnnouncementBar({
  leagueId,
  leagueName,
  message,
}: {
  leagueId: number;
  leagueName: string;
  message: string;
}) {
  const t = useTranslations("announcementBar");
  const storageKey = `qm:ann-dismissed:${leagueId}`;
  // Arranca oculto para evitar flash: decidimos en el efecto, ya con
  // localStorage disponible, si este anuncio concreto fue descartado.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(storageKey) !== message);
    } catch {
      setVisible(true);
    }
  }, [storageKey, message]);

  if (!visible) return null;

  return (
    <AnnouncementBanner
      leagueName={leagueName}
      message={message}
      label={t("label")}
      dismissLabel={t("dismiss")}
      onDismiss={() => {
        try {
          localStorage.setItem(storageKey, message);
        } catch {
          /* storage no disponible: solo ocultamos esta sesión */
        }
        setVisible(false);
      }}
    />
  );
}
