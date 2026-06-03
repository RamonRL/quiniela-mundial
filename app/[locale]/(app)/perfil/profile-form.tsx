"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarCropDialog } from "@/components/profile/avatar-crop-dialog";
import { initials } from "@/lib/utils";
import { formatBytes } from "@/lib/client-image";
import { updateNickname, uploadAvatar, type FormState } from "./actions";

const initial: FormState = { ok: false };

/**
 * Tope absoluto del archivo crudo que el usuario elige (antes de recortar).
 * Lo subimos a 20 MB para aceptar cualquier foto de móvil moderna; tras el
 * crop sale un JPEG ~100-200 KB.
 */
const MAX_RAW_INPUT_BYTES = 20 * 1024 * 1024;

export function ProfileForm({
  email,
  nickname,
  avatarUrl,
}: {
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
}) {
  const t = useTranslations("profile");
  const [nicknameState, nicknameAction, nicknamePending] = useActionState(
    updateNickname,
    initial,
  );
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [uploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const display = nickname || email.split("@")[0];

  // Limpieza de la object URL del crop dialog al desmontar / cambiar.
  useEffect(() => {
    return () => {
      if (cropSource) URL.revokeObjectURL(cropSource);
    };
  }, [cropSource]);

  function pickFile(file: File) {
    setError(null);
    if (file.size > MAX_RAW_INPUT_BYTES) {
      setError(t("imageTooBig", { size: formatBytes(file.size) }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    // Abrir el dialog con la imagen como object URL.
    const url = URL.createObjectURL(file);
    setCropSource((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setCropOpen(true);
    // Reset del input para que volver a elegir la misma foto vuelva a disparar el onChange.
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
        fd.append("avatar", file);
        const res = await uploadAvatar(fd);
        if (res.ok && res.avatarUrl) {
          // Bust cache añadiendo timestamp porque el URL del Storage es estable.
          setPreview(`${res.avatarUrl}?t=${Date.now()}`);
          toast.success(t("photoUpdated"));
          closeCrop();
        } else {
          toast.error(res.error ?? t("photoError"));
        }
        resolve();
      });
    });
  }

  return (
    <>
      <form action={nicknameAction} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("identity")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* ─── Avatar como dropzone clickable ─── */}
            <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) pickFile(file);
                }}
                aria-label={t("changeAvatar")}
                disabled={uploading}
                className="group relative mx-auto size-32 shrink-0 sm:mx-0"
              >
                <Avatar className="size-32 border-2 border-[var(--color-border-strong)] shadow-[var(--shadow-elev-1)] transition-all group-hover:border-[var(--color-arena)] group-hover:shadow-[var(--shadow-arena)]">
                  {preview ? <AvatarImage src={preview} alt={display} /> : null}
                  <AvatarFallback className="font-display text-4xl tracking-tight">
                    {initials(display)}
                  </AvatarFallback>
                </Avatar>
                {/* Overlay: spinner mientras sube, cámara al hover */}
                <span
                  aria-hidden
                  className={`absolute inset-0 grid place-items-center rounded-full bg-black/55 transition-opacity ${
                    uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <span className="flex flex-col items-center gap-1 text-white">
                    {uploading ? (
                      <Loader2 className="size-6 animate-spin" />
                    ) : (
                      <Camera className="size-6" />
                    )}
                    <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em]">
                      {uploading ? t("uploading") : t("change")}
                    </span>
                  </span>
                </span>
                <span className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)] ring-4 ring-[var(--color-surface)]">
                  <Camera className="size-4" />
                </span>
              </button>

              <div className="space-y-1.5 text-center sm:text-left">
                <p className="font-display text-2xl tracking-tight sm:text-3xl">
                  {display}
                </p>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                  {email}
                </p>
                <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                  {t("dropHint")}
                  <br />
                  <span className="font-mono not-italic uppercase tracking-[0.18em]">
                    {t("dropHint2")}
                  </span>
                </p>
                {error ? (
                  <p className="text-xs text-[var(--color-danger)]">{error}</p>
                ) : null}
              </div>

              <input
                ref={fileInputRef}
                id="avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickFile(f);
                }}
              />
            </div>

            {/* ─── Apodo · underline minimal ─── */}
            <label className="group block space-y-2">
              <span className="block font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] transition-colors group-focus-within:text-[var(--color-arena)]">
                {t("nickname")}
              </span>
              <input
                id="nickname"
                name="nickname"
                defaultValue={nickname ?? ""}
                maxLength={40}
                placeholder={email.split("@")[0]}
                className="w-full border-0 border-b-2 border-[var(--color-border)] bg-transparent px-0 pb-2 pt-1 font-display text-2xl tracking-tight text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-muted-foreground)]/50 focus:border-[var(--color-arena)] sm:text-3xl"
              />
              <span className="block font-editorial text-xs italic text-[var(--color-muted-foreground)]">
                {t("nicknameHint")}
              </span>
            </label>
          </CardContent>
        </Card>

        {nicknameState.error ? (
          <p className="text-sm text-[var(--color-danger)]">{nicknameState.error}</p>
        ) : null}
        {nicknameState.ok ? (
          <p className="text-sm text-[var(--color-success)]">{t("nicknameUpdated")}</p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={nicknamePending}>
            <Save />
            {nicknamePending ? t("saving") : t("saveNickname")}
          </Button>
        </div>
      </form>

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
