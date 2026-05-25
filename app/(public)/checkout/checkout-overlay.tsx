"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

/**
 * Carga Paddle.js, lo inicializa con el token público y abre el overlay
 * cuando hay una transactionId en la URL. Renderiza tres estados:
 *
 *   - loading: cargando Paddle.js / esperando la inicialización.
 *   - ready: overlay abierto. Mostramos un fallback con un botón para
 *     reabrirlo manualmente si el usuario lo cerró sin pagar.
 *   - error: configuración incompleta (sin token, sin transactionId) o
 *     fallo al cargar el SDK.
 */
export function CheckoutOverlay({
  transactionId,
  token,
  environment,
}: {
  transactionId: string | null;
  token: string | null;
  environment: "sandbox" | "production";
}) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setError(
        "Falta NEXT_PUBLIC_PADDLE_CLIENT_TOKEN. Configúralo en Vercel y vuelve a desplegar.",
      );
      return;
    }
    if (!transactionId) {
      setError(
        "No se recibió la transaction (parámetro _ptxn ausente en la URL). Si llegaste aquí desde /precios pulsa Comprar otra vez.",
      );
      return;
    }
    let cancelled = false;
    initializePaddle({ environment, token })
      .then((instance) => {
        if (cancelled || !instance) return;
        setPaddle(instance);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "No se pudo cargar Paddle.js.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token, transactionId, environment]);

  useEffect(() => {
    if (!paddle || !transactionId || openedRef.current) return;
    openedRef.current = true;
    paddle.Checkout.open({
      transactionId,
      settings: {
        displayMode: "overlay",
        theme: "dark",
        locale: "es",
      },
    });
  }, [paddle, transactionId]);

  function reopen() {
    if (!paddle || !transactionId) return;
    paddle.Checkout.open({
      transactionId,
      settings: { displayMode: "overlay", theme: "dark", locale: "es" },
    });
  }

  if (error) {
    return (
      <section className="space-y-4 rounded-2xl border border-[var(--color-danger)]/40 bg-[color-mix(in_oklch,var(--color-danger)_5%,var(--color-surface))] p-6">
        <p className="inline-flex items-center gap-2 font-display text-lg tracking-tight text-[var(--color-danger)]">
          <ShieldAlert className="size-5" /> Algo salió mal
        </p>
        <p className="font-editorial text-sm italic leading-relaxed">
          {error}
        </p>
        <Link
          href="/precios"
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
        >
          <ArrowLeft className="size-3.5" />
          Volver a planes
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-6">
      {paddle ? (
        <>
          <p className="inline-flex items-center gap-2 font-display text-lg tracking-tight text-[var(--color-arena)]">
            <ShieldCheck className="size-5" /> Pago seguro en marcha
          </p>
          <p className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
            La ventana de pago se ha abierto sobre esta página. Si la
            cerraste sin querer, pulsa el botón para reabrirla.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reopen}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-arena)] bg-[var(--color-arena)] px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
            >
              Volver a abrir la ventana
              <ArrowRight className="size-3.5" />
            </button>
            <Link
              href="/precios"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] transition hover:border-[var(--color-arena)]/40"
            >
              <ArrowLeft className="size-3.5" />
              Cancelar
            </Link>
          </div>
        </>
      ) : (
        <p className="inline-flex items-center gap-2 font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          <Loader2 className="size-4 animate-spin" />
          Cargando ventana de pago…
        </p>
      )}
    </section>
  );
}
