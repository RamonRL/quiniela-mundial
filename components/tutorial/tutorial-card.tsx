"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useTutorial } from "./tutorial-provider";
import { markTutorialCompleted } from "@/lib/tutorial/actions";
import { TutorialMascot } from "./mascot";
import { TutorialConfetti } from "./confetti";
import { InstallInstructions } from "./install-instructions";

const CARD_MARGIN = 16; // separación entre cutout y card
const CARD_WIDTH_DESKTOP = 360;
const MOBILE_NEAR_LATERAL = 12; // padding lateral cuando la card flota junto al target

/**
 * Modos del card en móvil:
 *  - `bottom`        → sheet anclado al borde inferior (target en mitad superior pero
 *                       con suficiente distancia).
 *  - `bottom-near`   → card flotante anclada justo bajo el target (target muy
 *                       arriba, p.ej. el header / league switcher). Evita el hueco
 *                       grande entre target y card.
 *  - `top`           → sheet anclado al borde superior (target en mitad inferior,
 *                       p.ej. el mobile-nav o la sección eliminatoria). Evita que
 *                       la card tape lo que el spotlight quiere enseñar.
 */
type SheetMode = "bottom" | "bottom-near" | "top";

/**
 * Card flotante (desktop) o bottom-sheet (móvil) con el contenido del
 * paso actual. Se monta solo cuando el tutorial está abierto. El
 * positioning en desktop usa auto-flip simple basado en el espacio
 * disponible alrededor del target.
 *
 * Trap de focus: tras montar, mueve el foco al primer botón
 * interactivo para que el usuario pueda usar Tab/Enter sin click.
 */
export function TutorialCard() {
  const router = useRouter();
  const { step, stepIndex, totalSteps, targetRect, isMobile, next, back, skip } =
    useTutorial();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>("bottom");
  const [showConfetti, setShowConfetti] = useState(false);

  // Lanza confeti cuando el paso tiene fanfare=true (último paso).
  useEffect(() => {
    if (step?.fanfare) {
      setShowConfetti(true);
    } else {
      setShowConfetti(false);
    }
  }, [step]);

  // Decide en móvil dónde montar el sheet según la posición del target.
  // Regla:
  //   - target en mitad INFERIOR del viewport → top sheet (no taparlo)
  //   - target MUY ARRIBA (header) → card flotante pegada bajo el target
  //   - resto → bottom sheet clásico
  // Recalculamos en cada cambio de viewport para que rote bien al cambiar
  // de orientación.
  useEffect(() => {
    if (!isMobile || !step || step.kind === "centered" || !targetRect) {
      setSheetMode("bottom");
      return;
    }
    // Override explícito por step gana sobre la heurística.
    if (step.mobileCardPosition === "top") {
      setSheetMode("top");
      return;
    }
    if (step.mobileCardPosition === "bottom") {
      setSheetMode("bottom");
      return;
    }
    const update = () => {
      const vh = window.innerHeight;
      const center = targetRect.y + targetRect.height / 2;
      if (center > vh / 2) {
        setSheetMode("top");
      } else if (targetRect.bottom < vh * 0.32) {
        setSheetMode("bottom-near");
      } else {
        setSheetMode("bottom");
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [isMobile, step, targetRect]);

  // Posicionamiento desktop. En móvil la card es bottom-sheet fijo y no
  // necesita cálculo.
  useLayoutEffect(() => {
    if (isMobile || !cardRef.current) {
      setPos(null);
      return;
    }
    if (!step || step.kind === "centered" || !targetRect) {
      // Centrado en pantalla.
      setPos(null);
      return;
    }
    const card = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Probamos las 4 posiciones en orden y nos quedamos con la primera
    // que cabe.
    const candidates = [
      {
        // Debajo del target
        top: targetRect.bottom + CARD_MARGIN,
        left: targetRect.left + targetRect.width / 2 - card.width / 2,
      },
      {
        // Encima del target
        top: targetRect.top - CARD_MARGIN - card.height,
        left: targetRect.left + targetRect.width / 2 - card.width / 2,
      },
      {
        // A la derecha
        top: targetRect.top + targetRect.height / 2 - card.height / 2,
        left: targetRect.right + CARD_MARGIN,
      },
      {
        // A la izquierda
        top: targetRect.top + targetRect.height / 2 - card.height / 2,
        left: targetRect.left - CARD_MARGIN - card.width,
      },
    ];

    const fits = (c: { top: number; left: number }) =>
      c.top >= 8 &&
      c.top + card.height <= vh - 8 &&
      c.left >= 8 &&
      c.left + card.width <= vw - 8;

    const chosen = candidates.find(fits) ?? candidates[0];
    // Clamp dentro de viewport por si ninguno encajaba perfecto.
    const top = Math.max(8, Math.min(chosen.top, vh - card.height - 8));
    const left = Math.max(8, Math.min(chosen.left, vw - card.width - 8));
    setPos({ top, left });
  }, [isMobile, step, targetRect, stepIndex]);

  // Focus al botón primario en cada paso para navegación con teclado.
  useEffect(() => {
    primaryBtnRef.current?.focus();
  }, [stepIndex]);

  if (!step) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  // Los pasos centered (bienvenida y cierre) van SIEMPRE como modal
  // centrado, incluso en móvil — el patrón de bottom sheet ahí no aporta
  // y rompe la simetría visual del "estás llegando" / "ya está".
  const isCenteredStep = step.kind === "centered";
  const useBottomSheet = !isCenteredStep && isMobile;

  const handleCta = () => {
    if (!step.cta) return;
    void markTutorialCompleted();
    skip();
    // Pequeño delay para dejar que el confeti respire antes de navegar.
    setTimeout(() => router.push(step.cta!.href), step.fanfare ? 900 : 0);
  };

  // Estilos del contenedor según breakpoint, tipo de paso y posición.
  // Para los pasos centered usamos 50/50 puro del viewport — es lo que
  // significa "centro exacto del navegador", independientemente de
  // sidebar/header/contenido.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const nearTop =
    targetRect != null
      ? Math.min(targetRect.bottom + 16, vh - 200)
      : 0;
  let containerStyle: React.CSSProperties;
  if (useBottomSheet) {
    if (sheetMode === "top") {
      containerStyle = {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        maxHeight: "42vh",
      };
    } else if (sheetMode === "bottom-near" && targetRect) {
      containerStyle = {
        position: "fixed",
        top: nearTop,
        left: MOBILE_NEAR_LATERAL,
        right: MOBILE_NEAR_LATERAL,
        maxHeight: `calc(100vh - ${nearTop + 16}px)`,
      };
    } else {
      containerStyle = {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: "42vh",
      };
    }
  } else if (!isCenteredStep && pos) {
    containerStyle = {
      position: "fixed",
      top: pos.top,
      left: pos.left,
      width: CARD_WIDTH_DESKTOP,
    };
  } else {
    containerStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: CARD_WIDTH_DESKTOP,
      maxWidth: "calc(100vw - 2rem)",
      // En pantallas pequeñas el contenido del step "install" puede
      // crecer (tabs + 4 pasos). Damos scroll interno para que nunca
      // se desborde del viewport.
      maxHeight: "calc(100vh - 2rem)",
      overflowY: "auto",
    };
  }

  const sheetClass = useBottomSheet
    ? sheetMode === "top"
      ? "tutorial-sheet-top-in rounded-b-3xl border-b border-[var(--color-arena)]/30 bg-[var(--color-surface)] px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-4 shadow-[var(--shadow-elev-2)]"
      : sheetMode === "bottom-near"
        ? "tutorial-fade-in overflow-y-auto rounded-2xl border border-[var(--color-arena)]/30 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-elev-2)]"
        : "tutorial-sheet-in rounded-t-3xl border-t border-[var(--color-arena)]/30 bg-[var(--color-surface)] px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 shadow-[var(--shadow-elev-2)]"
    : isCenteredStep
      ? "tutorial-fade-in rounded-2xl border border-[var(--color-arena)]/30 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-elev-2)] sm:p-6"
      : "rise-in rounded-2xl border border-[var(--color-arena)]/30 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-elev-2)] sm:p-6";

  return (
    <>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-card-title"
        aria-describedby="tutorial-card-body"
        style={containerStyle}
        className={`z-[121] ${sheetClass}`}
      >
        {/* Drag-handle visual solo en bottom sheet clásico — en top sheet
            (esquinas redondeadas abajo) y en card flotante no aporta. */}
        {useBottomSheet && sheetMode === "bottom" ? (
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border-strong)]" />
        ) : null}

        {/* Header: mascota HÉROE arriba al centro, indicador de paso
            debajo, botón cerrar en esquina superior derecha. */}
        <div className="relative mb-2">
          <div className="flex justify-center">
            <TutorialMascot tone={step.fanfare ? "wiggle" : "idle"} />
          </div>
          <p className="mt-2 text-center font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
            Paso {stepIndex + 1} de {totalSteps}
          </p>
          <button
            type="button"
            onClick={skip}
            aria-label="Saltar tutorial"
            className="absolute right-0 top-0 grid size-9 place-items-center rounded-md text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Title + body — en bottom sheet móvil hay menos altura, así que
            apretamos tamaños un poco. */}
        <h2
          id="tutorial-card-title"
          className={
            useBottomSheet
              ? "font-display text-xl leading-tight tracking-tight"
              : "font-display text-2xl leading-tight tracking-tight sm:text-3xl"
          }
        >
          {step.title}
        </h2>
        <p
          id="tutorial-card-body"
          className={
            useBottomSheet
              ? "mt-1.5 font-editorial text-[0.85rem] italic leading-snug text-[var(--color-muted-foreground)]"
              : "mt-2 font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-base"
          }
        >
          {step.body}
        </p>

        {/* Slot opcional — actualmente solo "install" (tabs Android/iOS
            con pasos para añadir la PWA a la pantalla de inicio). */}
        {step.slot === "install" ? <InstallInstructions /> : null}

        {/* Indicador de progreso (puntos). */}
        <div className="mt-4 flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex
                  ? "w-6 bg-[var(--color-arena)]"
                  : i < stepIndex
                    ? "w-1.5 bg-[var(--color-arena)]/60"
                    : "w-1.5 bg-[var(--color-border-strong)]"
              }`}
            />
          ))}
        </div>

        {/* Acciones. */}
        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={back}
            disabled={isFirst}
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-foreground)] transition hover:border-[var(--color-arena)]/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="size-3.5" /> Atrás
          </button>
          {isLast && step.cta ? (
            <button
              ref={primaryBtnRef}
              type="button"
              onClick={handleCta}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
            >
              {step.cta.label} <ArrowRight className="size-3.5" />
            </button>
          ) : (
            <button
              ref={primaryBtnRef}
              type="button"
              onClick={next}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
            >
              {step.nextLabel ?? "Siguiente"} <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {showConfetti ? <TutorialConfetti onDone={() => setShowConfetti(false)} /> : null}
    </>
  );
}
