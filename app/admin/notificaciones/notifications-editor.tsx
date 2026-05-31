"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TELEGRAM_EVENTS, type TelegramEventKey } from "@/lib/telegram/event-keys";
import {
  saveTelegramNotificationSettings,
  type FormState,
} from "./actions";

const initial: FormState = { ok: false };

export function NotificationsEditor({
  enabled,
}: {
  enabled: Record<TelegramEventKey, boolean>;
}) {
  const [values, setValues] = useState<Record<string, boolean>>(enabled);
  const [state, action, pending] = useActionState(
    saveTelegramNotificationSettings,
    initial,
  );

  if (state.ok) {
    toast.success("Notificaciones actualizadas.");
  } else if (state.error) {
    toast.error(state.error);
  }

  const activeCount = TELEGRAM_EVENTS.filter((e) => values[e.key]).length;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="enabledJson" value={JSON.stringify(values)} />

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            {activeCount} de {TELEGRAM_EVENTS.length} eventos activos
          </p>
        </div>

        <ul className="divide-y divide-[var(--color-border)]">
          {TELEGRAM_EVENTS.map((e) => {
            const on = values[e.key] !== false;
            return (
              <li
                key={e.key}
                className="flex items-center justify-between gap-4 px-4 py-3.5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={
                      on
                        ? "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-[color-mix(in_oklch,var(--color-arena)_14%,transparent)] text-[var(--color-arena)]"
                        : "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
                    }
                  >
                    {on ? <Bell className="size-4" /> : <BellOff className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium leading-tight">{e.label}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {e.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={on}
                  onCheckedChange={(v) =>
                    setValues((prev) => ({ ...prev, [e.key]: v }))
                  }
                  aria-label={`Notificar ${e.label}`}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <p className="font-editorial text-xs italic text-[var(--color-muted-foreground)]">
          Los eventos desactivados dejan de llegar al chat de Telegram.
        </p>
      </div>
    </form>
  );
}
