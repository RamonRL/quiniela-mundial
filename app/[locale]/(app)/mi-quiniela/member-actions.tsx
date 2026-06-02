"use client";

import { useTransition } from "react";
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
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `¿Abandonar "${leagueName}"? Pasarás a tener la Quiniela Pública como activa. Podrás volver a unirte con el código si te lo comparten.`,
          )
        )
          return;
        start(async () => {
          const fd = new FormData();
          fd.set("leagueId", String(leagueId));
          const res = await leaveLeague(fd);
          if (res.ok) toast.success(res.message ?? "Has abandonado la quiniela.");
          else toast.error(res.error ?? "No se pudo abandonar.");
        });
      }}
    >
      {pending ? "Saliendo…" : "Abandonar quiniela"}
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
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={`Quitar a ${userLabel}`}
      title={`Quitar a ${userLabel}`}
      onClick={() => {
        if (
          !confirm(
            `¿Quitar a ${userLabel} de la quiniela? Sus puntos en esta liga se quedan, pero deja de ser miembro.`,
          )
        )
          return;
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
