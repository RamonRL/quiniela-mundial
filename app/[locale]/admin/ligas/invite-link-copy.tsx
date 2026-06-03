"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function InviteLinkCopy({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window === "undefined"
      ? `/invite/${token}`
      : `${window.location.origin}/invite/${token}`;

  function copy() {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("No se pudo copiar."));
  }

  return (
    <div className="space-y-2 pt-1">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        Invite link
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 font-mono text-[0.7rem] text-[var(--color-foreground)]">
          /invite/{token}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={copy}
          aria-label="Copiar enlace"
        >
          {copied ? <Check className="size-3.5 text-[var(--color-success)]" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}
