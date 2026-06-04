"use client";

import { useState } from "react";
import { Smile, Ban } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Selector de emoji para los departamentos: grid curado con los emojis
 * típicos (estilo WhatsApp) en un popover — sin ir a buscarlos a internet y
 * sin meter una dependencia de 100KB. Agrupados por temática.
 */
const EMOJI_GROUPS: string[][] = [
  // Caras
  ["😀", "😁", "😂", "🤣", "😅", "😊", "😉", "😍", "🤩", "😘", "😎", "🤓", "🧐", "🤔", "😏", "🥳", "😴", "🤯", "😡", "🤬", "😱", "😭", "🥶", "🥵", "🤠", "🤡", "👻", "💀", "👽", "🤖"],
  // Gestos y personas
  ["👍", "👎", "👏", "🙌", "💪", "🙏", "🤝", "✌️", "🤞", "🤙", "👊", "👀", "🧠", "👑", "🎩", "💼", "🧑‍💻", "🕺", "💃", "🏃", "🦸", "🦹", "🧙", "🫡", "🤌"],
  // Deporte y competición
  ["⚽", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎯", "🏀", "🏈", "🎾", "🏐", "🏓", "🥊", "🏋️", "🚴", "⛳", "🏄", "🎽", "🏟️"],
  // Animales
  ["🦁", "🐯", "🐺", "🦊", "🐻", "🐼", "🐨", "🐸", "🦅", "🦉", "🦈", "🐙", "🦄", "🐉", "🐂", "🐎", "🐍", "🦂", "🐝", "🦍", "🐬", "🦜"],
  // Comida y bebida
  ["☕", "🍺", "🍻", "🥂", "🍕", "🌮", "🍔", "🍟", "🌶️", "🍩", "🍪", "🎂", "🥑", "🍣", "🍿", "🧉"],
  // Objetos y energía
  ["🚀", "💡", "🔥", "⚡", "💥", "✨", "🌟", "⭐", "💫", "🌈", "❄️", "🌊", "🌋", "🎲", "🎸", "🥁", "🎮", "💻", "🖥️", "📱", "📈", "📊", "💰", "💎", "🛠️", "🔧", "⚙️", "🔬", "🧪", "🧲", "💣", "🛡️", "⚔️", "🏹", "🪓", "🧨", "🎺"],
  // Símbolos y banderas
  ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "♠️", "♣️", "♥️", "♦️", "☠️", "🏴‍☠️", "🚩", "🏁", "🎌", "🔱", "♾️", "💯"],
];

export function EmojiPicker({
  value,
  onChange,
  pickLabel,
  clearLabel,
}: {
  value: string | null;
  onChange: (emoji: string | null) => void;
  /** Texto del trigger cuando no hay emoji, y aria-label. */
  pickLabel: string;
  /** Texto de la opción "sin emoji". */
  clearLabel: string;
}) {
  const [open, setOpen] = useState(false);

  function pick(emoji: string | null) {
    onChange(emoji);
    setOpen(false);
  }

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
      <PopoverContent className="w-80 p-2" align="start">
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => pick(null)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-surface-2)]"
          >
            <Ban className="size-3.5" /> {clearLabel}
          </button>
          {EMOJI_GROUPS.map((group, gi) => (
            <div key={gi} className="grid grid-cols-9 gap-0.5">
              {group.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => pick(emoji)}
                  className={`grid size-8 place-items-center rounded-md text-lg leading-none transition hover:bg-[var(--color-surface-2)] ${
                    value === emoji ? "bg-[color-mix(in_oklch,var(--color-arena)_18%,transparent)]" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
