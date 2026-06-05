"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Copy,
  Globe,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { initials, cn } from "@/lib/utils";
import { formatBytes } from "@/lib/client-image";
import { AvatarCropDialog } from "@/components/profile/avatar-crop-dialog";
import { LeagueLogoGalleryPicker } from "@/components/leagues/league-logo-gallery-picker";
import { CommercialLeadForm } from "@/components/leagues/commercial-lead-form";
import {
  createLeague,
  finalizePaidLeague,
  startPaidLeagueCheckout,
  joinLeagueByCode,
  type CreateLeagueResult,
  type LeagueFormState,
} from "@/lib/league-actions";
import {
  PREDICTION_MODES,
  PREDICTION_MODE_META,
  type PredictionMode,
} from "@/lib/prediction-modes";
import { ONBOARDING_PLANS, type PlanKey } from "@/lib/plans";
import {
  joinPublicByMode,
  saveInitialAvatar,
  saveInitialNickname,
  type SaveInitialProfileState,
} from "./actions";

type Step =
  | "perfil"
  | "foto"
  | "root"
  | "publica-elegir"
  | "privada-elegir"
  | "privada-crear"
  | "privada-unirse";

const initialCreate: CreateLeagueResult = { ok: false };
const initialJoin: LeagueFormState = { ok: false };
const initialProfile: SaveInitialProfileState = { ok: false };

type PaddleConfig = { token: string | null; env: "sandbox" | "production" };

export function OnboardingFlow({
  step,
  fresh,
  userNickname,
  userEmail,
  userAvatarUrl,
  paddle,
}: {
  step: Step;
  fresh: boolean;
  userNickname: string | null;
  userEmail: string;
  userAvatarUrl: string | null;
  paddle: PaddleConfig;
}) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  // Si el usuario llegó al onboarding desde el gateway de compra (p. ej.
  // pulsó "Comprar" sin tener liga), `?next=/precios/comprar/team-100`
  // arrastra a dónde queremos devolverle al terminar. Lo propagamos por
  // todos los pasos para que no se pierda entre `router.push`.
  const nextParam = useSearchParams().get("next");
  const nextQuery = nextParam ? `&next=${encodeURIComponent(nextParam)}` : "";

  if (step === "perfil") {
    return <NicknameStep email={userEmail} nextValue={nextParam} />;
  }

  if (step === "foto") {
    return (
      <PhotoStep
        nickname={userNickname ?? userEmail.split("@")[0]}
        avatarUrl={userAvatarUrl}
        nextValue={nextParam}
        // "Saltar": si el usuario ya tiene liga (entró por invite link),
        // directo al dashboard con el popup de bienvenida — el chooser de
        // liga solo tiene sentido para quien aún no está en ninguna.
        skipHref={
          !nextParam && !fresh
            ? "/dashboard?welcome=1"
            : `/onboarding${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`
        }
      />
    );
  }

  if (step === "root") {
    return (
      <div className="space-y-6 sm:space-y-10">
        {!fresh ? <BackButton href="/dashboard" /> : null}
        <Eyebrow>{t("ebOnboarding")}</Eyebrow>
        <header className="space-y-4">
          <h1 className="font-display text-4xl tracking-tight sm:text-6xl xl:text-7xl">
            {t("rootTitle")}
          </h1>
          <p className="font-editorial text-lg italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-xl">
            {t("rootSubtitle")}
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <ChoiceCard
            icon={<Globe className="size-6" />}
            label={t("publicLabel")}
            description={t("publicDesc")}
            primary
            onClick={() => {
              router.push(`/onboarding?step=publica-elegir${nextQuery}`);
            }}
            actionLabel={t("continue")}
          />
          <ChoiceCard
            icon={<Lock className="size-6" />}
            label={t("privateLabel")}
            description={t("privateDesc")}
            onClick={() => {
              router.push(`/onboarding?step=privada-elegir${nextQuery}`);
            }}
            actionLabel={t("continue")}
          />
        </div>
      </div>
    );
  }

  if (step === "publica-elegir") {
    return (
      <div className="space-y-6 sm:space-y-10">
        <BackButton href={`/onboarding?step=root${nextQuery}`} />
        <Eyebrow>{t("ebPublic")}</Eyebrow>
        <header className="space-y-4">
          <h1 className="font-display text-3xl tracking-tight sm:text-5xl xl:text-6xl">
            {t("publicModeTitle")}
          </h1>
          <p className="font-editorial text-lg italic leading-relaxed text-[var(--color-muted-foreground)]">
            {t("publicModeSubtitle")}
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          {PREDICTION_MODES.map((m) => {
            const meta = PREDICTION_MODE_META[m];
            return (
              <ChoiceCard
                key={m}
                icon={<Globe className="size-6" />}
                label={meta.label}
                description={meta.description}
                primary={m === "completo"}
                onClick={async () => {
                  await joinPublicByMode(m);
                }}
                actionLabel={t("enter")}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (step === "privada-elegir") {
    return (
      <div className="space-y-6 sm:space-y-10">
        <BackButton href={fresh ? "/onboarding" : "/dashboard"} />
        <Eyebrow>{t("ebPrivate")}</Eyebrow>
        <header className="space-y-4">
          <h1 className="font-display text-3xl tracking-tight sm:text-5xl xl:text-6xl">
            {t("privateChooseTitle")}
          </h1>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <ChoiceCard
            icon={<Plus className="size-6" />}
            label={t("createLabel")}
            description={t("createDesc")}
            primary
            onClick={() => {
              router.push(`/onboarding?step=privada-crear${nextQuery}`);
            }}
            actionLabel={t("create")}
          />
          <ChoiceCard
            icon={<Users className="size-6" />}
            label={t("joinLabel")}
            description={t("joinDesc")}
            onClick={() => {
              router.push(`/onboarding?step=privada-unirse${nextQuery}`);
            }}
            actionLabel={t("join")}
          />
        </div>
      </div>
    );
  }

  if (step === "privada-crear") {
    return (
      <div className="space-y-6 sm:space-y-10">
        <BackButton href="/onboarding?step=privada-elegir" />
        <CreateLeagueForm fresh={fresh} paddle={paddle} />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-10">
      <BackButton href="/onboarding?step=privada-elegir" />
      <JoinLeagueForm />
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-10 bg-[var(--color-arena)]" />
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
        {children}
      </p>
    </div>
  );
}

function BackButton({ href }: { href: string }) {
  const t = useTranslations("onboarding");
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
    >
      <ArrowLeft className="size-3.5" /> {t("back")}
    </Link>
  );
}

function ChoiceCard({
  icon,
  label,
  description,
  footer,
  primary,
  onClick,
  actionLabel,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  footer?: string;
  primary?: boolean;
  onClick: () => void;
  actionLabel: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        try {
          setPending(true);
          await onClick();
        } finally {
          setPending(false);
        }
      }}
      className={`group relative flex min-h-0 flex-col items-start gap-3 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ease-out disabled:opacity-60 sm:min-h-[18rem] sm:gap-5 sm:p-7 lg:min-h-[22rem] lg:p-8 ${
        primary
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] hover:-translate-y-1 hover:border-[var(--color-arena)] hover:shadow-[var(--shadow-arena)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:-translate-y-1 hover:border-[var(--color-arena)]/50 hover:shadow-[var(--shadow-elev-2)]"
      }`}
    >
      {primary ? (
        <div
          className="halftone pointer-events-none absolute inset-0 opacity-[0.06] transition-opacity group-hover:opacity-[0.1]"
          aria-hidden
        />
      ) : null}
      <div
        className={`relative grid size-11 place-items-center rounded-lg transition-transform group-hover:scale-110 sm:size-14 ${
          primary
            ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
            : "bg-[var(--color-surface-2)] text-[var(--color-arena)]"
        }`}
      >
        {icon}
      </div>
      <div className="relative space-y-1 sm:space-y-2">
        <h2 className="font-display text-2xl tracking-tight sm:text-4xl">{label}</h2>
        <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)] sm:text-[0.95rem]">
          {description}
        </p>
      </div>
      {footer ? (
        <p className="relative font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          {footer}
        </p>
      ) : null}
      <span className="relative mt-auto inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-arena)] transition-transform group-hover:translate-x-1.5">
        {pending ? "…" : actionLabel} <ArrowRight className="size-3.5" />
      </span>
    </button>
  );
}

// ──────────────────────── Crear ────────────────────────

type CreatedLeague = { name: string; joinCode: string | null; inviteToken: string };

/**
 * Crear quiniela en dos fases (mismo componente cliente):
 *  1. nombre + modo + logo (NO se crea aún la liga),
 *  2. elegir plan → Estándar/Enterprise crean al instante (gratis); un plan
 *     de pago abre el checkout de Paddle en overlay y la liga solo se crea
 *     cuando el pago se confirma.
 */
function CreateLeagueForm({
  fresh,
  paddle,
}: {
  fresh: boolean;
  paddle: PaddleConfig;
}) {
  const t = useTranslations("onboarding");
  const [phase, setPhase] = useState<"form" | "plan">("form");
  const [nameValue, setNameValue] = useState("");
  const [mode, setMode] = useState<PredictionMode>("completo");
  const [logoPresetId, setLogoPresetId] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedLeague | null>(null);
  const [createdPlan, setCreatedPlan] = useState<PlanKey>("free");

  if (created) {
    return <CreatedSuccess league={created} plan={createdPlan} />;
  }

  if (phase === "plan") {
    return (
      <PlanStep
        name={nameValue.trim()}
        mode={mode}
        logoPresetId={logoPresetId}
        paddle={paddle}
        onBack={() => setPhase("form")}
        onCreated={(league, plan) => {
          setCreatedPlan(plan);
          setCreated(league);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-10">
      <Eyebrow>{t("ebCreate")}</Eyebrow>
      <header className="space-y-4">
        <h1 className="font-display text-3xl tracking-tight sm:text-5xl xl:text-6xl">
          {t("createNameTitle")}
        </h1>
        <p className="font-editorial text-lg italic text-[var(--color-muted-foreground)]">
          {t("createNameSubtitle")}
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = nameValue.trim();
          if (trimmed.length < 2) {
            setNameError(t("nameMinError"));
            return;
          }
          setNameError(null);
          setPhase("plan");
        }}
        className="space-y-6"
      >
        <FloatingField
          name="name"
          label={t("nameLabel")}
          placeholder={t("namePlaceholder")}
          required
          maxLength={25}
          autoComplete="off"
          autoFocus
          big
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
        />

        <div className="space-y-2">
          <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("predictionMode")}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {PREDICTION_MODES.map((m) => {
              const meta = PREDICTION_MODE_META[m];
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={active}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_7%,var(--color-surface))] shadow-[var(--shadow-arena)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-arena)]/40"
                  }`}
                >
                  <p className="font-display text-base tracking-tight">{meta.label}</p>
                  <p className="mt-1 text-xs leading-snug text-[var(--color-muted-foreground)]">
                    {meta.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            {t("logo")}
          </p>
          <LeagueLogoGalleryPicker initialLogoUrl={null} onChange={setLogoPresetId} />
        </div>

        {nameError ? (
          <p className="text-sm text-[var(--color-danger)]">{nameError}</p>
        ) : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" className="h-14 px-8 text-base sm:flex-1">
            {t("continue")}
            <ArrowRight />
          </Button>
          {!fresh ? (
            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)] sm:max-w-[18rem]">
              {t("willBeActive")}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}

/**
 * Carga Paddle.js una vez y expone `open(transactionId, callbacks)` para abrir
 * el overlay sobre la pantalla actual. `checkout.completed` dispara
 * `onCompleted`; `checkout.closed` dispara `onClosed` (cerró sin pagar).
 */
function useInlineCheckout(config: PaddleConfig) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onCompletedRef = useRef<(() => void) | null>(null);
  const onClosedRef = useRef<(() => void) | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (!config.token || initRef.current) return;
    initRef.current = true;
    initializePaddle({
      environment: config.env,
      token: config.token,
      eventCallback: (event) => {
        if (event?.name === "checkout.completed") {
          onCompletedRef.current?.();
        } else if (event?.name === "checkout.closed") {
          onClosedRef.current?.();
        }
      },
    })
      .then((instance) => {
        if (instance) setPaddle(instance);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("payLoadFailed"));
      });
  }, [config.token, config.env, t]);

  function open(
    transactionId: string,
    cbs: { onCompleted: () => void; onClosed: () => void },
  ): boolean {
    onCompletedRef.current = cbs.onCompleted;
    onClosedRef.current = cbs.onClosed;
    if (!paddle) {
      setError(t("payLoading"));
      return false;
    }
    paddle.Checkout.open({
      transactionId,
      settings: { displayMode: "overlay", theme: "dark", locale },
    });
    return true;
  }

  return { open, ready: !!paddle, error };
}

function FloatingField({
  name,
  label,
  placeholder,
  required,
  maxLength,
  autoComplete,
  autoFocus,
  big,
  value,
  defaultValue,
  onChange,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
  big?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  // Input "magazine": label en mono uppercase como rótulo arriba, input
  // grande con borde inferior solo (estética minimal-editorial). Foco
  // resalta la línea inferior con el arena. Acepta uso controlado
  // (value + onChange) o uncontrolled (defaultValue).
  return (
    <label className="group block space-y-2">
      <span className="block font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] transition-colors group-focus-within:text-[var(--color-arena)]">
        {label}
      </span>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        className={`w-full border-0 border-b-2 border-[var(--color-border)] bg-transparent px-0 pb-3 pt-1 text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-muted-foreground)]/50 focus:border-[var(--color-arena)] ${
          big ? "font-display text-3xl tracking-tight sm:text-4xl" : "text-lg"
        }`}
      />
    </label>
  );
}

/**
 * Paso de elección de plan. La liga AÚN no existe: Estándar/Enterprise la
 * crean gratis al instante; un plan de pago abre el checkout de Paddle en
 * overlay y la liga solo se materializa cuando el pago se confirma.
 */
function PlanStep({
  name,
  mode,
  logoPresetId,
  paddle,
  onBack,
  onCreated,
}: {
  name: string;
  mode: PredictionMode;
  logoPresetId: string | null;
  paddle: PaddleConfig;
  onBack: () => void;
  onCreated: (league: CreatedLeague, plan: PlanKey) => void;
}) {
  const t = useTranslations("onboarding");
  const [selected, setSelected] = useState<PlanKey>("free");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const checkout = useInlineCheckout(paddle);

  const selectedPlan = ONBOARDING_PLANS.find((p) => p.key === selected)!;

  // Crea la liga gratis (Estándar o Enterprise) vía la server action clásica.
  async function createFree(plan: PlanKey) {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("mode", mode);
    if (logoPresetId) fd.set("logoPresetId", logoPresetId);
    const res = await createLeague(initialCreate, fd);
    if (res.ok && res.league) {
      onCreated(
        {
          name: res.league.name,
          joinCode: res.league.joinCode,
          inviteToken: res.league.inviteToken,
        },
        plan,
      );
    } else {
      setError(res.error ?? t("createFailed"));
      setBusy(false);
    }
  }

  // Tras el pago: verifica con Paddle y crea la liga. Reintenta unas veces por
  // si la transaction aún no figura como completada; el webhook es el respaldo.
  async function finalizeWithRetry(txId: string, attempt = 0): Promise<void> {
    const res = await finalizePaidLeague(txId);
    if (res.ok) {
      onCreated(res.league, selected);
      return;
    }
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 1500));
      return finalizeWithRetry(txId, attempt + 1);
    }
    toast.success(t("payReceived"));
    window.location.href = "/dashboard";
  }

  async function onContinue() {
    setError(null);
    setBusy(true);
    if (selected === "free" || selected === "enterprise") {
      await createFree(selected);
      return;
    }
    // Plan de pago → checkout en overlay; la liga se crea al confirmar el pago.
    const res = await startPaidLeagueCheckout({
      name,
      mode,
      logoPresetId,
      tier: selected,
    });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    setPaying(true);
    const opened = checkout.open(res.transactionId, {
      onCompleted: () => {
        setPaying(false);
        void finalizeWithRetry(res.transactionId);
      },
      onClosed: () => {
        setPaying(false);
        setBusy(false);
      },
    });
    if (!opened) {
      setError(checkout.error ?? "No se pudo abrir la ventana de pago.");
      setPaying(false);
      setBusy(false);
    }
  }

  const ctaLabel =
    selected === "free"
      ? t("ctaFree")
      : selected === "enterprise"
        ? t("continue")
        : t("ctaPay", { price: selectedPlan.priceLabel });

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{t("ebPlan")}</Eyebrow>
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)] disabled:opacity-50"
        >
          <ArrowLeft className="size-3.5" /> {t("back")}
        </button>
      </div>
      <header className="space-y-3">
        <h1 className="font-display text-3xl tracking-tight sm:text-5xl">
          {t("planTitle")}
        </h1>
        <p className="font-editorial text-lg italic text-[var(--color-muted-foreground)]">
          {t("planSubtitle")}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {ONBOARDING_PLANS.map((plan) => (
          <PlanColumn
            key={plan.key}
            plan={plan}
            active={selected === plan.key}
            onSelect={() => !busy && setSelected(plan.key)}
          />
        ))}
      </div>

      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          size="lg"
          onClick={onContinue}
          disabled={busy}
          className="h-14 px-8 text-base sm:flex-1"
        >
          {paying ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t("payInProgress")}
            </>
          ) : busy ? (
            t("creating")
          ) : (
            <>
              {ctaLabel} <ArrowRight />
            </>
          )}
        </Button>
        {selected !== "free" && selected !== "enterprise" ? (
          <p className="inline-flex items-center gap-1.5 font-editorial text-xs italic text-[var(--color-muted-foreground)] sm:max-w-[18rem]">
            <ShieldCheck className="size-3.5 text-[var(--color-arena)]" />
            {t("payNote")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PlanColumn({
  plan,
  active,
  onSelect,
}: {
  plan: (typeof ONBOARDING_PLANS)[number];
  active: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("onboarding");
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "relative flex h-full flex-col gap-3 rounded-2xl border p-4 text-left transition",
        active
          ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))] shadow-[var(--shadow-arena)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-arena)]/40",
      )}
    >
      {plan.popular ? (
        <span className="absolute -top-2 right-3 rounded-full bg-[var(--color-arena)] px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-white shadow-[var(--shadow-arena)]">
          {t("mostPopular")}
        </span>
      ) : null}

      <div className="space-y-1.5">
        <p className="font-display text-lg tracking-tight">{plan.name}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display tabular text-2xl tracking-tight text-[var(--color-arena)]">
            {plan.priceLabel}
          </span>
          {plan.regularPriceLabel ? (
            <span className="font-display tabular text-sm tracking-tight text-[var(--color-muted-foreground)] line-through decoration-[var(--color-arena)]/70">
              {plan.regularPriceLabel}
            </span>
          ) : null}
        </div>
        {/* Nº de miembros — destacado: es el dato que más se compara. */}
        <p className="inline-flex items-center gap-1.5 rounded-md bg-[color-mix(in_oklch,var(--color-arena)_10%,transparent)] px-2 py-1 font-display text-sm tracking-tight text-[var(--color-foreground)]">
          <Users className="size-3.5 text-[var(--color-arena)]" />
          {plan.members}
        </p>
      </div>

      <p className="font-editorial text-xs italic leading-snug text-[var(--color-muted-foreground)]">
        {plan.audience}
      </p>

      {/* En Estándar omitimos la lista de features para no recargar la
          tarjeta — el resto de planes sí la muestra. */}
      {plan.key !== "free" && plan.features.length > 0 ? (
        <ul className="space-y-1.5 border-t border-[var(--color-border)] pt-3">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-xs leading-snug">
              <Check className="mt-0.5 size-3 shrink-0 text-[var(--color-arena)]" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {plan.key === "free" ? (
        <p className="mt-auto pt-1 font-mono text-[0.5rem] uppercase leading-relaxed tracking-[0.14em] text-[var(--color-muted-foreground)]">
          {t("freeUpgradeNote")}
        </p>
      ) : null}

      <span
        className={cn(
          "mt-auto inline-flex items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-[0.2em]",
          active ? "text-[var(--color-arena)]" : "text-[var(--color-muted-foreground)]",
        )}
      >
        {active ? (
          <>
            <Check className="size-3" /> {t("selected")}
          </>
        ) : (
          t("choose")
        )}
      </span>
    </button>
  );
}

function CreatedSuccess({
  league,
  plan,
}: {
  league: CreatedLeague;
  plan: PlanKey;
}) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const { name, joinCode, inviteToken } = league;
  const isEnterprise = plan === "enterprise";
  const isPaid = plan === "team-50" || plan === "team-100" || plan === "team-250";
  const planMeta = ONBOARDING_PLANS.find((p) => p.key === plan);
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${inviteToken}`
      : `/invite/${inviteToken}`;
  return (
    <div className="space-y-6 sm:space-y-10">
      <div className="flex items-center gap-3">
        <Sparkles className="size-4 text-[var(--color-arena)]" />
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-arena)]">
          {isPaid ? t("createdWithPlan", { plan: planMeta?.name ?? "" }) : t("created")}
        </p>
      </div>
      <header className="space-y-4">
        <h1 className="font-display text-3xl tracking-tight sm:text-5xl xl:text-6xl">
          {name}
        </h1>
        <p className="font-editorial text-lg italic text-[var(--color-muted-foreground)]">
          {isPaid ? t("createdPaidDesc") : t("createdDesc")}
        </p>
      </header>

      <div className="space-y-6">
        <div className="rounded-2xl border border-[var(--color-arena)]/50 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-5 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {t("code4")}
            </p>
            <CopyButton value={joinCode ?? "—"} disabled={!joinCode} />
          </div>
          <p className="mt-3 font-display tabular text-6xl tracking-[0.2em] text-[var(--color-arena)] glow-arena sm:text-8xl xl:text-9xl">
            {joinCode ?? "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                {t("inviteLink")}
              </p>
              <p className="mt-1 truncate font-mono text-sm text-[var(--color-foreground)]">
                {inviteUrl}
              </p>
            </div>
            <CopyButton value={inviteUrl} />
          </div>
        </div>
      </div>

      {isEnterprise ? (
        <div className="space-y-4 rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-5 sm:p-6">
          <div className="space-y-1">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
              {t("enterprisePlan")}
            </p>
            <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              {t("enterpriseDesc")}
            </p>
          </div>
          <CommercialLeadForm
            defaultMessagePlaceholder={t("enterprisePlaceholder")}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button
          size="lg"
          onClick={() => router.push("/dashboard")}
          className="h-14 px-8 text-base sm:flex-1"
        >
          {t("goDashboard")} <ArrowRight />
        </Button>
        <Link
          href="/onboarding?step=privada-elegir"
          className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          {t("createAnother")}
        </Link>
      </div>
    </div>
  );
}

function CopyButton({ value, disabled }: { value: string; disabled?: boolean }) {
  const t = useTranslations("onboarding");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t("copiedClipboard"));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t("copyFailed"));
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      disabled={disabled}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? t("copied") : t("copy")}
    </Button>
  );
}

// ──────────────────────── Unirse ────────────────────────

function JoinLeagueForm() {
  const t = useTranslations("onboarding");
  const [state, action, pending] = useActionState(joinLeagueByCode, initialJoin);
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const refs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);

  const code = digits.join("");
  const ready = code.length === 4 && /^\d{4}$/.test(code);

  const handleChange = (i: number, raw: string) => {
    // Solo dígitos. Si el usuario pega "1234", lo distribuimos.
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.length === 0) {
      const next = [...digits];
      next[i] = "";
      setDigits(next);
      return;
    }
    if (cleaned.length > 1) {
      // Pegado: distribuye desde i.
      const next = [...digits];
      const chars = cleaned.slice(0, 4 - i).split("");
      chars.forEach((c, k) => {
        next[i + k] = c;
      });
      setDigits(next);
      const last = Math.min(3, i + chars.length);
      refs.current[last]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = cleaned;
    setDigits(next);
    if (i < 3) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 3) refs.current[i + 1]?.focus();
  };

  return (
    <div className="space-y-6 sm:space-y-10">
      <Eyebrow>{t("ebJoin")}</Eyebrow>
      <header className="space-y-4">
        <h1 className="font-display text-3xl tracking-tight sm:text-5xl xl:text-6xl">
          {t("joinTitle")}
        </h1>
        <p className="font-editorial text-lg italic text-[var(--color-muted-foreground)]">
          {t("joinSubtitle")}
        </p>
      </header>

      <form action={action}>
        <input type="hidden" name="code" value={code} />

        <div className="space-y-6">
          <div
            className="flex items-center justify-center gap-3 sm:gap-4"
            onPaste={(e) => {
              const text = e.clipboardData.getData("text").replace(/\D/g, "");
              if (text.length > 0) {
                e.preventDefault();
                handleChange(0, text);
              }
            }}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="\d"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                aria-label={t("digitAria", { n: i + 1 })}
                className="size-20 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-center font-display text-5xl tabular tracking-tight text-[var(--color-foreground)] outline-none transition-all focus:-translate-y-0.5 focus:border-[var(--color-arena)] focus:shadow-[var(--shadow-arena)] sm:size-24 sm:text-6xl xl:size-28 xl:text-7xl"
              />
            ))}
          </div>

          {state.error ? (
            <p className="text-center text-sm text-[var(--color-danger)]">
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <Button
              type="submit"
              size="lg"
              className="h-14 px-8 text-base sm:flex-1"
              disabled={pending || !ready}
            >
              {pending ? t("checking") : t("joinSubmit")}
              <ArrowRight />
            </Button>
            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)] sm:max-w-[18rem]">
              {t("inviteLinkHint")}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

// ──────────────────────── Perfil (primer login) ────────────────────────

/**
 * Tope absoluto del archivo crudo antes de comprimir. 20 MB acepta
 * cualquier foto de móvil moderna; el pipeline de `compressImage` la
 * deja en ~100-200 KB antes de que viaje al servidor (mismo patrón
 * que el formulario de `/perfil`).
 *
 * La compresión se hace silenciosa: el usuario no ve indicador
 * "optimizando" ni el ratio de ahorro — solo aparece su avatar
 * cargado cuando termina. El submit queda bloqueado mientras se
 * comprime para evitar enviar el archivo crudo por accidente.
 */
const MAX_RAW_INPUT_BYTES = 20 * 1024 * 1024;


/**
 * Paso 1 del perfil: SOLO el apodo. Separado de la foto a propósito —
 * cuando ambos vivían en la misma pantalla, casi nadie subía foto. Aquí
 * el único foco es el nombre; al continuar se pasa al paso de la foto.
 */
function NicknameStep({
  email,
  nextValue,
}: {
  email: string;
  nextValue: string | null;
}) {
  const t = useTranslations("onboarding");
  const [state, action, pending] = useActionState(
    saveInitialNickname,
    initialProfile,
  );
  const defaultNickname = email.split("@")[0];
  const [nicknameValue, setNicknameValue] = useState(defaultNickname);

  return (
    <div className="space-y-6 sm:space-y-10">
      <Eyebrow>{t("ebProfile1")}</Eyebrow>
      <header className="space-y-4">
        <h1 className="font-display text-4xl tracking-tight sm:text-6xl xl:text-7xl">
          {t("nicknameTitle")}
        </h1>
        <p className="font-editorial text-lg italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-xl">
          {t("nicknameSubtitle")}
        </p>
      </header>

      <form action={action} className="space-y-6 sm:space-y-10">
        {nextValue ? <input type="hidden" name="next" value={nextValue} /> : null}
        <label className="group block space-y-2">
          <span className="block font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] transition-colors group-focus-within:text-[var(--color-arena)]">
            {t("nicknameLabel")}
          </span>
          <input
            type="text"
            name="nickname"
            value={nicknameValue}
            onChange={(e) => setNicknameValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            maxLength={40}
            autoComplete="off"
            autoFocus
            className="w-full border-0 border-b-2 border-[var(--color-border)] bg-transparent px-0 pb-3 pt-1 font-display text-3xl tracking-tight text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-muted-foreground)]/50 focus:border-[var(--color-arena)] sm:text-4xl"
          />
          <span className="block font-editorial text-xs italic text-[var(--color-muted-foreground)]">
            {t("nicknameDefault", { email })}
          </span>
        </label>

        {state.error ? (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
          <Button
            type="submit"
            size="lg"
            className="h-14 px-8 text-base sm:flex-1"
            disabled={pending}
          >
            {pending ? t("saving") : t("continue")}
            <ArrowRight />
          </Button>
          <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)] sm:max-w-[18rem]">
            {t("thenPhoto")}
          </p>
        </div>
      </form>
    </div>
  );
}

/**
 * Paso 2 del perfil: la FOTO (opcional). Pantalla propia para que la gente
 * la vea como un paso real y no se la salte sin querer. Tiene su propio
 * botón "Saltar" que va directo al chooser de liga sin subir nada.
 */
function PhotoStep({
  nickname,
  avatarUrl,
  nextValue,
  skipHref,
}: {
  nickname: string;
  avatarUrl: string | null;
  nextValue: string | null;
  skipHref: string;
}) {
  const t = useTranslations("onboarding");
  const [state, action, pending] = useActionState(
    saveInitialAvatar,
    initialProfile,
  );
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickFile(file: File) {
    setError(null);
    if (file.size > MAX_RAW_INPUT_BYTES) {
      setError(t("photoTooBig", { size: formatBytes(file.size) }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSource((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setCropOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeCrop() {
    setCropOpen(false);
    if (cropSource) {
      URL.revokeObjectURL(cropSource);
      setCropSource(null);
    }
  }

  function onCropConfirm(file: File) {
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
    }
    setPreview(URL.createObjectURL(file));
    setHasFile(true);
    closeCrop();
  }

  return (
    <div className="space-y-6 sm:space-y-10">
      <Eyebrow>{t("ebProfile2")}</Eyebrow>
      <header className="space-y-4">
        <h1 className="font-display text-4xl tracking-tight sm:text-6xl xl:text-7xl">
          {t("photoTitle", { nickname })}
        </h1>
        <p className="font-editorial text-lg italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-xl">
          {t("photoSubtitle")}
        </p>
      </header>

      <form action={action} className="space-y-6 sm:space-y-10">
        {nextValue ? <input type="hidden" name="next" value={nextValue} /> : null}
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-10">
          {/* Avatar dropzone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) pickFile(file);
            }}
            aria-label={t("uploadAvatar")}
            className="group relative size-40 shrink-0"
          >
            <Avatar className="size-40 border-2 border-[var(--color-border-strong)] shadow-[var(--shadow-elev-1)] transition-all group-hover:border-[var(--color-arena)] group-hover:shadow-[var(--shadow-arena)]">
              {preview ? <AvatarImage src={preview} alt={nickname} /> : null}
              <AvatarFallback className="font-display text-5xl tracking-tight">
                {initials(nickname)}
              </AvatarFallback>
            </Avatar>
            <span
              aria-hidden
              className="absolute inset-0 grid place-items-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <span className="flex flex-col items-center gap-1 text-white">
                <Camera className="size-6" />
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em]">
                  {hasFile ? t("change") : t("upload")}
                </span>
              </span>
            </span>
            <span className="absolute -bottom-1 -right-1 flex size-10 items-center justify-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)] ring-4 ring-[var(--color-bg)]">
              <Camera className="size-4" />
            </span>
          </button>

          <div className="space-y-2 text-center sm:text-left">
            <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              {t("photoHint")}{" "}
              <span className="font-mono not-italic uppercase tracking-[0.18em]">
                PNG/JPG
              </span>
            </p>
            {error ? (
              <p className="text-xs text-[var(--color-danger)]">{error}</p>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
          />
        </div>

        {state.error ? (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
          <Button
            type="submit"
            size="lg"
            className="h-14 px-8 text-base sm:flex-1"
            disabled={pending}
          >
            {pending ? t("saving") : hasFile ? t("saveAndContinue") : t("continue")}
            <ArrowRight />
          </Button>
          <Button
            asChild
            type="button"
            variant="ghost"
            size="lg"
            className="h-14 px-6 text-base text-[var(--color-muted-foreground)]"
          >
            <Link href={skipHref}>{t("skipForNow")}</Link>
          </Button>
        </div>
      </form>

      <AvatarCropDialog
        open={cropOpen}
        sourceUrl={cropSource}
        onCancel={closeCrop}
        onConfirm={onCropConfirm}
      />
    </div>
  );
}
