"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteUser, setUserBanned, setUserRole } from "./actions";

type Props = {
  userId: string;
  role: "user" | "admin";
  banned: boolean;
  displayName: string;
  /** Si es la propia cuenta del admin: se oculta "Eliminar". */
  isSelf: boolean;
};

export function UserActions({ userId, role, banned, displayName, isSelf }: Props) {
  const [pending, start] = useTransition();

  function toggleBan() {
    const next = !banned;
    if (
      !confirm(
        next
          ? `¿Suspender a ${displayName}? No podrá entrar ni escribir mensajes.`
          : `¿Reactivar a ${displayName}? Podrá entrar de nuevo.`,
      )
    )
      return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("banned", next ? "1" : "0");
      await setUserBanned(fd);
    });
  }

  function changeRole(newRole: "user" | "admin") {
    if (newRole === role) return;
    if (
      !confirm(
        newRole === "admin"
          ? `¿Hacer admin a ${displayName}? Tendrá acceso a /admin.`
          : `¿Quitar admin a ${displayName}?`,
      )
    )
      return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("role", newRole);
      await setUserRole(fd);
    });
  }

  function removeUser() {
    if (
      !confirm(
        `¿ELIMINAR a ${displayName}? Esta acción es irreversible:\n\n` +
          `· Se borra su cuenta y todas sus predicciones.\n` +
          `· Se le saca de todas sus quinielas.\n` +
          `· Se borran las quinielas privadas en las que sea el único miembro.`,
      )
    )
      return;
    if (!confirm(`Confirma de nuevo: eliminar a ${displayName} no tiene vuelta atrás.`)) {
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      const res = await deleteUser(fd);
      if (res.ok) {
        toast.success(res.message ?? "Usuario eliminado.");
      } else {
        toast.error(res.error ?? "No se pudo eliminar.");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={pending}>
          {pending ? "..." : "Acciones"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {banned ? (
          <DropdownMenuItem onClick={toggleBan}>
            <UserCheck className="size-4" />
            Reactivar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={toggleBan}>
            <UserX className="size-4" />
            Suspender
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {role === "user" ? (
          <DropdownMenuItem onClick={() => changeRole("admin")}>
            <ShieldCheck className="size-4" />
            Hacer admin
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => changeRole("user")}>
            <ShieldOff className="size-4" />
            Quitar admin
          </DropdownMenuItem>
        )}
        {isSelf ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={removeUser}
              className="text-[var(--color-danger)] focus:text-[var(--color-danger)]"
            >
              <Trash2 className="size-4" />
              Eliminar usuario
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
