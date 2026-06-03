"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GUEST_NICKNAME_STORAGE_KEY,
  NICKNAME_MAX_LEN,
  NICKNAME_MIN_LEN,
  NICKNAME_REGEX,
} from "../_lib/identity";

export function getStoredGuestNickname(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(GUEST_NICKNAME_STORAGE_KEY);
}

export function setStoredGuestNickname(name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_NICKNAME_STORAGE_KEY, name);
}

type Props = {
  /** Si false, el gate no aparece (usuario logueado). */
  enabled: boolean;
  open: boolean;
  onConfirm: (nickname: string) => void;
  onCancel: () => void;
};

/**
 * Modal previo a jugar para invitados sin sesión. Pre-rellena con el apodo
 * guardado en localStorage si existe; al confirmar, lo persiste y avisa al
 * caller con el apodo final.
 */
export function NicknameGate({ enabled, open, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !open) return;
    const stored = getStoredGuestNickname();
    if (stored) setValue(stored);
  }, [enabled, open]);

  if (!enabled) return null;

  const handleSubmit = () => {
    const cleaned = value.trim().replace(/\s+/g, " ");
    if (!NICKNAME_REGEX.test(cleaned)) {
      setError(
        `Usa ${NICKNAME_MIN_LEN}-${NICKNAME_MAX_LEN} caracteres (letras, números, espacios, _ o -).`,
      );
      return;
    }
    setError(null);
    setStoredGuestNickname(cleaned);
    onConfirm(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onCancel() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pon un apodo para el ranking</DialogTitle>
          <DialogDescription>
            Apareces así en la clasificación global. Lo guardamos en este
            navegador para que no tengas que repetirlo cada vez.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-2"
        >
          <Input
            autoFocus
            placeholder="Ej. Pichichi23"
            value={value}
            maxLength={NICKNAME_MAX_LEN + 5}
            onChange={(e) => setValue(e.target.value)}
          />
          {error ? (
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-danger)]">
              {error}
            </p>
          ) : (
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {NICKNAME_MIN_LEN}-{NICKNAME_MAX_LEN} caracteres · letras, números, _ o -
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">Empezar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
