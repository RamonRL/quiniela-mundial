"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Lock, LockOpen, RefreshCw, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { forceSyncNow, openR32Predictions, setResultSource } from "./actions";

export function OpenR32Button({ alreadyOpen }: { alreadyOpen: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={alreadyOpen ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await openR32Predictions();
          if (r.ok) toast.success(r.message ?? "R32 abierto.");
          else toast.error(r.error ?? "No se pudo abrir el R32.");
        })
      }
    >
      <Unlock className={pending ? "size-4 animate-pulse" : "size-4"} />
      {alreadyOpen ? "Reaplicar terceros" : "Abrir R32 a los jugadores"}
    </Button>
  );
}

export function ForceSyncButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await forceSyncNow();
          if (r.ok) toast.success(r.message ?? "Sync ejecutado.");
          else toast.error(r.error ?? "Fallo el sync.");
        })
      }
    >
      <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
      Forzar sync
    </Button>
  );
}

export function SourceToggle({ matchId, source }: { matchId: number; source: string }) {
  const [pending, start] = useTransition();
  const manual = source === "manual";
  const next = manual ? "auto" : "manual";
  return (
    <Button
      type="button"
      size="sm"
      variant={manual ? "outline" : "ghost"}
      disabled={pending}
      title={manual ? "Bloqueado a mano: el sync no lo toca. Pulsa para volver a automático." : "Automático. Pulsa para bloquear (que el sync no lo sobrescriba)."}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("matchId", String(matchId));
          fd.set("source", next);
          const r = await setResultSource(fd);
          if (r.ok) toast.success(next === "manual" ? "Bloqueado (manual)." : "Liberado (automático).");
          else toast.error(r.error ?? "No se pudo cambiar.");
        })
      }
    >
      {manual ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
      {manual ? "Manual" : "Auto"}
    </Button>
  );
}
