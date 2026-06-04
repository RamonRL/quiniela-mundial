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
  uploadLeagueBrandLightLogo,
  removeLeagueBrandLogo,
  removeLeagueBrandLightLogo,
} from "@/lib/league-actions";

const MAX_RAW_INPUT_BYTES = 20 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp";

type Kind = "square" | "brand" | "brandLight";

export function LeagueBrandingPanel({
  leagueId,
  initialLogoUrl,
  initialBrandUrl,
  initialBrandLightUrl,
}: {
  leagueId: number;
  initialLogoUrl: string | null;
  initialBrandUrl: string | null;
  initialBrandLightUrl: string | null;
}) {
  const t = useTranslations("branding");
  const router = useRouter();
  const [squareUrl, setSquareUrl] = useState(initialLogoUrl);
  const [brandUrl, setBrandUrl] = useState(initialBrandUrl);
  const [brandLightUrl, setBrandLightUrl] = useState(initialBrandLightUrl);
  const [dualTheme, setDualTheme] = useState(!!initialBrandLightUrl);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropKind, setCropKind] = useState<Kind | null>(null);
  const [pending, setPending] = useState(false);

  const squareInput = useRef<HTMLInputElement>(null);
  const brandInput = useRef<HTMLInputElement>(null);
  const brandLightInput = useRef<HTMLInputElement>(null);

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
    if (brandLightInput.current) brandLightInput.current.value = "";
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
          : cropKind === "brand"
            ? await uploadLeagueBrandLogo(fd)
            : await uploadLeagueBrandLightLogo(fd);
      if (res.ok && res.url) {
        // res.url ya viene versionada (?v=…) desde la action → caché invalidada.
        if (cropKind === "square") {
          setSquareUrl(res.url);
          toast.success(t("logoUpdated"));
        } else if (cropKind === "brand") {
          setBrandUrl(res.url);
          toast.success(t("brandUpdated"));
        } else {
          setBrandLightUrl(res.url);
          toast.success(t("lightBrandUpdated"));
        }
        closeCrop();
        // Refresca los server components (layout) → el shell se actualiza ya.
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
        setBrandLightUrl(null);
        setDualTheme(false);
        toast.success(t("brandRemoved"));
        router.refresh();
      } else {
        toast.error(res.error ?? t("uploadError"));
      }
    } finally {
      setPending(false);
    }
  }

  async function onToggleDualTheme(next: boolean) {
    // Desactivar con variante clara subida → la eliminamos (vuelve a usarse la
    // marca única en ambos temas).
    if (!next && brandLightUrl) {
      setPending(true);
      try {
        const fd = new FormData();
        fd.set("id", String(leagueId));
        const res = await removeLeagueBrandLightLogo(fd);
        if (!res.ok) {
          toast.error(res.error ?? t("uploadError"));
          return;
        }
        setBrandLightUrl(null);
        toast.success(t("lightBrandRemoved"));
        router.refresh();
      } finally {
        setPending(false);
      }
    }
    setDualTheme(next);
  }

  const cropLabels: CropLabels = {
    title: cropKind === "square" ? t("cropSquareTitle") : t("cropBrandTitle"),
    cancel: t("cropCancel"),
    done: t("cropDone"),
    saving: t("cropSaving"),
    dragHint: t("cropDragHint"),
    aspectLabel: t("cropAspectLabel"),
  };

  // Qué imagen ve cada tema: el claro usa su variante si existe.
  const lightSrc = brandLightUrl ?? brandUrl;

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

        {/* dropzone marca (oscuro / única) */}
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

        {/* checkbox: imagen distinta por tema */}
        <label
          className={`flex items-center gap-2.5 text-sm ${
            brandUrl ? "cursor-pointer" : "cursor-not-allowed opacity-50"
          }`}
        >
          <input
            type="checkbox"
            checked={dualTheme}
            disabled={pending || !brandUrl}
            onChange={(e) => onToggleDualTheme(e.target.checked)}
            className="size-4 accent-[var(--color-arena)]"
          />
          <span>{t("dualTheme")}</span>
        </label>

        {/* dropzone variante TEMA CLARO (desplegado por el checkbox) */}
        {dualTheme ? (
          <>
            <button
              type="button"
              onClick={() => brandLightInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files?.[0], "brandLight");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--color-border-strong)] bg-white px-4 py-5 text-sm text-[#52525b] transition hover:border-[var(--color-arena)]"
            >
              <UploadCloud className="size-4" />
              {brandLightUrl ? t("changeLightBrandCta") : t("lightBrandCta")}
            </button>
            <input
              ref={brandLightInput}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => pickFile(e.target.files?.[0], "brandLight")}
            />
          </>
        ) : null}

        {/* ── Previews por TEMA de cómo queda en el shell ── */}
        <div className="space-y-4">
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-[var(--color-muted-foreground)]">
            {t("previewLabel")}
          </p>
          <ShellPreview
            theme="dark"
            themeLabel={t("themeDark")}
            pcLabel={t("previewPc")}
            mobileLabel={t("previewMobile")}
            src={brandUrl}
          />
          <ShellPreview
            theme="light"
            themeLabel={t("themeLight")}
            pcLabel={t("previewPc")}
            mobileLabel={t("previewMobile")}
            src={lightSrc}
          />

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
        shape={cropKind === "square" ? "round" : "rect"}
        aspect={1}
        aspectRange={
          cropKind === "brand" || cropKind === "brandLight"
            ? { min: 2, max: 4.5 }
            : undefined
        }
        labels={cropLabels}
      />
    </div>
  );
}

/**
 * Mock del shell (recuadro PC con flecha de plegar + barra móvil) con colores
 * FIJOS por tema — así el owner ve cómo queda su marca en oscuro Y en claro
 * sin cambiar el tema de la app.
 */
function ShellPreview({
  theme,
  themeLabel,
  pcLabel,
  mobileLabel,
  src,
}: {
  theme: "dark" | "light";
  themeLabel: string;
  pcLabel: string;
  mobileLabel: string;
  src: string | null;
}) {
  const isDark = theme === "dark";
  const frame = isDark ? "border-[#2a2a31] bg-[#101014]" : "border-[#e4e4e7] bg-white";
  const pill = isDark
    ? "border-[#2a2a31] bg-[#1b1b21] text-[#9a9aa3]"
    : "border-[#e4e4e7] bg-[#f4f4f5] text-[#52525b]";
  const strip = isDark ? "bg-[#17171c]" : "bg-[#fafafa]";
  const divider = isDark ? "border-[#2a2a31]" : "border-[#e4e4e7]";

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[0.5rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
        {themeLabel}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* PC: recuadro superior izquierdo de la sidebar */}
        <div className="space-y-1">
          <p className="font-mono text-[0.45rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
            {pcLabel}
          </p>
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-4 ${frame}`}>
            <div className="flex min-w-0 flex-1 items-center justify-center">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="h-10 w-auto max-w-[11rem] object-contain" />
              ) : (
                <QmPlaceholder theme={theme} />
              )}
            </div>
            <span className={`grid size-8 shrink-0 place-items-center rounded-md border ${pill}`}>
              <ChevronsLeft className="size-4" />
            </span>
          </div>
        </div>

        {/* Móvil: barra superior */}
        <div className="space-y-1">
          <p className="font-mono text-[0.45rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
            {mobileLabel}
          </p>
          <div className={`overflow-hidden rounded-lg border ${frame}`}>
            <div className={`flex items-center gap-2 border-b px-3 py-2.5 ${divider}`}>
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="h-8 w-auto max-w-[6.5rem] object-contain" />
              ) : (
                <QmPlaceholder theme={theme} />
              )}
            </div>
            <div className={`h-10 ${strip}`} aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}

function QmPlaceholder({ theme }: { theme: "dark" | "light" }) {
  return (
    <Image
      src={theme === "dark" ? "/hlogo.png" : "/hlogo-light.png"}
      alt="Quiniela Mundial"
      width={1919}
      height={660}
      className="h-8 w-auto"
    />
  );
}
