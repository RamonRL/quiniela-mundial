"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Transiciones entre pantallas del onboarding.
 *
 * Entrada: cada step monta con fade + lift + blur escalonado por sección
 * (CSS .onb-step en globals). Salida: `useFadeNav()` devuelve un `go(href)`
 * que aplica el fade-out al wrapper, prefetchea el destino y navega cuando
 * la animación termina — el paso de pantalla a pantalla se ve continuo en
 * vez de un corte seco.
 */
const EXIT_MS = 180;

const FadeNavContext = createContext<((href: string) => void) | null>(null);

/** Navegación con fade-out. Fuera del wrapper degrada a un push normal. */
export function useFadeNav(): (href: string) => void {
  const ctx = useContext(FadeNavContext);
  const router = useRouter();
  return ctx ?? ((href: string) => router.push(href));
}

export function StepTransition({
  stepKey,
  children,
}: {
  stepKey: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  // Montó la pantalla nueva (cambió el step): reset del estado de salida
  // para que la entrada se reproduzca completa.
  useEffect(() => {
    setLeaving(false);
  }, [stepKey]);

  const go = useCallback(
    (href: string) => {
      // Prefetch durante el fade-out: cuando la animación acaba, el RSC
      // del paso siguiente ya suele estar en caché y no hay "hueco".
      router.prefetch?.(href);
      setLeaving(true);
      window.setTimeout(() => router.push(href), EXIT_MS);
    },
    [router],
  );

  return (
    <FadeNavContext.Provider value={go}>
      <div
        key={stepKey}
        className={`onb-step${leaving ? " onb-step-leaving" : ""}`}
      >
        {children}
      </div>
    </FadeNavContext.Provider>
  );
}
