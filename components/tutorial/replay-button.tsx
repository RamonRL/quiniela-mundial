"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { useTutorial } from "./tutorial-provider";

/**
 * Constante compartida con `auto-start.tsx`: cuando el usuario pulsa
 * "Ver tutorial" desde una ruta distinta de /dashboard, dejamos esta
 * flag en sessionStorage y navegamos. Al aterrizar en /dashboard,
 * `TutorialAutoStart` la encuentra, la consume y arranca el tour.
 *
 * sessionStorage (no localStorage) porque el flag debe morir al cerrar
 * la pestaña — no queremos disparar el tour en futuras sesiones.
 */
export const TUTORIAL_REPLAY_KEY = "tutorial:replay";

/**
 * Botón de "Ver tutorial" en /predicciones. Siempre lleva al usuario
 * al dashboard antes de arrancar — los primeros pasos referencian
 * elementos del shell (ProgressHub, league switcher, sidebar nav) que
 * solo viven allí.
 */
export function TutorialReplayButton() {
  const t = useTranslations("tutorial");
  const router = useRouter();
  const pathname = usePathname();
  const { start } = useTutorial();

  const handleClick = () => {
    if (pathname === "/dashboard") {
      // Ya estamos en el dashboard, arrancamos directo.
      start();
      return;
    }
    // En cualquier otra ruta: flag + navegación. El AutoStart de
    // /dashboard se encarga del start tras hidratar.
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(TUTORIAL_REPLAY_KEY, "1");
    }
    router.push("/dashboard");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-foreground)] transition hover:border-[var(--color-arena)]/40 hover:text-[var(--color-arena)]"
    >
      <BookOpen className="size-3.5" />
      {t("replay")}
    </button>
  );
}
