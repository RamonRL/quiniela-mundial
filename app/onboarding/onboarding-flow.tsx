"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Copy,
  Globe,
  Lock,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { initials } from "@/lib/utils";
import { compressImage, formatBytes } from "@/lib/client-image";
import { LeagueLogoGalleryPicker } from "@/components/leagues/league-logo-gallery-picker";
import {
  createLeague,
  joinLeagueByCode,
  type CreateLeagueResult,
  type LeagueFormState,
} from "@/lib/league-actions";
import {
  chooseActivePublic,
  saveInitialProfile,
  type SaveInitialProfileState,
} from "./actions";

type Step = "perfil" | "root" | "privada-elegir" | "privada-crear" | "privada-unirse";

const initialCreate: CreateLeagueResult = { ok: false };
const initialJoin: LeagueFormState = { ok: false };
const initialProfile: SaveInitialProfileState = { ok: false };

export function OnboardingFlow({
  step,
  fresh,
  userNickname,
  userEmail,
  userAvatarUrl,
}: {
  step: Step;
  fresh: boolean;
  userNickname: string | null;
  userEmail: string;
  userAvatarUrl: string | null;
}) {
  const router = useRouter();
  void userNickname;

  if (step === "perfil") {
    return <ProfileStep email={userEmail} avatarUrl={userAvatarUrl} />;
  }

  if (step === "root") {
    return (
      <div className="space-y-10">
        <Eyebrow>Onboarding</Eyebrow>
        <header className="space-y-4">
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl xl:text-7xl">
            Bienvenido a Quiniela Mundial
          </h1>
          <p className="font-editorial text-lg italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-xl">
            ¿Dónde quieres jugar?
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <ChoiceCard
            icon={<Globe className="size-6" />}
            label="Quiniela Pública"
            description="Donde compite todo el mundo."
            primary
            onClick={async () => {
              await chooseActivePublic();
            }}
            actionLabel="Entrar"
          />
          <ChoiceCard
            icon={<Lock className="size-6" />}
            label="Quiniela Privada"
            description="Para tu grupo. Sólo los tuyos."
            onClick={() => {
              router.push("/onboarding?step=privada-elegir");
            }}
            actionLabel="Continuar"
          />
        </div>
      </div>
    );
  }

  if (step === "privada-elegir") {
    return (
      <div className="space-y-10">
        <BackButton href={fresh ? "/onboarding" : "/dashboard"} />
        <Eyebrow>Quiniela privada</Eyebrow>
        <header className="space-y-4">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl xl:text-6xl">
            Crear o unirte.
          </h1>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <ChoiceCard
            icon={<Plus className="size-6" />}
            label="Crear una quiniela"
            description="Le pones nombre y la lanzas."
            primary
            onClick={() => {
              router.push("/onboarding?step=privada-crear");
            }}
            actionLabel="Crear"
          />
          <ChoiceCard
            icon={<Users className="size-6" />}
            label="Unirse a una quiniela"
            description="Pega el código y entras."
            onClick={() => {
              router.push("/onboarding?step=privada-unirse");
            }}
            actionLabel="Unirse"
          />
        </div>
      </div>
    );
  }

  if (step === "privada-crear") {
    return (
      <div className="space-y-10">
        <BackButton href="/onboarding?step=privada-elegir" />
        <CreateLeagueForm fresh={fresh} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
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
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
    >
      <ArrowLeft className="size-3.5" /> Volver
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
      className={`group relative flex min-h-[18rem] flex-col items-start gap-5 overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300 ease-out disabled:opacity-60 sm:p-7 lg:min-h-[22rem] lg:p-8 ${
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
        className={`relative grid size-14 place-items-center rounded-lg transition-transform group-hover:scale-110 ${
          primary
            ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
            : "bg-[var(--color-surface-2)] text-[var(--color-arena)]"
        }`}
      >
        {icon}
      </div>
      <div className="relative space-y-2">
        <h2 className="font-display text-3xl tracking-tight sm:text-4xl">{label}</h2>
        <p className="text-[0.95rem] leading-relaxed text-[var(--color-muted-foreground)]">
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

function CreateLeagueForm({ fresh }: { fresh: boolean }) {
  const [state, action, pending] = useActionState(createLeague, initialCreate);
  const [nameValue, setNameValue] = useState("");

  if (state.ok && state.league) {
    return (
      <CreatedSuccess
        name={state.league.name}
        joinCode={state.league.joinCode}
        inviteToken={state.league.inviteToken}
      />
    );
  }

  return (
    <div className="space-y-10">
      <Eyebrow>Crear quiniela</Eyebrow>
      <header className="space-y-4">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl xl:text-6xl">
          Ponle nombre.
        </h1>
        <p className="font-editorial text-lg italic text-[var(--color-muted-foreground)]">
          El que tu grupo reconozca al verlo.
        </p>
      </header>

      <form action={action} className="space-y-8">
        <FloatingField
          name="name"
          label="Nombre de la quiniela · máx 25 caracteres"
          placeholder="QUINIELA MUNDIAL 2026"
          required
          maxLength={25}
          autoComplete="off"
          autoFocus
          big
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
        />

        <div className="space-y-3">
          <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Logo · galería
          </p>
          <LeagueLogoGalleryPicker initialLogoUrl={null} />
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
            {pending ? "Creando…" : "Crear quiniela"}
            <ArrowRight />
          </Button>
          {!fresh ? (
            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)] sm:max-w-[18rem]">
              Pasará a ser tu liga activa.
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
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

function CreatedSuccess({
  name,
  joinCode,
  inviteToken,
}: {
  name: string;
  joinCode: string | null;
  inviteToken: string;
}) {
  const router = useRouter();
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${inviteToken}`
      : `/invite/${inviteToken}`;
  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3">
        <Sparkles className="size-4 text-[var(--color-arena)]" />
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-arena)]">
          Liga creada
        </p>
      </div>
      <header className="space-y-4">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl xl:text-6xl">
          {name}
        </h1>
        <p className="font-editorial text-lg italic text-[var(--color-muted-foreground)]">
          Comparte el código y a por ello.
        </p>
      </header>

      <div className="space-y-6">
        <div className="rounded-2xl border border-[var(--color-arena)]/50 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Código de 4 dígitos
            </p>
            <CopyButton value={joinCode ?? "—"} disabled={!joinCode} />
          </div>
          <p className="mt-3 font-display tabular text-7xl tracking-[0.2em] text-[var(--color-arena)] glow-arena sm:text-8xl xl:text-9xl">
            {joinCode ?? "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                Invite link
              </p>
              <p className="mt-1 truncate font-mono text-sm text-[var(--color-foreground)]">
                {inviteUrl}
              </p>
            </div>
            <CopyButton value={inviteUrl} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button
          size="lg"
          onClick={() => router.push("/dashboard")}
          className="h-14 px-8 text-base sm:flex-1"
        >
          Ir al dashboard <ArrowRight />
        </Button>
        <Link
          href="/onboarding?step=privada-elegir"
          className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          Crear otra
        </Link>
      </div>
    </div>
  );
}

function CopyButton({ value, disabled }: { value: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar");
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
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

// ──────────────────────── Unirse ────────────────────────

function JoinLeagueForm() {
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
    <div className="space-y-10">
      <Eyebrow>Unirse a quiniela</Eyebrow>
      <header className="space-y-4">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl xl:text-6xl">
          Cuatro dígitos.
        </h1>
        <p className="font-editorial text-lg italic text-[var(--color-muted-foreground)]">
          Los que te ha pasado quien la creó.
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
                aria-label={`Dígito ${i + 1}`}
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
              {pending ? "Comprobando…" : "Unirme"}
              <ArrowRight />
            </Button>
            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)] sm:max-w-[18rem]">
              ¿Tienes el invite link? Pulsa y entras directo.
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

function ProfileStep({
  email,
  avatarUrl,
}: {
  email: string;
  avatarUrl: string | null;
}) {
  const [state, action, pending] = useActionState(saveInitialProfile, initialProfile);
  const defaultNickname = email.split("@")[0];
  const [nicknameValue, setNicknameValue] = useState(defaultNickname);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const display = nicknameValue.trim() || defaultNickname;

  async function pickFile(file: File) {
    setError(null);

    if (file.size > MAX_RAW_INPUT_BYTES) {
      setError(
        `La imagen pesa ${formatBytes(file.size)}. Demasiado grande, prueba con otra.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setCompressing(true);
    try {
      const result = await compressImage(file, { maxDim: 800, quality: 0.85 });
      // Reemplazamos el File del <input type="file"> por la versión
      // comprimida usando DataTransfer — así la FormData del submit
      // envía el archivo optimizado sin tocar el server action.
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(result.file);
        fileInputRef.current.files = dt.files;
      }
      setPreview(URL.createObjectURL(result.file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar la imagen.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setCompressing(false);
    }
  }

  return (
    <div className="space-y-10">
      <Eyebrow>Tu perfil</Eyebrow>
      <header className="space-y-4">
        <h1 className="font-display text-5xl tracking-tight sm:text-6xl xl:text-7xl">
          ¿Cómo te llamamos?
        </h1>
        <p className="font-editorial text-lg italic leading-relaxed text-[var(--color-muted-foreground)] sm:text-xl">
          Esto es lo que verán los demás en el ranking y el chat. Lo puedes
          cambiar luego.
        </p>
      </header>

      <form action={action} className="space-y-10">
        <div className="grid items-start gap-8 sm:grid-cols-[auto_1fr] sm:gap-10">
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
            aria-label="Subir avatar"
            className="group relative mx-auto size-32 shrink-0 sm:mx-0 sm:size-36"
          >
            <Avatar className="size-32 border-2 border-[var(--color-border-strong)] shadow-[var(--shadow-elev-1)] transition-all group-hover:border-[var(--color-arena)] group-hover:shadow-[var(--shadow-arena)] sm:size-36">
              {preview ? <AvatarImage src={preview} alt={display} /> : null}
              <AvatarFallback className="font-display text-4xl tracking-tight">
                {initials(display)}
              </AvatarFallback>
            </Avatar>
            <span
              aria-hidden
              className="absolute inset-0 grid place-items-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <span className="flex flex-col items-center gap-1 text-white">
                <Camera className="size-6" />
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em]">
                  Subir
                </span>
              </span>
            </span>
            <span className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)] ring-4 ring-[var(--color-bg)]">
              <Camera className="size-4" />
            </span>
          </button>

          {/* Apodo + email */}
          <div className="space-y-6">
            <label className="group block space-y-2">
              <span className="block font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] transition-colors group-focus-within:text-[var(--color-arena)]">
                Apodo · máx 40 caracteres
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
                Por defecto, la primera parte de tu email.
              </span>
            </label>

            <div className="space-y-1">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
                Email
              </p>
              <p className="font-mono text-sm text-[var(--color-foreground)]">{email}</p>
            </div>

            <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
              Pulsa o arrastra una imagen sobre el avatar.{" "}
              <span className="font-mono not-italic uppercase tracking-[0.18em]">
                PNG/JPG · opcional
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
            disabled={pending || compressing}
          >
            {pending ? "Guardando…" : "Continuar"}
            <ArrowRight />
          </Button>
          <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)] sm:max-w-[18rem]">
            Después eliges tu quiniela.
          </p>
        </div>
      </form>
    </div>
  );
}
