"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import {
  Apple,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  MonitorSmartphone,
  MoreVertical,
  Plus,
  ScanLine,
  Share,
  Smartphone,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const PWA_URL = "https://quinielamundial.es/instalar";

/**
 * Evento del navegador para PWA install. Tipado mínimo porque
 * `lib.dom.d.ts` no lo expone — sigue siendo un draft de WICG.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Platform =
  | "loading"
  | "ios-safari"
  | "ios-chrome"
  | "android"
  | "desktop"
  | "unknown";

const APP_URL = "quinielamundial.es";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return "loading";
  }
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  // iOS browsers que NO permiten "add to home" porque no son Safari.
  // CriOS = Chrome iOS, FxiOS = Firefox iOS, EdgiOS = Edge iOS.
  const isIOSAlt = isIOS && /(crios|fxios|edgios)/.test(ua);
  if (isIOS && !isIOSAlt) return "ios-safari";
  if (isIOSAlt) return "ios-chrome";
  if (isAndroid) return "android";
  if (window.innerWidth >= 768) return "desktop";
  return "unknown";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS pre-PWA exposes navigator.standalone (no en types modernos).
  const navAny = navigator as Navigator & { standalone?: boolean };
  return navAny.standalone === true;
}

export function InstallExperience() {
  const [platform, setPlatform] = useState<Platform>("loading");
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    // Android Chrome: capturamos el evento si llega. Chrome decide
    // cuándo emitirlo (engagement heuristics) — si no llega en X
    // segundos, mostramos instrucciones manuales como fallback.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // appinstalled (estándar) → la instalación terminó.
    const installedHandler = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (platform === "loading") {
    return (
      <div className="mt-12 flex flex-1 items-center justify-center">
        <span className="size-8 animate-spin rounded-full border-2 border-[var(--color-arena)] border-t-transparent" />
      </div>
    );
  }

  if (installed) {
    return <AlreadyInstalled />;
  }

  switch (platform) {
    case "ios-safari":
      return <IOSSafari />;
    case "ios-chrome":
      return <IOSChrome />;
    case "android":
      return (
        <Android
          canPrompt={deferredPrompt != null}
          onInstall={handleInstallClick}
        />
      );
    case "desktop":
      return <Desktop />;
    default:
      return <Unknown />;
  }
}

// ──────────────────────────────────────────────────────────────
// Variantes
// ──────────────────────────────────────────────────────────────

function AlreadyInstalled() {
  const t = useTranslations("install");
  return (
    <div className="mt-10 flex flex-1 flex-col items-center justify-center text-center">
      <span className="grid size-16 place-items-center rounded-full bg-[var(--color-arena)]/15 text-[var(--color-arena)]">
        <Check className="size-8" />
      </span>
      <h1 className="mt-5 font-display text-3xl tracking-tight">{t("aiTitle")}</h1>
      <p className="mt-3 max-w-xs font-editorial text-base italic leading-snug text-[var(--color-muted-foreground)]">
        {t("aiBody")}
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-[var(--color-arena)] px-6 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
      >
        {t("aiCta")} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function Android({
  canPrompt,
  onInstall,
}: {
  canPrompt: boolean;
  onInstall: () => void;
}) {
  const t = useTranslations("install");
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <Header eyebrow={t("andEyebrow")} title={t("andTitle")} body={t("andBody")} />

      {canPrompt ? (
        <button
          type="button"
          onClick={onInstall}
          className="mt-8 inline-flex h-14 w-full items-center justify-center gap-3 rounded-md bg-[var(--color-arena)] font-mono text-sm uppercase tracking-[0.16em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
        >
          <Download className="size-5" />
          {t("andInstall")}
        </button>
      ) : (
        <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
            {t("andManualLabel")}
          </p>
          <ol className="mt-3 space-y-3 font-editorial text-sm leading-snug text-[var(--color-foreground)]">
            <Step n={1}>
              {t.rich("andStep1", {
                icon: () => <MoreVertical className="inline size-4 align-text-bottom" />,
              })}
            </Step>
            <Step n={2}>
              {t.rich("andStep2", { b: (c) => <strong>{c}</strong> })}
            </Step>
            <Step n={3}>{t("andStep3")}</Step>
          </ol>
          <p className="mt-4 font-editorial text-xs italic leading-snug text-[var(--color-muted-foreground)]">
            {t("andManualNote")}
          </p>
        </div>
      )}

      <Footer />
    </div>
  );
}

function IOSSafari() {
  const t = useTranslations("install");
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <Header eyebrow={t("iosEyebrow")} title={t("iosTitle")} body={t("iosBody")} />

      <ol className="mt-8 space-y-4">
        <BigStep
          n={1}
          icon={<Share className="size-5" />}
          title={t("iosS1Title")}
          body={t("iosS1Body")}
          highlight
        />
        <BigStep
          n={2}
          icon={<Plus className="size-5" />}
          title={t("iosS2Title")}
          body={t("iosS2Body")}
        />
        <BigStep
          n={3}
          icon={<Check className="size-5" />}
          title={t("iosS3Title")}
          body={t("iosS3Body")}
        />
      </ol>

      <HomeScreenPreview caption={t("iosHomeCaption")} />

      {/* Pista visual que apunta a la zona donde está el botón
          compartir — el del medio de la barra inferior de Safari. */}
      <div className="mt-10 flex flex-col items-center text-[var(--color-arena)]">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em]">
          {t("iosShareHint")}
        </p>
        <ChevronDown
          className="install-ios-chevron mt-1 size-7"
          style={{ animationDelay: "0s" }}
        />
        <ChevronDown
          className="install-ios-chevron mt-[-14px] size-7 opacity-60"
          style={{ animationDelay: "0.15s" }}
        />
        <ChevronDown
          className="install-ios-chevron mt-[-14px] size-7 opacity-30"
          style={{ animationDelay: "0.3s" }}
        />
      </div>

      <Footer />
    </div>
  );
}

function IOSChrome() {
  const t = useTranslations("install");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PWA_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Algunos navegadores móviles bloquean clipboard sin gesture
      // user — silencioso, el user puede tocar el enlace de abajo.
    }
  };

  return (
    <div className="mt-8 flex flex-1 flex-col">
      <Header eyebrow={t("icEyebrow")} title={t("icTitle")} body={t("icBody")} />

      <div className="mt-8 space-y-4">
        <BigStep
          n={1}
          icon={<Copy className="size-5" />}
          title={t("icS1Title")}
          body={
            <button
              type="button"
              onClick={handleCopy}
              className="mt-1 inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-[0.7rem] text-[var(--color-foreground)] transition hover:border-[var(--color-arena)]/40"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" /> {t("icCopied")}
                </>
              ) : (
                <>
                  <Copy className="size-3.5" /> {APP_URL}/instalar
                </>
              )}
            </button>
          }
          highlight
        />
        <BigStep
          n={2}
          icon={<Apple className="size-5" />}
          title={t("icS2Title")}
          body={t("icS2Body")}
        />
        <BigStep
          n={3}
          icon={<Plus className="size-5" />}
          title={t("icS3Title")}
          body={t("icS3Body")}
        />
      </div>

      <HomeScreenPreview caption={t("icHomeCaption")} />

      <Footer />
    </div>
  );
}

function Desktop() {
  const t = useTranslations("install");
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <Header eyebrow={t("deskEyebrow")} title={t("deskTitle")} body={t("deskBody")} />

      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="relative rounded-xl border-2 border-[var(--color-arena)]/40 bg-white p-3 shadow-[var(--shadow-arena)]">
          <QRCodeSVG
            value={PWA_URL}
            size={200}
            level="M"
            marginSize={0}
            fgColor="#0e1014"
            bgColor="#ffffff"
          />
          <span
            aria-hidden
            className="install-qr-pin absolute -right-2 -top-2 grid size-8 place-items-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
          >
            <ScanLine className="size-4" />
          </span>
        </div>
        <p className="max-w-xs text-center font-editorial text-sm italic leading-snug text-[var(--color-muted-foreground)]">
          {t("deskQrNote")}
        </p>
      </div>

      <div className="mt-10 flex items-center justify-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
        >
          {t("deskContinue")} <ExternalLink className="size-3" />
        </Link>
      </div>

      <Footer />
    </div>
  );
}

function Unknown() {
  const t = useTranslations("install");
  return (
    <div className="mt-10 flex flex-1 flex-col items-center justify-center text-center">
      <span className="grid size-14 place-items-center rounded-full bg-[var(--color-arena)]/15 text-[var(--color-arena)]">
        <MonitorSmartphone className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-2xl tracking-tight">{t("unkTitle")}</h1>
      <p className="mt-3 max-w-xs font-editorial text-base italic leading-snug text-[var(--color-muted-foreground)]">
        {t("unkBody")}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Sub-componentes compartidos
// ──────────────────────────────────────────────────────────────

function Header({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <span className="grid size-14 place-items-center rounded-full bg-[var(--color-arena)]/15 text-[var(--color-arena)]">
        <Smartphone className="size-7" />
      </span>
      <p className="mt-4 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-display text-3xl tracking-tight">{title}</h1>
      <p className="mt-3 max-w-sm font-editorial text-base italic leading-snug text-[var(--color-muted-foreground)]">
        {body}
      </p>
    </div>
  );
}

function BigStep({
  n,
  icon,
  title,
  body,
  highlight,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 rounded-lg border p-3.5 ${
        highlight
          ? "border-[var(--color-arena)]/40 bg-[var(--color-arena)]/5"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <div className="flex flex-col items-center">
        <span className="grid size-9 place-items-center rounded-full bg-[var(--color-arena)] font-mono text-[0.7rem] font-bold text-white">
          {n}
        </span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-[var(--color-foreground)]">
          <span className="text-[var(--color-arena)]">{icon}</span>
          <p className="font-display text-lg leading-tight tracking-tight">{title}</p>
        </div>
        <div className="mt-1 font-editorial text-sm italic leading-snug text-[var(--color-muted-foreground)]">
          {body}
        </div>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-arena)] font-mono text-[0.65rem] font-bold text-white">
        {n}
      </span>
      <span className="flex-1">{children}</span>
    </li>
  );
}

/**
 * Preview de cómo queda el icono en la pantalla de inicio del
 * dispositivo. La captura es de iOS (favicon/app.jpg movida a
 * /public/install-preview-ios.jpg) — el icono y el caption son los
 * mismos en Android (con un fondo distinto), así que reutilizamos.
 */
function HomeScreenPreview({ caption }: { caption: string }) {
  return (
    <div className="mt-8">
      <p className="text-center font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {caption}
      </p>
      <div className="mt-3 flex justify-center">
        {/* Marco que evoca un trocito de wallpaper iOS — gradient
            azulado oscuro con halftone sutil. Encuadra el icono real. */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[#1a2440] via-[#0e1530] to-[#0a0d1c] p-6 shadow-[var(--shadow-elev-2)]">
          <span
            aria-hidden
            className="halftone pointer-events-none absolute inset-0 opacity-[0.06]"
          />
          <Image
            src="/install-preview-ios.jpg"
            alt="Icono de Quiniela Mundial en la pantalla de inicio"
            width={180}
            height={200}
            className="relative h-auto w-[140px] sm:w-[160px]"
            priority={false}
          />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const t = useTranslations("install");
  return (
    <div className="mt-auto pt-10">
      <p className="text-center font-editorial text-xs italic text-[var(--color-muted-foreground)]">
        {t("footer")}
      </p>
    </div>
  );
}
