"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LeagueLogoDropzone } from "@/components/leagues/league-logo-dropzone";
import { LeagueLogoGalleryPicker } from "@/components/leagues/league-logo-gallery-picker";
import { updateLeague, type LeagueFormState } from "@/lib/league-actions";

const initial: LeagueFormState = { ok: false };

type Props = {
  league: {
    id: number;
    name: string;
    logoUrl: string | null;
    isPremium: boolean;
  };
};

/**
 * Form de edición de una quiniela privada. Solo se renderiza desde
 * /mi-quiniela cuando `isOwner === true`. Cambia el nombre y/o el
 * logo (dropzone con compresión silent vía LeagueLogoDropzone).
 *
 * El botón Guardar queda disabled si el form está pendiente o si
 * `compressing` está en true — la versión optimizada del logo aún
 * no ha llegado al <input file>.
 */
/**
 * Dialog modal de edición de la quiniela. Se invoca desde un botón
 * sutil "Editar" en /mi-quiniela en lugar de ocupar un bloque entero
 * de la página. El form vive en un trigger + content controlado para
 * que tras un guardado exitoso se cierre y muestre toast.
 */
export function EditLeagueDialog({ league }: Props) {
  const t = useTranslations("myPool");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateLeague, initial);
  const [name, setName] = useState(league.name);
  const [logoBusy, setLogoBusy] = useState(false);

  // Cuando el server action confirma OK, cerramos el dialog y
  // notificamos. Lo hacemos en un efecto para evitar setState en
  // render y para que el flash de éxito no se quede atrapado.
  useEffect(() => {
    if (state.ok && open) {
      toast.success(state.message ?? t("leagueUpdated"));
      setOpen(false);
    }
    // state cambia al haber respuesta — depender solo de su contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, state.message]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-3.5" />
          {t("edit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>
            {t("editDesc")}
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-5">
          <input type="hidden" name="id" value={league.id} />

          <div className="space-y-1.5">
            <Label htmlFor="league-name">{t("nameLabel")}</Label>
            <Input
              id="league-name"
              name="name"
              required
              maxLength={25}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("logoLabel")}</Label>
            <LeagueLogoGalleryPicker initialLogoUrl={league.logoUrl} />
          </div>

          {league.isPremium ? (
            <div className="rounded-md border border-[var(--color-border)] p-3">
              <div className="pb-2 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
                {t("customLogo")}
              </div>
              <div className="flex items-center gap-3">
                <LeagueLogoDropzone
                  initialLogoUrl={league.logoUrl}
                  fallbackName={name}
                  sizeClass="size-14 sm:size-16"
                  onCompressingChange={setLogoBusy}
                />
                <p className="font-editorial text-xs italic leading-snug text-[var(--color-muted-foreground)]">
                  {t("customLogoHint")}
                </p>
              </div>
            </div>
          ) : null}

          {state.error ? (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending || logoBusy}>
              <Save />
              {pending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
