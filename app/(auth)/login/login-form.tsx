"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowLeft, Info, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "@/components/icons/google";
import {
  type OtpSendState,
  type OtpVerifyState,
  sendEmailOtp,
  signInWithGoogle,
  verifyEmailOtp,
} from "./actions";
import { GMAIL_USE_GOOGLE_MESSAGE, isGmailAddress } from "./gmail";

const SEND_INITIAL: OtpSendState = { ok: false };
const VERIFY_INITIAL: OtpVerifyState = { ok: false };

export function LoginForm({ next }: { next?: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  // Capturamos el valor del input en vivo para detectar Gmail mientras se
  // teclea y mostrar el aviso "usa el botón de Google" sin esperar a submit.
  const [emailDraft, setEmailDraft] = useState("");
  const draftIsGmail = isGmailAddress(emailDraft);

  const [sendState, sendAction, sending] = useActionState(sendEmailOtp, SEND_INITIAL);
  const [verifyState, verifyAction, verifying] = useActionState(
    verifyEmailOtp,
    VERIFY_INITIAL,
  );

  // Cuando el OTP se envía con éxito, guardamos el email validado por el server
  // y pasamos al paso de verificación. El server action devuelve el email ya
  // normalizado (lower-case, trim), así lo pre-cargamos en el form de verify.
  useEffect(() => {
    if (sendState.ok && sendState.email) {
      setEmail(sendState.email);
      setStep("code");
    }
  }, [sendState]);

  return (
    <div className="space-y-6">
      {/* Google */}
      <form action={signInWithGoogle}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <GoogleIcon className="size-5" />
          Continuar con Google
        </Button>
      </form>

      {/* Separador */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          o con tu email
        </span>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {/* Email · paso 1 */}
      {step === "email" ? (
        <form action={sendAction} className="space-y-3">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <Input
                id="login-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                placeholder="tu@empresa.com"
                disabled={sending}
                className="pl-9"
              />
            </div>
          </div>
          {draftIsGmail ? (
            <div className="flex items-start gap-2 rounded-md border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,transparent)] px-3 py-2 text-xs leading-relaxed text-[var(--color-foreground)]">
              <Info className="size-3.5 shrink-0 text-[var(--color-arena)]" />
              <span>{GMAIL_USE_GOOGLE_MESSAGE}</span>
            </div>
          ) : null}
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full"
            disabled={sending || draftIsGmail}
          >
            {sending ? "Enviando código…" : "Enviarme un código"}
          </Button>
          {sendState.error && !draftIsGmail ? (
            <p className="text-center text-xs text-[var(--color-danger)]">{sendState.error}</p>
          ) : null}
          <p className="text-center text-[0.65rem] text-[var(--color-muted-foreground)]">
            Te mandamos un código de 6 dígitos. Sin contraseñas.
          </p>
        </form>
      ) : (
        /* Email · paso 2 (verificación) */
        <form action={verifyAction} className="space-y-3">
          <input type="hidden" name="email" value={email} />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <p className="text-center text-xs text-[var(--color-muted-foreground)]">
            Hemos mandado un código a{" "}
            <span className="font-mono text-[var(--color-foreground)]">{email}</span>
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="login-otp" className="text-xs">
              Código de 6 dígitos
            </Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <Input
                id="login-otp"
                name="token"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="one-time-code"
                required
                autoFocus
                placeholder="123456"
                disabled={verifying}
                className="pl-9 tracking-[0.4em] font-mono text-lg"
              />
            </div>
          </div>
          <Button type="submit" variant="default" size="lg" className="w-full" disabled={verifying}>
            {verifying ? "Verificando…" : "Entrar"}
          </Button>
          {verifyState.error ? (
            <p className="text-center text-xs text-[var(--color-danger)]">{verifyState.error}</p>
          ) : null}
          <button
            type="button"
            onClick={() => setStep("email")}
            disabled={verifying}
            className="mx-auto flex items-center gap-1 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            <ArrowLeft className="size-3" /> Cambiar email
          </button>
        </form>
      )}
    </div>
  );
}
