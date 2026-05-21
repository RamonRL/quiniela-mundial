"use client";

import { useEffect, useState } from "react";
import { Apple, ScanLine, Share, MoreVertical, Plus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type Platform = "android" | "ios";

const PWA_URL = "https://quinielamundial.es";
const MOBILE_QUERY = "(max-width: 768px)";

/**
 * Mini-componente embebido en el step "Llévalo en el bolsillo" del
 * tutorial. Dos modalidades según viewport:
 *
 *  - PC: QR generado al vuelo que apunta a quinielamundial.es. La
 *    persona escanea con la cámara del móvil y aterriza con la web
 *    abierta; allí verá las tabs Android/iOS si vuelve a abrir el
 *    tutorial.
 *  - Móvil: dos tabs (Android / iOS) con los pasos para añadir la
 *    PWA a la pantalla de inicio. Auto-selecciona la del UA.
 *
 * Las tabs describen el flujo "Add to Home Screen" estándar
 * (Chrome/Edge en Android, Safari en iOS) — no usamos
 * `beforeinstallprompt` porque iOS Safari ni la implementa.
 */
export function InstallInstructions() {
  const [platform, setPlatform] = useState<Platform>("android");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else {
      setPlatform("android");
    }
  }, []);

  // En desktop mostramos QR; en móvil, tabs con pasos.
  if (!isMobile) {
    return <DesktopQR />;
  }

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

function DesktopQR() {
  return (
    <div className="mt-3 flex flex-col items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 p-4 sm:p-5">
      {/* Marco arena alrededor del QR para que destaque sobre el card. */}
      <div className="relative rounded-xl border-2 border-[var(--color-arena)]/40 bg-white p-3 shadow-[var(--shadow-arena)]">
        <QRCodeSVG
          value={PWA_URL}
          size={160}
          level="M"
          marginSize={0}
          fgColor="#0e1014"
          bgColor="#ffffff"
        />
        {/* Pin animado en una esquina — guiñito visual que invita a
            escanear. */}
        <span
          aria-hidden
          className="install-qr-pin absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
        >
          <ScanLine className="size-3.5" />
        </span>
      </div>
      <div className="text-center">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
          Escanea con tu móvil
        </p>
        <p className="mt-1.5 font-editorial text-sm italic leading-snug text-[var(--color-muted-foreground)]">
          Abre la cámara y enfoca este código. Cuando aterrices en el móvil,
          te enseñamos a añadirla a la pantalla de inicio en dos toques.
        </p>
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
