"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getTutorialSteps,
  type TutorialMode,
  type TutorialStep,
} from "@/lib/tutorial/steps";
import { markTutorialCompleted } from "@/lib/tutorial/actions";
import { TutorialOverlay } from "./tutorial-overlay";
import { TutorialCard } from "./tutorial-card";

type TutorialContextValue = {
  isOpen: boolean;
  stepIndex: number;
  step: TutorialStep | null;
  totalSteps: number;
  targetRect: DOMRect | null;
  isMobile: boolean;
  start: () => void;
  next: () => void;
  back: () => void;
  skip: () => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error("useTutorial debe usarse dentro de <TutorialProvider>");
  }
  return ctx;
}

const MOBILE_QUERY = "(max-width: 768px)";
const FIND_TIMEOUT_MS = 3000;
const FIND_INTERVAL_MS = 100;
const SCROLL_SETTLE_MS = 380;
/**
 * Offsets seguros para barras fijas:
 *  - Header sticky (móvil): `h-16` → 64 px. Sumamos 16 px de respiración.
 *  - Mobile-nav inferior: ~64 px + safe-area-inset-bottom. Sumamos margen.
 * `scrollIntoView` no conoce estas barras y sitúa el target tras ellas,
 * por eso calculamos el delta a aplicar con `window.scrollBy` directamente.
 */
const SAFE_TOP_OFFSET = 80;
const SAFE_BOTTOM_OFFSET = 96;

/**
 * Provider que coordina el tour: estado, resolución de anchors,
 * navegación cross-page, listeners de resize/scroll y montaje del
 * overlay + card. Vive en `(app)/layout.tsx` envolviendo todo el shell
 * autenticado para que sobreviva al `router.push` entre pasos.
 *
 * El provider acepta children y renderiza la UI del tutorial encima
 * (portal-less — confiamos en z-[120] para quedar por encima del shell).
 */
export function TutorialProvider({
  children,
  mode,
}: {
  children: React.ReactNode;
  /** Modo de la liga activa — decide qué variante del tutorial se muestra. */
  mode?: TutorialMode | string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const completedRef = useRef(false);

  // Pasos según el modo de la liga activa (Completo / Marcador / Solo Ganador).
  const steps = useMemo(() => getTutorialSteps(mode), [mode]);

  const step: TutorialStep | null = isOpen ? steps[stepIndex] ?? null : null;
  const totalSteps = steps.length;

  // Detección de móvil + reactividad ante cambio de viewport.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Resolución del target del paso actual. Espera a que aparezca en el
  // DOM (caso típico: el paso requiere navegar antes). Si no aparece en
  // 3 s, cae a modo centrado.
  useEffect(() => {
    if (!isOpen || !step || !step.anchor) {
      setTarget(null);
      setTargetRect(null);
      return;
    }
    const selector =
      isMobile && step.anchor.mobile ? step.anchor.mobile : step.anchor.desktop;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = Math.ceil(FIND_TIMEOUT_MS / FIND_INTERVAL_MS);

    const tryFind = () => {
      if (cancelled) return;
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>(selector),
      );
      // Elegimos el primero visible — patrón típico cuando el mismo id
      // existe en sidebar (desktop) y mobile-nav (móvil) y solo uno
      // tiene tamaño real en el viewport.
      const visible = elements.find((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (visible) {
        // Aseguramos que esté en pantalla antes de medir.
        //
        // Desktop: `scrollIntoView({block:"center"})` ya funciona bien
        // porque el shell no tiene barras superpuestas.
        //
        // Móvil: `scrollIntoView` ignora el header sticky y la
        // mobile-nav fija, dejando el target tapado. Calculamos el
        // delta manualmente con offsets de zona segura:
        //   - card abajo (default) → queremos target.top en
        //     `SAFE_TOP_OFFSET` (justo bajo el header).
        //   - card arriba (mobileCardPosition: "top") → queremos
        //     target.bottom en `vh - SAFE_BOTTOM_OFFSET` (justo encima
        //     de la mobile-nav).
        if (isMobile) {
          const rect = visible.getBoundingClientRect();
          const vh = window.innerHeight;
          let delta: number;
          if (step?.mobileCardPosition === "top") {
            // Alinear target.bottom justo encima de la barra inferior.
            const desiredBottom = vh - SAFE_BOTTOM_OFFSET;
            delta = rect.bottom - desiredBottom;
          } else {
            // Alinear target.top justo bajo el header sticky.
            delta = rect.top - SAFE_TOP_OFFSET;
          }
          if (Math.abs(delta) > 1) {
            window.scrollBy({ top: delta, behavior: "smooth" });
          }
        } else {
          visible.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        setTimeout(() => {
          if (cancelled) return;
          setTarget(visible);
        }, SCROLL_SETTLE_MS);
        return;
      }
      if (attempts++ < maxAttempts) {
        setTimeout(tryFind, FIND_INTERVAL_MS);
      } else {
        // Timeout — fallback a modo centrado para este paso (no rompe
        // la experiencia, simplemente se pierde el spotlight).
        setTarget(null);
        setTargetRect(null);
      }
    };
    tryFind();
    return () => {
      cancelled = true;
    };
  }, [isOpen, step, isMobile, pathname]);

  // Actualizamos el rect cada vez que el target cambia o el viewport se
  // mueve (scroll/resize/orientación). Mantiene el spotlight pegado al
  // elemento aunque el usuario rote el dispositivo o haga scroll.
  useEffect(() => {
    if (!target) {
      setTargetRect(null);
      return;
    }
    const update = () => setTargetRect(target.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("scroll", update);
    };
  }, [target]);

  // Esc para saltar el tutorial — atajo accesibilidad estándar.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Lock body scroll mientras el tour está activo — evita que el
  // contenido se mueva si el usuario hace gesture vertical accidental.
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  const start = useCallback(() => {
    completedRef.current = false;
    setStepIndex(0);
    setIsOpen(true);
  }, []);

  const next = useCallback(() => {
    setStepIndex((current) => {
      const cur = steps[current];
      if (cur?.navigateTo) {
        router.push(cur.navigateTo);
      }
      const nextIdx = current + 1;
      if (nextIdx >= steps.length) {
        // El último paso usa CTA, no llamamos a next desde ahí — pero
        // por seguridad cerramos.
        return current;
      }
      return nextIdx;
    });
  }, [router, steps]);

  const back = useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1));
  }, []);

  const skip = useCallback(() => {
    setIsOpen(false);
    if (!completedRef.current) {
      completedRef.current = true;
      // No bloqueamos el cierre por la respuesta del server action.
      void markTutorialCompleted();
    }
  }, []);

  const value = useMemo<TutorialContextValue>(
    () => ({
      isOpen,
      stepIndex,
      step,
      totalSteps,
      targetRect,
      isMobile,
      start,
      next,
      back,
      skip,
    }),
    [
      isOpen,
      stepIndex,
      step,
      totalSteps,
      targetRect,
      isMobile,
      start,
      next,
      back,
      skip,
    ],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {isOpen && step ? (
        <>
          <TutorialOverlay targetRect={targetRect} step={step} />
          <TutorialCard />
        </>
      ) : null}
    </TutorialContext.Provider>
  );
}
