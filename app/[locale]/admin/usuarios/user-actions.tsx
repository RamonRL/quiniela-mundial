"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ImageOff, ImageUp, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarCropDialog } from "@/components/profile/avatar-crop-dialog";
import { clearUserAvatar, deleteUser, setUserAvatar, setUserBanned, setUserRole } from "./actions";

const MAX_RAW_INPUT_BYTES = 20 * 1024 * 1024;

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
  const [uploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  function pickFile(file: File) {
    if (file.size > MAX_RAW_INPUT_BYTES) {
      toast.error("La imagen es demasiado grande (máx. 20 MB).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSource((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setCropOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeCrop() {
    setCropOpen(false);
    if (cropSource) {
      URL.revokeObjectURL(cropSource);
      setCropSource(null);
    }
  }

  function onCropConfirm(file: File): Promise<void> {
    return new Promise((resolve) => {
      startUpload(async () => {
        const fd = new FormData();
        fd.set("userId", userId);
        fd.append("avatar", file);
        const res = await setUserAvatar(fd);
        if (res.ok) {
          toast.success(`Foto actualizada para ${displayName}.`);
          closeCrop();
        } else {
          toast.error(res.error ?? "No se pudo subir la foto.");
        }
        resolve();
      });
    });
  }

  function removePhoto() {
    if (!confirm(`¿Quitar la foto de ${displayName}? Volverá a mostrar sus iniciales.`)) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      const res = await clearUserAvatar(fd);
      if (res.ok) toast.success("Foto quitada.");
      else toast.error(res.error ?? "No se pudo quitar la foto.");
    });
  }

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
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickFile(f);
        }}
      />
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={pending || uploading}>
          {pending || uploading ? "..." : "Acciones"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
          <ImageUp className="size-4" />
          Cambiar foto
        </DropdownMenuItem>
        <DropdownMenuItem onClick={removePhoto}>
          <ImageOff className="size-4" />
          Quitar foto
        </DropdownMenuItem>
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

      <AvatarCropDialog
        open={cropOpen}
        sourceUrl={cropSource}
        onCancel={closeCrop}
        onConfirm={onCropConfirm}
        pending={uploading}
      />
    </>
  );
}
