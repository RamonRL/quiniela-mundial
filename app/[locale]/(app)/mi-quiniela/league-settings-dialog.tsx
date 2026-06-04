"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Save, Settings, Trash2 } from "lucide-react";
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
import { LeagueLogoGalleryPicker } from "@/components/leagues/league-logo-gallery-picker";
import {
  updateLeague,
  deleteOwnLeague,
  type LeagueFormState,
} from "@/lib/league-actions";

const initial: LeagueFormState = { ok: false };

type Props = {
  league: { id: number; name: string; logoUrl: string | null; isPremium: boolean };
  memberCount: number;
};

/**
 * Diálogo único de "Ajustes" de la quiniela (solo owner). Reúne lo que antes
 * eran dos botones sueltos en la cabecera (Editar + Eliminar):
 *   - Cambio de nombre y logo (server action `updateLeague`).
 *   - Zona peligrosa, OCULTA hasta clicar, con la confirmación de escribir
 *     "ELIMINAR" (fricción deliberada, irreversible → `deleteOwnLeague`).
 * Así "Eliminar" deja de estar tan a la vista en la página.
 */
export function LeagueSettingsDialog({ league, memberCount }: Props) {
  const t = useTranslations("myPool");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateLeague, initial);
  const [name, setName] = useState(league.name);

  // Zona peligrosa (eliminar)
  const confirmWord = t("confirmWord");
  const [showDelete, setShowDelete] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [deleting, startDelete] = useTransition();
  const confirmable = confirmValue.trim().toUpperCase() === confirmWord;

  useEffect(() => {
    if (state.ok && open) {
      toast.success(state.message ?? t("leagueUpdated"));
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, state.message]);

  function onOpenChange(next: boolean) {
    if (pending || deleting) return;
    setOpen(next);
    if (!next) {
      setShowDelete(false);
      setConfirmValue("");
    }
  }

  function onConfirmDelete() {
    if (!confirmable) return;
    startDelete(async () => {
      const fd = new FormData();
      fd.set("id", String(league.id));
      // deleteOwnLeague redirige a /dashboard al terminar.
      await deleteOwnLeague(fd);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="size-3.5" />
          {t("settings")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("settingsTitle")}</DialogTitle>
          <DialogDescription>{t("settingsDesc")}</DialogDescription>
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

          {/* Logo: solo en no-premium. En premium se gestiona desde la tab
              BRANDING (logo cuadrado + marca con cropper). */}
          {!league.isPremium ? (
            <div className="space-y-1.5">
              <Label>{t("logoLabel")}</Label>
              <LeagueLogoGalleryPicker initialLogoUrl={league.logoUrl} />
            </div>
          ) : null}

          {state.error ? (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              <Save />
              {pending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>

        {/* ── Zona peligrosa: oculta hasta clicar ── */}
        <div className="mt-1 border-t border-[var(--color-border)] pt-4">
          {!showDelete ? (
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition hover:text-[var(--color-danger)]"
            >
              <Trash2 className="size-3.5" />
              {t("deleteBtn")}
            </button>
          ) : (
            <div className="space-y-3 rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4">
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-danger)]">
                {t("dangerZone")}
              </p>
              <p className="font-editorial text-xs italic leading-relaxed text-[var(--color-muted-foreground)]">
                {t.rich("deleteDesc", {
                  count: memberCount,
                  b: (chunks) => <strong className="font-semibold not-italic">{chunks}</strong>,
                })}
              </p>
              <Label htmlFor="delete-confirm" className="text-sm">
                {t.rich("deleteTypePrompt", {
                  word: confirmWord,
                  w: (chunks) => (
                    <span className="font-mono font-semibold text-[var(--color-danger)]">
                      {chunks}
                    </span>
                  ),
                })}
              </Label>
              <Input
                id="delete-confirm"
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                placeholder={confirmWord}
                disabled={deleting}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && confirmable) {
                    e.preventDefault();
                    onConfirmDelete();
                  }
                }}
                className="font-mono tracking-[0.18em]"
              />
              <Button
                type="button"
                onClick={onConfirmDelete}
                disabled={!confirmable || deleting}
                className="w-full bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90"
              >
                <Trash2 className="size-4" />
                {deleting ? t("deleting") : t("deleteConfirmBtn")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
