"use client";

import { useEffect, useState } from "react";
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
  return (
    <div className="mt-10 flex flex-1 flex-col items-center justify-center text-center">
      <span className="grid size-16 place-items-center rounded-full bg-[var(--color-arena)]/15 text-[var(--color-arena)]">
        <Check className="size-8" />
      </span>
      <h1 className="mt-5 font-display text-3xl tracking-tight">
        Ya la tienes instalada
      </h1>
      <p className="mt-3 max-w-xs font-editorial text-base italic leading-snug text-[var(--color-muted-foreground)]">
        Búscala como{" "}
        <span className="font-mono not-italic">Quiniela Mundial</span> en tu
        pantalla de inicio y ábrela desde ahí.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-[var(--color-arena)] px-6 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
      >
        Ir al dashboard <ArrowRight className="size-4" />
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
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <Header
        eyebrow="Android · Chrome"
        title="Instala la app"
        body="Sin AppStore ni Google Play. Se queda en tu pantalla de inicio igual que cualquier otra."
      />

      {canPrompt ? (
        <button
          type="button"
          onClick={onInstall}
          className="mt-8 inline-flex h-14 w-full items-center justify-center gap-3 rounded-md bg-[var(--color-arena)] font-mono text-sm uppercase tracking-[0.16em] text-white shadow-[var(--shadow-arena)] transition hover:opacity-90"
        >
          <Download className="size-5" />
          Instalar app
        </button>
      ) : (
        <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
            Pasos manuales
          </p>
          <ol className="mt-3 space-y-3 font-editorial text-sm leading-snug text-[var(--color-foreground)]">
            <Step n={1}>
              Toca el menú{" "}
              <MoreVertical className="inline size-4 align-text-bottom" /> arriba
              a la derecha en Chrome.
            </Step>
            <Step n={2}>
              Pulsa <strong>&quot;Instalar app&quot;</strong> o{" "}
              <strong>&quot;Añadir a pantalla de inicio&quot;</strong>.
            </Step>
            <Step n={3}>Confirma. Listo.</Step>
          </ol>
          <p className="mt-4 font-editorial text-xs italic leading-snug text-[var(--color-muted-foreground)]">
            Si no ves la opción, sigue navegando un minuto y vuelve a este menú —
            Chrome a veces espera a ver que la usas antes de ofrecerla.
          </p>
        </div>
      )}

      <Footer />
    </div>
  );
}

function IOSSafari() {
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <Header
        eyebrow="iPhone · Safari"
        title="Llévatela al Home"
        body="Apple no deja instalarla con un toque, pero en tres pasos la tienes."
      />

      <ol className="mt-8 space-y-4">
        <BigStep
          n={1}
          icon={<Share className="size-5" />}
          title="Toca el botón compartir"
          body="Está en la barra inferior de Safari — el cuadrado con la flecha hacia arriba."
          highlight
        />
        <BigStep
          n={2}
          icon={<Plus className="size-5" />}
          title="Pulsa “Añadir a pantalla de inicio”"
          body="Desliza el menú hacia abajo si no lo ves de entrada."
        />
        <BigStep
          n={3}
          icon={<Check className="size-5" />}
          title="Confirma con “Añadir”"
          body="Arriba a la derecha. Aparece como app en tu Home."
        />
      </ol>

      {/* Pista visual que apunta a la zona donde está el botón
          compartir — el del medio de la barra inferior de Safari. */}
      <div className="mt-10 flex flex-col items-center text-[var(--color-arena)]">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em]">
          Botón compartir abajo
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
      <Header
        eyebrow="iPhone · Chrome / Edge / Firefox"
        title="Tienes que abrirlo en Safari"
        body="Apple solo deja añadir apps a la pantalla de inicio desde Safari. Una pena, pero es lo que hay."
      />

      <div className="mt-8 space-y-4">
        <BigStep
          n={1}
          icon={<Copy className="size-5" />}
          title="Copia el enlace"
          body={
            <button
              type="button"
              onClick={handleCopy}
              className="mt-1 inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-[0.7rem] text-[var(--color-foreground)] transition hover:border-[var(--color-arena)]/40"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" /> Copiado
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
          title="Abre Safari y pega"
          body="Pestaña nueva → pega la URL → enter."
        />
        <BigStep
          n={3}
          icon={<Plus className="size-5" />}
          title="Vuelve aquí en Safari"
          body="Te enseñamos los 3 toques para añadirla."
        />
      </div>

      <Footer />
    </div>
  );
}

function Desktop() {
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <Header
        eyebrow="Estás en PC"
        title="Escanéalo con tu móvil"
        body="La app vive en el bolsillo. Apunta la cámara del móvil al código y aterrizarás aquí mismo en tu teléfono."
      />

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
          Cuando aterrices en el móvil, te enseñamos los 1-3 toques para
          añadirla a tu pantalla de inicio.
        </p>
      </div>

      <div className="mt-10 flex items-center justify-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-arena)]"
        >
          Continuar en PC al dashboard <ExternalLink className="size-3" />
        </Link>
      </div>

      <Footer />
    </div>
  );
}

function Unknown() {
  return (
    <div className="mt-10 flex flex-1 flex-col items-center justify-center text-center">
      <span className="grid size-14 place-items-center rounded-full bg-[var(--color-arena)]/15 text-[var(--color-arena)]">
        <MonitorSmartphone className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-2xl tracking-tight">
        No reconozco tu dispositivo
      </h1>
      <p className="mt-3 max-w-xs font-editorial text-base italic leading-snug text-[var(--color-muted-foreground)]">
        Abre <span className="font-mono not-italic">{APP_URL}</span> en Chrome
        (Android) o Safari (iPhone) para añadirla a tu pantalla de inicio.
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

function Footer() {
  return (
    <div className="mt-auto pt-10">
      <p className="text-center font-editorial text-xs italic text-[var(--color-muted-foreground)]">
        Es una Progressive Web App — sin descargas pesadas, sin permisos raros.
        Notificaciones opcionales, ocupa menos de 1 MB.
      </p>
    </div>
  );
}
