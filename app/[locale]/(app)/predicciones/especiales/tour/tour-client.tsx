"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  InteractiveTourShell,
  flashSavedToast,
} from "@/components/predictions/interactive-tour-shell";
import { useDateFormat } from "@/components/shell/timezone-provider";
import { formatDateTime } from "@/lib/utils";
import { SpecialField } from "../specials-form";
import {
  isSpecialAnswered,
  type SpecialDef,
  type SpecialType,
} from "../types";
import { endSpecialsTour, saveSpecialPrediction } from "./actions";

type Item = SpecialDef & {
  existingValue: Record<string, unknown>;
};

export function SpecialsTourClient({
  items,
  players,
  teams,
  initialStep,
  allCompleteOnEntry,
}: {
  items: Item[];
  players: { id: number; name: string; position: string | null; teamId: number }[];
  teams: { id: number; code: string; name: string }[];
  initialStep: number;
  allCompleteOnEntry: boolean;
}) {
  const t = useTranslations("predSpecials");
  const { timeZone, locale } = useDateFormat();
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [values, setValues] = useState<Record<number, Record<string, unknown>>>(() =>
    Object.fromEntries(items.map((s) => [s.id, s.existingValue])),
  );
  const [pending, startTransition] = useTransition();
  const toldEntryToast = useRef(false);

  useEffect(() => {
    if (toldEntryToast.current) return;
    toldEntryToast.current = true;
    if (allCompleteOnEntry) {
      toast(t("tourEntryToast", { n: items.length }), {
        description: t("tourEntryDesc"),
      });
    }
  }, [allCompleteOnEntry, items.length, t]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("step") !== String(step)) {
      url.searchParams.set("step", String(step));
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [step, router]);

  const current = items[step];
  if (!current) return null;
  const currentValue = values[current.id] ?? {};

  async function persistCurrent(): Promise<boolean> {
    const res = await saveSpecialPrediction({
      specialId: current.id,
      valueJson: values[current.id] ?? {},
    });
    if (!res.ok) {
      toast.error(res.error ?? t("saveError"));
      return false;
    }
    // Solo mostramos toast si había algo que guardar (evita ruido en steps vacíos).
    if (isSpecialAnswered(values[current.id], current.type as SpecialType)) {
      flashSavedToast();
    }
    return true;
  }

  function onPrev() {
    if (step === 0) return;
    startTransition(async () => {
      const ok = await persistCurrent();
      if (!ok) return;
      setDirection("left");
      setStep((s) => s - 1);
    });
  }

  function onNext() {
    const isLast = step === items.length - 1;
    startTransition(async () => {
      const ok = await persistCurrent();
      if (!ok) return;
      if (isLast) {
        await endSpecialsTour();
        router.push("/predicciones");
        return;
      }
      setDirection("right");
      setStep((s) => s + 1);
    });
  }

  return (
    <InteractiveTourShell
      title={t("title")}
      currentStep={step}
      totalSteps={items.length}
      onPrev={onPrev}
      onNext={onNext}
      direction={direction}
      finishLabel={t("finish")}
      pending={pending}
    >
      <div className="space-y-6">
        <header className="text-center">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-arena)]">
            {t("closeTour", {
              date: formatDateTime(current.closesAt, { timeZone, locale, day: "2-digit", month: "short" }),
            })}
          </p>
          <h1 className="mt-2 font-display text-2xl leading-snug tracking-tight sm:text-3xl">
            {current.question}
          </h1>
        </header>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <SpecialField
            special={current}
            value={currentValue}
            onChange={(next) =>
              setValues((prev) => ({ ...prev, [current.id]: next }))
            }
            disabled={false}
            players={players}
            teams={teams}
          />
        </div>

        <p className="text-center font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          {t("tourHint")}
        </p>
      </div>
    </InteractiveTourShell>
  );
}
