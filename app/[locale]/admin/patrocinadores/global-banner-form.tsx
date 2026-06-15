"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteGlobalBanner, saveGlobalBanner } from "./actions";

type Current = {
  imageUrl: string;
  alt: string | null;
  linkUrl: string | null;
  enabled: boolean;
} | null;

/**
 * Banner de afiliado GLOBAL: se muestra en todas las quinielas (públicas y
 * privadas) que aún NO tienen patrocinador propio. Las que ya tienen el suyo
 * no lo ven.
 */
export function GlobalBannerForm({ current }: { current: Current }) {
  const [pending, start] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState(current?.alt ?? "");
  const [link, setLink] = useState(current?.linkUrl ?? "");
  const [enabled, setEnabled] = useState(current?.enabled ?? true);
  const fileRef = useRef<HTMLInputElement>(null);

  function save() {
    if (!current && !file) {
      toast.error("Sube una imagen para el banner.");
      return;
    }
    const fd = new FormData();
    fd.set("alt", alt);
    fd.set("link", link);
    if (enabled) fd.set("enabled", "on");
    if (file) fd.set("logo", file);
    start(async () => {
      const r = await saveGlobalBanner(fd);
      if (r.ok) {
        toast.success(r.message ?? "Guardado.");
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      } else {
        toast.error(r.error ?? "No se pudo guardar.");
      }
    });
  }

  function remove() {
    if (!window.confirm("¿Eliminar el banner de afiliado global?")) return;
    start(async () => {
      const r = await deleteGlobalBanner();
      if (r.ok) toast.success(r.message ?? "Eliminado.");
      else toast.error(r.error ?? "No se pudo eliminar.");
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-4">
      <div>
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-arena)]">
          Banner de afiliado global
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Se muestra en TODAS las quinielas (públicas y privadas) que aún no tengan
          patrocinador propio. Las que ya tienen el suyo no lo ven.
        </p>
      </div>

      {current ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- banner de aspecto variable */}
          <img
            src={current.imageUrl}
            alt={current.alt ?? "Banner global"}
            className="mx-auto block h-auto max-h-24 w-full max-w-2xl object-contain"
          />
          <p className="mt-2 text-center font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {current.enabled ? "Activo" : "Desactivado"}
            {current.linkUrl ? " · con enlace" : " · sin enlace"}
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-[var(--color-muted-foreground)]">
            {current ? "Reemplazar imagen (opcional)" : "Imagen del banner (PNG/JPG/WEBP/SVG, máx 2 MB)"}
          </span>
          <Input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[var(--color-muted-foreground)]">Nombre/alt (opcional)</span>
          <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Ej. Tienda X — afiliado" />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-[var(--color-muted-foreground)]">Enlace de afiliado</span>
        <Input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://… (tu enlace de afiliado)"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4 accent-[var(--color-arena)]"
        />
        <span>Activo (mostrar en las quinielas sin patrocinador)</span>
      </label>

      <div className="flex items-center gap-2">
        <Button type="button" onClick={save} disabled={pending}>
          <Upload className="size-4" /> Guardar banner global
        </Button>
        {current ? (
          <Button type="button" variant="ghost" onClick={remove} disabled={pending}>
            <Trash2 className="size-4 text-[var(--color-danger)]" /> Eliminar
          </Button>
        ) : null}
      </div>
    </section>
  );
}
