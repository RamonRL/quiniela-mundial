"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownToLine, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { importPredictionsAction, type ImportFormState } from "@/app/predictions-actions";
import type { LeagueWithPicks } from "./import-banner";

const initial: ImportFormState = { ok: false };
// Descarte permanente del banner: una vez pulsas "Ahora no", no vuelve a salir.
const DISMISS_KEY = "qm:import-preds-dismissed";

export function ImportBannerClient({ sources }: { sources: LeagueWithPicks[] }) {
  const t = useTranslations("importPreds");
  const [state, action, pending] = useActionState(
    importPredictionsAction,
    initial,
  );
  const [sourceId, setSourceId] = useState<string>(
    sources[0] ? String(sources[0].id) : "",
  );
  // Arranca oculto para evitar flash; el efecto decide con localStorage.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      setVisible(localStorage.getItem(DISMISS_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage no disponible → solo ocultamos esta sesión */
    }
    setVisible(false);
  };

  if (state.ok && state.message) {
    toast.success(state.message, { duration: 6000 });
  }
  if (state.ok || !visible) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_5%,var(--color-surface))] p-5 sm:p-6">
      <div
        className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]">
            <Sparkles className="size-4" />
          </div>
          <div className="space-y-1">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-arena)]">
              {t("eyebrow")}
            </p>
            <h2 className="font-display text-xl tracking-tight sm:text-2xl">
              {t("title")}
            </h2>
            <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              {t("description")}
            </p>
          </div>
        </div>
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="sourceLeagueId" value={sourceId} />
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger className="min-w-[12rem]">
              <SelectValue placeholder={t("sourceLeaguePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {sources.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                  {s.isPublic ? ` ${t("publicSuffix")}` : ""}
                  <span className="ml-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    {t("picksCount", { count: s.totalPicks })}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={pending || !sourceId}>
            <ArrowDownToLine className="size-3.5" />
            {pending ? t("importing") : t("import")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
            {t("notNow")}
          </Button>
        </form>
      </div>
      {state.error ? (
        <p className="relative mt-3 text-sm text-[var(--color-danger)]">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}
