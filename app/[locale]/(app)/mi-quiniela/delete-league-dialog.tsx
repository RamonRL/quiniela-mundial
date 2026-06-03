"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteOwnLeague } from "@/lib/league-actions";

/**
 * Eliminar quiniela (solo el creador). En vez de un confirm() del navegador,
 * abre un modal con el estilo de la web donde el usuario debe escribir
 * "ELIMINAR" para confirmar — fricción deliberada por ser irreversible.
 */
export function DeleteLeagueDialog({
  leagueId,
  leagueName,
  memberCount,
}: {
  leagueId: number;
  leagueName: string;
  memberCount: number;
}) {
  const t = useTranslations("myPool");
  const confirmWord = t("confirmWord");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();

  const confirmable = value.trim().toUpperCase() === confirmWord;

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) setValue("");
  }

  function onConfirm() {
    if (!confirmable) return;
    start(async () => {
      const fd = new FormData();
      fd.set("id", String(leagueId));
      // deleteOwnLeague redirige a /dashboard al terminar (navega fuera).
      await deleteOwnLeague(fd);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 hover:text-[var(--color-danger)]"
        >
          <Trash2 className="size-4" />
          <span>{t("deleteBtn")}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]">
            <TriangleAlert className="size-5" />
          </div>
          <DialogTitle>{t("deleteTitle", { name: leagueName })}</DialogTitle>
          <DialogDescription>
            {t.rich("deleteDesc", {
              count: memberCount,
              b: (chunks) => <strong className="font-semibold">{chunks}</strong>,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
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
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder={confirmWord}
            disabled={pending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && confirmable) {
                e.preventDefault();
                onConfirm();
              }
            }}
            className="font-mono tracking-[0.18em]"
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={pending}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={!confirmable || pending}
            className="bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90"
          >
            <Trash2 className="size-4" />
            {pending ? t("deleting") : t("deleteConfirmBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
