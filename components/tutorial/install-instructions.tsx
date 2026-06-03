"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Apple, ScanLine, Share, MoreVertical, Plus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type Platform = "android" | "ios";

// Apunta a la landing /instalar — detecta plataforma del visitante y
// ofrece la mejor experiencia posible: botón nativo de instalación en
// Android Chrome (cuando hay `beforeinstallprompt`), pasos visuales
// dirigidos en iOS Safari, o fallback razonable en iOS Chrome / desktop.
const PWA_URL = "https://quinielamundial.es/instalar";
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
  const t = useTranslations("tutorial");
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
        aria-label={t("installAria")}
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
  const t = useTranslations("tutorial");
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
          {t("scanTitle")}
        </p>
        <p className="mt-1.5 font-editorial text-sm italic leading-snug text-[var(--color-muted-foreground)]">
          {t("scanDesc")}
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

const richTags = {
  code: (chunks: React.ReactNode) => (
    <span className="font-mono text-[0.7rem]">{chunks}</span>
  ),
  b: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
};

function AndroidSteps() {
  const t = useTranslations("tutorial");
  return (
    <ol className="space-y-2 font-editorial text-[0.78rem] leading-snug text-[var(--color-foreground)]">
      <Step n={1}>{t.rich("androidStep1", richTags)}</Step>
      <Step n={2}>
        {t.rich("androidStep2", {
          ...richTags,
          icon: () => <MoreVertical className="inline size-3.5 align-text-bottom" />,
        })}
      </Step>
      <Step n={3}>{t.rich("androidStep3", richTags)}</Step>
      <Step n={4}>{t.rich("androidStep4", richTags)}</Step>
    </ol>
  );
}

function IOSSteps() {
  const t = useTranslations("tutorial");
  return (
    <ol className="space-y-2 font-editorial text-[0.78rem] leading-snug text-[var(--color-foreground)]">
      <Step n={1}>{t.rich("iosStep1", richTags)}</Step>
      <Step n={2}>
        {t.rich("iosStep2", {
          ...richTags,
          icon: () => <Share className="inline size-3.5 align-text-bottom" />,
        })}
      </Step>
      <Step n={3}>
        {t.rich("iosStep3", {
          ...richTags,
          icon: () => <Plus className="inline size-3.5 align-text-bottom" />,
        })}
      </Step>
      <Step n={4}>{t.rich("iosStep4", richTags)}</Step>
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
