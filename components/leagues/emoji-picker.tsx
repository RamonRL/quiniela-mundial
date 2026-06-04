"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Ban, Loader2, Smile } from "lucide-react";
import type { Theme, EmojiStyle } from "emoji-picker-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Picker completo (todos los emojis Unicode, buscador, categorías, tonos de
// piel — como WhatsApp). Lazy: solo se descarga al abrir el popover, así no
// engorda el bundle del resto de la app.
const FullPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[380px] w-[320px] place-items-center">
      <Loader2 className="size-5 animate-spin text-[var(--color-muted-foreground)]" />
    </div>
  ),
});

export function EmojiPicker({
  value,
  onChange,
  pickLabel,
  clearLabel,
}: {
  value: string | null;
  onChange: (emoji: string | null) => void;
  /** Texto del trigger cuando no hay emoji, y placeholder del buscador. */
  pickLabel: string;
  /** Texto de la opción "sin emoji". */
  clearLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useTheme();

  return (
    // `modal`: este popover vive dentro de un Dialog (crear/editar dept) y el
    // scroll-lock del dialog bloquea la rueda en contenido portaleado. En modo
    // modal, Radix gestiona su propio scroll y la lista de emojis scrollea.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={pickLabel}
          className="flex h-9 w-full items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm transition hover:border-[var(--color-arena)]/50"
        >
          {value ? (
            <span className="text-xl leading-none">{value}</span>
          ) : (
            <span className="text-[var(--color-muted-foreground)]">{pickLabel}</span>
          )}
          <Smile className="size-4 shrink-0 text-[var(--color-muted-foreground)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
          className="flex w-full items-center gap-2 border-b border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-surface-2)]"
        >
          <Ban className="size-3.5" /> {clearLabel}
        </button>
        {open ? (
          <FullPicker
            onEmojiClick={(e) => {
              onChange(e.emoji);
              setOpen(false);
            }}
            emojiStyle={"native" as EmojiStyle}
            theme={(resolvedTheme === "light" ? "light" : "dark") as Theme}
            width={320}
            height={380}
            searchPlaceHolder={pickLabel}
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
