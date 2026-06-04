"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeptCards, type DeptCardData } from "./dept-cards";
import { selfAssignDepartment } from "./actions";

const FALLBACK = "#ef5043";

/**
 * Vista de departamentos para el MIEMBRO (tab en /mi-quiniela):
 *  - Sin equipo → "Elige tu equipo": chips de cada dept con confirmación
 *    (la elección es única; después solo el admin puede moverle).
 *  - Con equipo → banner "Tu equipo" + nota de bloqueo.
 *  - Debajo, las mismas cards inmersivas del admin (sin gestión).
 */
export function MemberDepartmentsPanel({
  leagueId,
  myDeptId,
  cards,
}: {
  leagueId: number;
  myDeptId: number | null;
  cards: DeptCardData[];
}) {
  const t = useTranslations("departments");
  const router = useRouter();
  const [confirmDept, setConfirmDept] = useState<DeptCardData | null>(null);
  const [pending, startTransition] = useTransition();

  const myDept = myDeptId != null ? cards.find((c) => c.id === myDeptId) : null;

  function onConfirmJoin() {
    if (!confirmDept) return;
    const fd = new FormData();
    fd.append("leagueId", String(leagueId));
    fd.append("deptId", String(confirmDept.id));
    startTransition(async () => {
      const res = await selfAssignDepartment(fd);
      if (res.ok) {
        toast.success(t("joined", { name: confirmDept.name }));
        setConfirmDept(null);
        router.refresh();
      } else {
        toast.error(res.error ?? t("errorGeneric"));
      }
    });
  }

  return (
    <div className="space-y-6">
      {myDept ? (
        /* ── Ya tiene equipo: banner ── */
        <div
          className="flex items-center gap-4 rounded-2xl border p-5"
          style={{
            borderColor: `${myDept.color ?? FALLBACK}59`,
            background: `linear-gradient(150deg, ${myDept.color ?? FALLBACK}33, transparent 60%)`,
          }}
        >
          <span
            className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl leading-none"
            style={{
              backgroundColor: `${myDept.color ?? FALLBACK}2e`,
              border: `1px solid ${myDept.color ?? FALLBACK}66`,
            }}
          >
            {myDept.emoji ?? "🏷️"}
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-[var(--color-muted-foreground)]">
              {t("yourTeam")}
            </p>
            <p className="truncate font-display text-xl tracking-tight">{myDept.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
              <Lock className="size-3" />
              {t("lockedNote")}
            </p>
          </div>
        </div>
      ) : cards.length > 0 ? (
        /* ── Sin equipo: elegir ── */
        <section className="space-y-3 rounded-2xl border border-[var(--color-arena)]/35 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))] p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
              <UsersRound className="size-4" />
            </span>
            <div>
              <h3 className="font-display text-lg tracking-tight">{t("chooseTeamTitle")}</h3>
              <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                {t("chooseTeamDesc")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {cards.map((c) => {
              const accent = c.color ?? FALLBACK;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmDept(c)}
                  className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition hover:-translate-y-0.5 disabled:opacity-50"
                  style={{
                    borderColor: `${accent}66`,
                    backgroundColor: `${accent}1a`,
                  }}
                >
                  <span className="text-lg leading-none">{c.emoji ?? "🏷️"}</span>
                  {c.name}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Cards de todos los departamentos */}
      <DeptCards cards={cards} />

      {/* Confirmación de elección (única) */}
      {confirmDept ? (
        <Dialog open onOpenChange={(o) => !o && !pending && setConfirmDept(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {t("joinConfirmTitle", { name: confirmDept.name })}
              </DialogTitle>
              <DialogDescription>{t("joinConfirmBody")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmDept(null)}
              >
                {t("cancel")}
              </Button>
              <Button type="button" disabled={pending} onClick={onConfirmJoin}>
                {confirmDept.emoji ? `${confirmDept.emoji} ` : ""}
                {pending ? t("joining") : t("joinCta")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
