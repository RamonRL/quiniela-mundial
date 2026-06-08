"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ImageOff, ImageUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { AvatarCropDialog } from "@/components/profile/avatar-crop-dialog";
import { initials } from "@/lib/utils";
import { clearUserAvatar, setUserAvatar, setUserNickname } from "../usuarios/actions";

const MAX_RAW_INPUT_BYTES = 20 * 1024 * 1024;

export function RellenoRow({
  userId,
  nickname,
  avatarUrl,
  leagueName,
}: {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  leagueName: string | null;
}) {
  const [name, setName] = useState(nickname);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [savingName, startName] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [busy, startBusy] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const nameDirty = name.trim() !== nickname && name.trim().length > 0;

  function saveName() {
    if (!nameDirty) return;
    startName(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("nickname", name.trim());
      const res = await setUserNickname(fd);
      if (res.ok) toast.success("Apodo actualizado.");
      else toast.error(res.error ?? "No se pudo guardar el apodo.");
    });
  }

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
        if (res.ok && res.avatarUrl) {
          setPreview(`${res.avatarUrl}?t=${Date.now()}`);
          toast.success("Foto actualizada.");
          closeCrop();
        } else {
          toast.error(res.error ?? "No se pudo subir la foto.");
        }
        resolve();
      });
    });
  }

  function removePhoto() {
    startBusy(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      const res = await clearUserAvatar(fd);
      if (res.ok) {
        setPreview(null);
        toast.success("Foto quitada.");
      } else {
        toast.error(res.error ?? "No se pudo quitar la foto.");
      }
    });
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <Avatar className="size-10 border border-[var(--color-border)]">
            {preview ? <AvatarImage src={preview} alt="" /> : null}
            <AvatarFallback>{initials(name || "?")}</AvatarFallback>
          </Avatar>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
              }}
              maxLength={40}
              className="h-9 max-w-52"
              aria-label="Apodo"
            />
            <Button
              type="button"
              size="sm"
              variant={nameDirty ? "default" : "outline"}
              disabled={!nameDirty || savingName}
              onClick={saveName}
            >
              <Check className="size-3.5" />
              Guardar
            </Button>
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {leagueName ?? "—"}
          </span>
        </TableCell>
        <TableCell className="text-right">
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
          <div className="inline-flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageUp className="size-3.5" />
              Foto
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy || !preview}
              onClick={removePhoto}
              aria-label="Quitar foto"
            >
              <ImageOff className="size-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

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
