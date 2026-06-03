import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { paddleClientToken, paddlePublicEnv } from "@/lib/paddle";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata = { title: "Bienvenido" } satisfies Metadata;

type Step =
  | "perfil"
  | "foto"
  | "root"
  | "publica-elegir"
  | "privada-elegir"
  | "privada-crear"
  | "privada-unirse";

const VALID_STEPS: Step[] = [
  "perfil",
  "foto",
  "root",
  "publica-elegir",
  "privada-elegir",
  "privada-crear",
  "privada-unirse",
];

const KICKOFF = process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const me = await requireUser();
  const t = await getTranslations("onboarding");
  const fresh = me.leagueId == null;
  const needsProfile = me.nickname == null;

  const params = await searchParams;
  const requested: Step = (VALID_STEPS as string[]).includes(params.step ?? "")
    ? (params.step as Step)
    : "root";

  // Primer login (sin nickname): forzamos el paso "perfil" antes de
  // cualquier otro. Si ya tiene nickname y aterriza en "perfil", lo
  // sacamos al chooser de liga.
  let step: Step = requested;
  if (needsProfile) {
    step = "perfil";
  } else if (step === "perfil") {
    step = fresh ? "root" : "privada-elegir";
  }
  // El "root" (Pública / Privada) es accesible también para usuarios que ya
  // tienen liga: desde el switcher "Unirse o crear" pueden entrar a una
  // pública de otro modo o crear/unirse a una privada.

  const kickoff = new Date(KICKOFF);
  const days = Math.max(
    0,
    Math.ceil((kickoff.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--color-bg)]">
      {/* ─── Fondo dinámico minimal ─── */}
      <div className="pitch-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div
        className="halftone pointer-events-none absolute inset-x-0 top-0 h-72 opacity-[0.05]"
        aria-hidden
      />
      <div
        aria-hidden
        className="onboarding-orb pointer-events-none absolute -left-40 top-1/4 h-[420px] w-[420px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--color-arena) 22%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="onboarding-orb-2 pointer-events-none absolute -right-32 bottom-0 h-[360px] w-[360px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--color-pitch) 28%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 py-4 sm:px-10 sm:py-12 lg:px-12 lg:py-16">
        {/* Header — Quiniela Mundial · FWC26 mark · counter
            Desktop: 3 columnas en una sola fila a la misma altura.
            Mobile: solo el wordmark (el mark FIFA se oculta para no robar
            altura — el onboarding debe caber sin scroll). */}
        <header className="mb-6 flex flex-col items-center gap-6 sm:mb-12 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {/* Quiniela Mundial */}
          <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:order-1">
            <Link href="/dashboard" className="block" aria-label="Quiniela Mundial">
              <BrandWordmark priority className="h-12 w-auto sm:h-14" />
            </Link>
            {/* Dashboard link inline en mobile (a la derecha del logo) */}
            {!fresh ? (
              <Link
                href="/dashboard"
                className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)] sm:hidden"
              >
                {t("dashboardLink")}
              </Link>
            ) : null}
          </div>

          {/* FIFA World Cup 26 mark — centro. Oculto en móvil para ganar
              altura: el onboarding debe caber en pantalla sin scroll. */}
          <div className="hidden flex-col items-center gap-1.5 sm:order-2 sm:flex">
            <Image
              src="/fwc26.png"
              alt="FIFA World Cup 26"
              width={1500}
              height={1500}
              priority
              className="h-12 w-auto sm:h-14"
            />
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] sm:text-[0.6rem]">
              {t("worldCupCaption")}
            </p>
          </div>

          {/* Counter + dashboard link (desktop) */}
          <div className="hidden items-center gap-4 sm:order-3 sm:flex">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span
                  aria-hidden
                  className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70"
                />
                <span className="relative inline-flex size-2 rounded-full bg-[var(--color-arena)]" />
              </span>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                {t("countdown", { days: days.toString().padStart(2, "0") })}
              </p>
            </div>
            {!fresh ? (
              <Link
                href="/dashboard"
                className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
              >
                {t("dashboardLink")}
              </Link>
            ) : null}
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center">
          <OnboardingFlow
            step={step}
            fresh={fresh}
            userNickname={me.nickname}
            userEmail={me.email}
            userAvatarUrl={me.avatarUrl}
            paddle={{ token: paddleClientToken(), env: paddlePublicEnv() }}
          />
        </div>
      </div>
    </div>
  );
}
