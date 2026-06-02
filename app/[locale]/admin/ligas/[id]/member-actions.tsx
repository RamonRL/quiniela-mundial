"use client";

import { useTransition } from "react";
import { ArrowRightLeft, LogOut, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  hardDeleteUser,
  moveUserToLeague,
  removeMembership,
} from "@/lib/league-actions";

type LeagueLite = { id: number; name: string; isPublic: boolean };

export function MemberActions({
  userId,
  userLabel,
  userEmail,
  isAdmin,
  currentLeagueId,
  currentLeagueIsPublic,
  otherLeagues,
}: {
  userId: string;
  userLabel: string;
  userEmail: string;
  isAdmin: boolean;
  currentLeagueId: number;
  currentLeagueIsPublic: boolean;
  otherLeagues: LeagueLite[];
}) {
  const [pending, start] = useTransition();

  function add(targetLeagueId: number, leagueName: string) {
    if (
      !window.confirm(
        `Vas a inscribir a "${userLabel}" en "${leagueName}". Aparecerá también en su ranking y será su liga activa. ¿Seguir?`,
      )
    )
      return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("leagueId", targetLeagueId.toString());
      try {
        await moveUserToLeague(fd);
        toast.success(`Inscrito en "${leagueName}".`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo inscribir.");
      }
    });
  }

  function kick() {
    if (
      !window.confirm(
        `Vas a quitar a "${userLabel}" de esta liga. Sus predicciones y puntos NO se borran, pero deja de aparecer en el ranking de aquí. ¿Seguir?`,
      )
    )
      return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("leagueId", currentLeagueId.toString());
      try {
        await removeMembership(fd);
        toast.success(`${userLabel} fuera de esta liga.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo quitar.");
      }
    });
  }

  function remove() {
    if (
      !window.confirm(
        `Vas a ELIMINAR a "${userLabel}" (${userEmail}) por completo:\n\n` +
          "• Se borran todas sus predicciones y puntos.\n" +
          "• Se borra su perfil y sus mensajes.\n" +
          "• Se invalida su sesión: tendrá que hacer login otra vez.\n\n" +
          "Esto NO se puede deshacer. ¿Confirmas?",
      )
    )
      return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      try {
        await hardDeleteUser(fd);
        toast.success(`${userLabel} eliminado.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo eliminar.");
      }
    });
  }

  if (isAdmin) {
    // Sobre el propio admin no exponemos acciones destructivas — nadie debería
    // borrarse a sí mismo desde aquí. La acción `hardDeleteUser` además
    // refusa borrar al admin actual.
    return (
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        admin
      </span>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            aria-label={`Acciones para ${userLabel}`}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{userLabel}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowRightLeft className="mr-2 size-3.5" />
              Inscribir en otra liga
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {otherLeagues.length === 0 ? (
                <DropdownMenuItem disabled>
                  No hay otras ligas
                </DropdownMenuItem>
              ) : (
                otherLeagues.map((l) => (
                  <DropdownMenuItem
                    key={l.id}
                    onClick={() => add(l.id, l.name)}
                  >
                    <span className="flex-1 truncate">{l.name}</span>
                    {l.isPublic ? (
                      <span className="ml-2 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        pública
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {!currentLeagueIsPublic ? (
            <DropdownMenuItem onClick={kick}>
              <LogOut className="mr-2 size-3.5" />
              Quitar de esta liga
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={remove}
            className="text-[var(--color-danger)] focus:text-[var(--color-danger)]"
          >
            <Trash2 className="mr-2 size-3.5" />
            Eliminar usuario
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
