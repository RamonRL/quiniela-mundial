"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, ChevronsLeft, ImageUp, Info, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LogoCropDialog, type CropLabels } from "@/components/leagues/logo-crop-dialog";
import {
  uploadLeagueSquareLogo,
  uploadLeagueBrandLogo,
  removeLeagueBrandLogo,
} from "@/lib/league-actions";

const MAX_RAW_INPUT_BYTES = 20 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp";

type Kind = "square" | "brand";

export function LeagueBrandingPanel({
  leagueId,
  initialLogoUrl,
  initialBrandUrl,
}: {
  leagueId: number;
  initialLogoUrl: string | null;
  initialBrandUrl: string | null;
}) {
  const t = useTranslations("branding");
  const router = useRouter();
  const [squareUrl, setSquareUrl] = useState(initialLogoUrl);
  const [brandUrl, setBrandUrl] = useState(initialBrandUrl);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropKind, setCropKind] = useState<Kind | null>(null);
  const [pending, setPending] = useState(false);

  const squareInput = useRef<HTMLInputElement>(null);
  const brandInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  function pickFile(file: File | undefined, kind: Kind) {
    if (!file) return;
    if (file.size > MAX_RAW_INPUT_BYTES) {
      toast.error(t("tooBig"));
      return;
    }
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    setCropKind(kind);
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropKind(null);
    if (squareInput.current) squareInput.current.value = "";
    if (brandInput.current) brandInput.current.value = "";
  }

  async function onCropConfirm(file: File) {
    if (!cropKind) return;
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("id", String(leagueId));
      fd.set("logo", file);
      const res =
        cropKind === "square"
          ? await uploadLeagueSquareLogo(fd)
          : await uploadLeagueBrandLogo(fd);
      if (res.ok && res.url) {
        // res.url ya viene versionada (?v=…) desde la action → sin doble busting.
        if (cropKind === "square") {
          setSquareUrl(res.url);
          toast.success(t("logoUpdated"));
        } else {
          setBrandUrl(res.url);
          toast.success(t("brandUpdated"));
        }
        closeCrop();
        // Refresca los server components (layout) → el logo del shell se
        // actualiza al instante, sin navegar ni hard refresh.
        router.refresh();
      } else {
        toast.error(res.error ?? t("uploadError"));
      }
    } finally {
      setPending(false);
    }
  }

  async function onRemoveBrand() {
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("id", String(leagueId));
      const res = await removeLeagueBrandLogo(fd);
      if (res.ok) {
        setBrandUrl(null);
        toast.success(t("brandRemoved"));
        router.refresh();
      } else {
        toast.error(res.error ?? t("uploadError"));
      }
    } finally {
      setPending(false);
    }
  }

  const cropLabels: CropLabels = {
    title: cropKind === "brand" ? t("cropBrandTitle") : t("cropSquareTitle"),
    cancel: t("cropCancel"),
    done: t("cropDone"),
    saving: t("cropSaving"),
    dragHint: t("cropDragHint"),
    aspectLabel: t("cropAspectLabel"),
  };

  return (
    <div className="space-y-8">
      {/* ───────── Sección 1: logo cuadrado ───────── */}
      <section className="space-y-3">
        <div>
          <h3 className="font-display text-base tracking-tight">{t("squareTitle")}</h3>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("squareDesc")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => squareInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files?.[0], "square");
            }}
            className="group relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)] transition hover:border-[var(--color-arena)]"
            aria-label={t("squareCta")}
          >
            {squareUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={squareUrl} alt="" className="size-full object-cover" />
            ) : (
              <ImageUp className="size-7 text-[var(--color-muted-foreground)]" />
            )}
            <span className="absolute inset-0 hidden place-items-center bg-black/45 text-white group-hover:grid">
              <UploadCloud className="size-6" />
            </span>
          </button>
          <div className="space-y-2">
            <Button type="button" variant="outline" size="sm" onClick={() => squareInput.current?.click()}>
              <ImageUp className="size-3.5" />
              {squareUrl ? t("changeCta") : t("squareCta")}
            </Button>
            <p className="max-w-xs font-editorial text-xs italic leading-snug text-[var(--color-muted-foreground)]">
              {t("squareHint")}
            </p>
          </div>
        </div>
        <input
          ref={squareInput}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => pickFile(e.target.files?.[0], "square")}
        />
      </section>

      <hr className="border-[var(--color-border)]" />

      {/* ───────── Sección 2: marca principal ───────── */}
      <section className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 font-display text-base tracking-tight">
            <Building2 className="size-4 text-[var(--color-arena)]" />
            {t("brandTitle")}
          </h3>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("brandDesc")}
          </p>
        </div>

        {/* recomendación fondo transparente */}
        <p className="flex items-start gap-2 rounded-md border border-[var(--color-arena)]/25 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-2.5 text-xs leading-snug text-[var(--color-muted-foreground)]">
          <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--color-arena)]" />
          <span>{t("transparentTip")}</span>
        </p>

        {/* dropzone marca */}
        <button
          type="button"
          onClick={() => brandInput.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files?.[0], "brand");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-4 py-5 text-sm text-[var(--color-muted-foreground)] transition hover:border-[var(--color-arena)] hover:text-[var(--color-foreground)]"
        >
          <UploadCloud className="size-4" />
          {brandUrl ? t("changeBrandCta") : t("brandCta")}
        </button>
        <input
          ref={brandInput}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => pickFile(e.target.files?.[0], "brand")}
        />

        {/* ── Previews de cómo queda en el shell ── */}
        <div className="space-y-3">
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-[var(--color-muted-foreground)]">
            {t("previewLabel")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* PC: recuadro superior izquierdo de la sidebar */}
            <div className="space-y-1.5">
              <p className="font-mono text-[0.5rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                {t("previewPc")}
              </p>
              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
                <div className="flex min-w-0 flex-1 items-center">
                  {brandUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brandUrl} alt="" className="h-10 w-auto max-w-[12rem] object-contain" />
                  ) : (
                    <BrandPlaceholder />
                  )}
                </div>
                <span className="grid size-8 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]">
                  <ChevronsLeft className="size-4" />
                </span>
              </div>
            </div>

            {/* Móvil: barra superior */}
            <div className="space-y-1.5">
              <p className="font-mono text-[0.5rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                {t("previewMobile")}
              </p>
              <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
                  {brandUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brandUrl} alt="" className="h-8 w-auto max-w-[8rem] object-contain" />
                  ) : (
                    <BrandPlaceholder />
                  )}
                </div>
                <div className="h-10 bg-[var(--color-surface-2)]" aria-hidden />
              </div>
            </div>
          </div>

          {brandUrl ? (
            <button
              type="button"
              onClick={onRemoveBrand}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition hover:text-[var(--color-danger)] disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              {t("removeBrand")}
            </button>
          ) : null}
        </div>
      </section>

      <LogoCropDialog
        open={cropSrc != null}
        sourceUrl={cropSrc}
        onCancel={closeCrop}
        onConfirm={onCropConfirm}
        pending={pending}
        shape={cropKind === "brand" ? "rect" : "round"}
        aspect={1}
        aspectRange={cropKind === "brand" ? { min: 2, max: 4.5 } : undefined}
        labels={cropLabels}
      />
    </div>
  );
}

function BrandPlaceholder() {
  return (
    <Image
      src="/hlogo.png"
      alt="Quiniela Mundial"
      width={1919}
      height={660}
      className="h-9 w-auto opacity-50 dark:opacity-100"
    />
  );
}
