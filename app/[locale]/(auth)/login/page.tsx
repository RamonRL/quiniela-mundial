import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return {
    title: t("metaTitle"),
    // El login es para el usuario, no para Google. Sin esto, GSC reporta
    // las variantes `/login?next=...` como duplicadas sin canonical.
    robots: { index: false, follow: false },
  };
}

const KICKOFF = process.env.NEXT_PUBLIC_TOURNAMENT_KICKOFF_AT ?? "2026-06-11T19:00:00Z";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("login");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && !params.reason) redirect(params.next ?? "/dashboard");

  const kickoff = new Date(KICKOFF);
  const daysLeft = Math.max(
    0,
    Math.ceil((kickoff.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--color-bg)]">
      {/* ─── Fondo dinámico (mismo lenguaje que onboarding) ─── */}
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

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 py-8 sm:px-10 sm:py-12 lg:px-12 lg:py-16">
        {/* Header — 3 columnas en desktop, stack en mobile.
            Mismo patrón que el onboarding. */}
        <header className="mb-12 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {/* Quiniela Mundial — clic devuelve al landing público. */}
          <div className="flex w-full items-center justify-center sm:w-auto sm:order-1 sm:justify-start">
            <Link
              href="/"
              aria-label={t("backToHome")}
              className="block transition-opacity hover:opacity-80"
            >
              <BrandWordmark priority className="h-12 w-auto sm:h-14" />
            </Link>
          </div>

          {/* FWC26 mark */}
          <div className="flex flex-col items-center gap-1.5 sm:order-2">
            <Image
              src="/fwc26.png"
              alt={t("worldCupAlt")}
              width={1500}
              height={1500}
              priority
              className="h-12 w-auto sm:h-14"
            />
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] sm:text-[0.6rem]">
              {t("worldCupCaption")}
            </p>
          </div>

          {/* Counter */}
          <div className="hidden items-center gap-2 sm:order-3 sm:flex">
            <span className="relative flex size-2">
              <span
                aria-hidden
                className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70"
              />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--color-arena)]" />
            </span>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {t("countdown", { days: daysLeft.toString().padStart(2, "0") })}
            </p>
          </div>
        </header>

        {/* Cuerpo centrado */}
        <main className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-md space-y-10">
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <span className="h-px w-10 bg-[var(--color-arena)]" />
                <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                  {t("eyebrow")}
                </p>
                <span className="h-px w-10 bg-[var(--color-arena)]" />
              </div>
              <h1 className="font-display text-5xl leading-tight tracking-tight sm:text-6xl">
                {t("title")}
              </h1>
              <p className="font-editorial text-lg italic text-[var(--color-muted-foreground)]">
                {t("subtitle")}
              </p>
            </div>

            {params.reason === "banned" ? (
              <div className="rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 p-3 text-center text-sm text-[var(--color-danger)]">
                {t("bannedNotice")}
              </div>
            ) : null}

            <LoginForm next={params.next} />

            <p className="text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              {t("tagline")}
            </p>
          </div>
        </main>

        {/* Footer mobile — counter abajo cuando no cabe arriba */}
        <footer className="mt-8 flex items-center justify-center gap-2 sm:hidden">
          <span className="relative flex size-2">
            <span
              aria-hidden
              className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-arena)] opacity-70"
            />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--color-arena)]" />
          </span>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            T-{daysLeft.toString().padStart(2, "0")} días al kickoff
          </p>
        </footer>
      </div>
    </div>
  );
}
