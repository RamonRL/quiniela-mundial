"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, PartyPopper } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Evento que se emite al cerrar el popup — lo escucha TutorialAutoStart
 * para arrancar el tutorial DESPUÉS de la bienvenida (antes saltaban los
 * dos a la vez en el primer login por invite).
 */
export const WELCOME_CLOSED_EVENT = "qm:league-welcome-closed";

/**
 * Popup de bienvenida tras unirse a una quiniela por invite link
 * (`/dashboard?welcome=1`). Confirma al usuario que el proceso terminó
 * bien y en QUÉ liga está — sin esto, quien entraba por invitación
 * aterrizaba en el dashboard sin ninguna señal de que ya era miembro.
 * Al cerrarlo, limpia el query param para que un refresh no lo reabra.
 */
export function LeagueWelcomeDialog({
  leagueName,
  logoUrl,
  variant = "joined",
}: {
  leagueName: string;
  logoUrl: string | null;
  /** "joined" → te has unido (invite); "created" → acabas de crearla. */
  variant?: "joined" | "created";
}) {
  const t = useTranslations("invite");
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function close() {
    setOpen(false);
    window.dispatchEvent(new Event(WELCOME_CLOSED_EVENT));
    router.replace("/dashboard");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="max-w-sm overflow-hidden border-[var(--color-arena)]/40 text-center">
        <div
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div className="relative flex flex-col items-center gap-4 pt-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="size-16 rounded-xl border border-[var(--color-border)] object-contain"
            />
          ) : (
            <span className="grid size-14 place-items-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
              <PartyPopper className="size-6" />
            </span>
          )}
          <div className="space-y-1">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
              {variant === "created" ? t("createdEyebrow") : t("welcomeEyebrow")}
            </p>
            <DialogTitle className="font-display text-3xl tracking-tight">
              {leagueName}
            </DialogTitle>
          </div>
          <DialogDescription className="font-editorial text-sm italic leading-relaxed text-[var(--color-muted-foreground)]">
            {variant === "created" ? t("createdBody") : t("welcomeBody")}
          </DialogDescription>
          <Button type="button" size="lg" className="mt-1 w-full" onClick={close}>
            {t("welcomeCta")}
            <ArrowRight />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
