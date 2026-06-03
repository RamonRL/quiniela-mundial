"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in browser console so it's diagnosable beyond Vercel.
    // eslint-disable-next-line no-console
    console.error("App route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-5 text-center">
      <span className="grid size-14 place-items-center rounded-full border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,transparent)] text-[var(--color-arena)]">
        <AlertTriangle className="size-6" />
      </span>
      <div className="space-y-2">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          Algo se rompió
        </p>
        <h1 className="font-display text-3xl tracking-tight">No hemos podido cargar esta página</h1>
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          Es un error temporal. Reintenta o vuelve al inicio. Si vuelve a pasar, avisa al admin con el código de abajo.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset} variant="default">
          <RefreshCw className="size-3.5" />
          Reintentar
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Ir al inicio</Link>
        </Button>
      </div>
      {error.digest ? (
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          digest · {error.digest}
        </p>
      ) : null}
    </div>
  );
}
