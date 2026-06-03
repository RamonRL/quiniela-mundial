"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kickFromOwnLeague, leaveLeague } from "@/lib/league-actions";
import { toast } from "sonner";

type Props = {
  leagueId: number;
  leagueName: string;
};

/**
 * Botón "Abandonar" — para los miembros que no son el creador. El creador
 * usa DeleteButton (eliminar la quiniela entera) en su lugar.
 */
export function LeaveButton({ leagueId, leagueName }: Props) {
  const t = useTranslations("myPool");
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(t("leaveConfirm", { name: leagueName }))) return;
        start(async () => {
          const fd = new FormData();
          fd.set("leagueId", String(leagueId));
          const res = await leaveLeague(fd);
          if (res.ok) toast.success(res.message ?? t("leftLeague"));
          else toast.error(res.error ?? t("leaveFailed"));
        });
      }}
    >
      {pending ? t("leaving") : t("leaveBtn")}
    </Button>
  );
}

type KickProps = {
  userId: string;
  userLabel: string;
  leagueId: number;
};

/**
 * Botón "Quitar" para que el creador expulse a un miembro. Mismo patrón
 * que DeleteButton (transition + confirm) pero con copy específico.
 */
export function KickButton({ userId, userLabel, leagueId }: KickProps) {
  const t = useTranslations("myPool");
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={t("kickAria", { name: userLabel })}
      title={t("kickAria", { name: userLabel })}
      onClick={() => {
        if (!confirm(t("kickConfirm", { name: userLabel }))) return;
        start(async () => {
          const fd = new FormData();
          fd.set("userId", userId);
          fd.set("leagueId", String(leagueId));
          await kickFromOwnLeague(fd);
        });
      }}
    >
      <UserMinus className="size-4" />
    </Button>
  );
}
