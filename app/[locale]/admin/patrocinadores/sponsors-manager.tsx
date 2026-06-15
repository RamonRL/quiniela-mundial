"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Link2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addSponsor, deleteSponsor, moveSponsor, updateSponsorLink } from "./actions";

type Sponsor = { id: number; imageUrl: string; alt: string | null; linkUrl: string | null };

export function SponsorsManager({
  leagueId,
  sponsors,
}: {
  leagueId: number;
  sponsors: Sponsor[];
}) {
  const [pending, start] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [link, setLink] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function runUpload() {
    if (!file) {
      toast.error("Elige un archivo primero.");
      return;
    }
    const fd = new FormData();
    fd.set("leagueId", String(leagueId));
    fd.set("alt", alt);
    fd.set("link", link);
    fd.set("logo", file);
    start(async () => {
      const r = await addSponsor(fd);
      if (r.ok) {
        toast.success(r.message ?? "Logo añadido.");
        setFile(null);
        setAlt("");
        setLink("");
        if (fileRef.current) fileRef.current.value = "";
      } else {
        toast.error(r.error ?? "No se pudo subir.");
      }
    });
  }

  function runMove(id: number, dir: "up" | "down") {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("dir", dir);
    start(async () => {
      const r = await moveSponsor(fd);
      if (!r.ok) toast.error(r.error ?? "No se pudo mover.");
    });
  }

  function runDelete(id: number) {
    const fd = new FormData();
    fd.set("id", String(id));
    start(async () => {
      const r = await deleteSponsor(fd);
      if (r.ok) toast.success(r.message ?? "Eliminado.");
      else toast.error(r.error ?? "No se pudo eliminar.");
    });
  }

  return (
    <div className="space-y-6">
      {/* Subir nuevo logo */}
      <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
          Añadir patrocinador
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="space-y-1 text-sm">
            <span className="text-[var(--color-muted-foreground)]">Logo (PNG/JPG/WEBP/SVG, máx 2 MB)</span>
            <Input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[var(--color-muted-foreground)]">Nombre de la marca (alt, opcional)</span>
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Ej. Coca-Cola" />
          </label>
          <Button type="button" onClick={runUpload} disabled={pending || !file}>
            <Upload className="size-4" />
            Subir
          </Button>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--color-muted-foreground)]">
            Enlace al hacer clic (web o enlace de afiliado, opcional)
          </span>
          <Input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://… (tu enlace de afiliado)"
          />
        </label>
      </div>

      {/* Lista actual */}
      {sponsors.length === 0 ? (
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          Sin patrocinadores. Sube logos y aparecerán arriba del dashboard de esta liga (sustituyendo al logo de la FIFA World Cup).
        </p>
      ) : (
        <ul className="space-y-2">
          {sponsors.map((s, i) => (
            <li
              key={s.id}
              className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-20 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- preview de logo de aspecto variable */}
                  <img src={s.imageUrl} alt={s.alt ?? "Patrocinador"} className="h-9 w-auto max-w-full object-contain" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-mono text-[0.6rem] text-[var(--color-muted-foreground)]">#{i + 1}</span>{" "}
                  {s.alt ?? <span className="italic text-[var(--color-muted-foreground)]">sin nombre</span>}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={pending || i === 0}
                    title="Mover a la izquierda"
                    onClick={() => runMove(s.id, "up")}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={pending || i === sponsors.length - 1}
                    title="Mover a la derecha"
                    onClick={() => runMove(s.id, "down")}
                  >
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    title="Eliminar"
                    onClick={() => runDelete(s.id)}
                  >
                    <Trash2 className="size-4 text-[var(--color-danger)]" />
                  </Button>
                </div>
              </div>
              <SponsorLinkEditor id={s.id} initial={s.linkUrl} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Editor inline del enlace de destino (afiliado) de un patrocinador. */
function SponsorLinkEditor({ id, initial }: { id: number; initial: string | null }) {
  const [val, setVal] = useState(initial ?? "");
  const [pending, start] = useTransition();
  const dirty = val.trim() !== (initial ?? "");

  function save() {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("link", val);
    start(async () => {
      const r = await updateSponsorLink(fd);
      if (r.ok) toast.success(r.message ?? "Enlace guardado.");
      else toast.error(r.error ?? "No se pudo guardar.");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Link2 className="size-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
      <Input
        type="url"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Enlace de destino (afiliado / web) — vacío = sin enlace"
        className="h-8 flex-1 text-sm"
      />
      <Button type="button" size="sm" variant="outline" disabled={pending || !dirty} onClick={save}>
        <Check className="size-3.5" /> Guardar
      </Button>
    </div>
  );
}
