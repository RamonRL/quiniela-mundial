"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnnouncementBanner } from "@/components/shell/announcement-banner";
import {
  updateLeagueAnnouncement,
  type LeagueFormState,
} from "@/lib/league-actions";

const initial: LeagueFormState = { ok: false };

type Props = {
  leagueId: number;
  leagueName: string;
  initialValue: string | null;
};

/**
 * Editor del anuncio fijado (premium). Muestra una VISTA PREVIA en vivo de la
 * barra que verán todos los miembros en cada página, para que el valor del
 * feature sea tangible. Cuerpo vacío = limpia el anuncio.
 */
export function AnnouncementForm({ leagueId, leagueName, initialValue }: Props) {
  const t = useTranslations("myPool");
  const tBar = useTranslations("announcementBar");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    updateLeagueAnnouncement,
    initial,
  );
  const [value, setValue] = useState(initialValue ?? "");
  const trimmed = value.trim();
  const hadValue = (initialValue ?? "").trim().length > 0;

  return (
    <div className="space-y-4">
      <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
        {t("annValueProp")}
      </p>

      {/* Vista previa EXACTA de lo que verán los miembros */}
      <div className="space-y-1.5">
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-[var(--color-muted-foreground)]">
          {t("annPreview")}
        </p>
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          {trimmed ? (
            <AnnouncementBanner
              leagueName={leagueName}
              message={trimmed}
              label={tBar("label")}
            />
          ) : (
            <p className="bg-[var(--color-surface-2)] px-4 py-6 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              {t("annEmptyPreview")}
            </p>
          )}
        </div>
      </div>

      <form ref={formRef} action={action} className="space-y-3">
        <input type="hidden" name="id" value={leagueId} />
        <textarea
          name="announcement"
          rows={3}
          maxLength={280}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("annPlaceholder")}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-arena)]"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
            {t("annHint")}{" "}
            <span className="font-mono not-italic uppercase tracking-[0.18em]">
              {value.length}/280
            </span>
          </p>
          <div className="flex items-center gap-2">
            {hadValue ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setValue("");
                  // submit en el siguiente tick, ya con el textarea vacío
                  requestAnimationFrame(() => formRef.current?.requestSubmit());
                }}
              >
                <Trash2 className="size-3.5" />
                {t("annRemove")}
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={pending}>
              <Save className="size-3.5" />
              {pending ? t("saving") : t("annPublish")}
            </Button>
          </div>
        </div>
        {state.error ? (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}
        {state.ok && state.message ? (
          <p className="text-sm text-[var(--color-success)]">{state.message}</p>
        ) : null}
      </form>
    </div>
  );
}
