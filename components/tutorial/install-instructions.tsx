"use client";

import { useEffect, useState } from "react";
import { Apple, Share, MoreVertical, Plus } from "lucide-react";

type Platform = "android" | "ios";

/**
 * Mini-componente embebido en el step "Llévalo en el bolsillo" del
 * tutorial. Dos tabs con los pasos para instalar la PWA. Detectamos la
 * plataforma del user-agent al montar para preseleccionar la suya y
 * ahorrarle un click — pero ambas son accesibles.
 *
 * Las instrucciones describen el flujo "Add to Home Screen" estándar
 * (Chrome/Edge en Android, Safari en iOS). No requiere ningún hook
 * de la API `beforeinstallprompt` porque la mayoría de iOS Safari ni
 * la implementa.
 */
export function InstallInstructions() {
  const [platform, setPlatform] = useState<Platform>("android");

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else {
      setPlatform("android");
    }
  }, []);

  return (
    <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 p-3">
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Instalación de la app"
        className="grid grid-cols-2 gap-1 rounded-md bg-[var(--color-surface)] p-1"
      >
        <TabButton
          active={platform === "android"}
          onClick={() => setPlatform("android")}
          label="Android"
        />
        <TabButton
          active={platform === "ios"}
          onClick={() => setPlatform("ios")}
          icon={<Apple className="size-3.5" />}
          label="iOS"
        />
      </div>

      {/* Contenido */}
      <div className="mt-3" role="tabpanel">
        {platform === "android" ? <AndroidSteps /> : <IOSSteps />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md font-mono text-[0.65rem] uppercase tracking-[0.18em] transition ${
        active
          ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function AndroidSteps() {
  return (
    <ol className="space-y-2 font-editorial text-[0.78rem] leading-snug text-[var(--color-foreground)]">
      <Step n={1}>
        Abre <span className="font-mono text-[0.7rem]">quinielamundial.es</span>{" "}
        en Chrome.
      </Step>
      <Step n={2}>
        Toca el menú <MoreVertical className="inline size-3.5 align-text-bottom" />{" "}
        arriba a la derecha.
      </Step>
      <Step n={3}>
        Pulsa <strong>&quot;Añadir a pantalla de inicio&quot;</strong> o{" "}
        <strong>&quot;Instalar app&quot;</strong>.
      </Step>
      <Step n={4}>Confirma. Ya tienes el icono en tu pantalla de inicio.</Step>
    </ol>
  );
}

function IOSSteps() {
  return (
    <ol className="space-y-2 font-editorial text-[0.78rem] leading-snug text-[var(--color-foreground)]">
      <Step n={1}>
        Abre <span className="font-mono text-[0.7rem]">quinielamundial.es</span>{" "}
        en <strong>Safari</strong> (no funciona en Chrome iOS).
      </Step>
      <Step n={2}>
        Toca el botón compartir <Share className="inline size-3.5 align-text-bottom" />.
      </Step>
      <Step n={3}>
        Desliza y pulsa{" "}
        <strong>
          &quot;Añadir a pantalla de inicio&quot;{" "}
          <Plus className="inline size-3.5 align-text-bottom" />
        </strong>
        .
      </Step>
      <Step n={4}>Confirma con &quot;Añadir&quot;. Listo.</Step>
    </ol>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--color-arena)] font-mono text-[0.6rem] font-bold text-white">
        {n}
      </span>
      <span className="flex-1">{children}</span>
    </li>
  );
}
