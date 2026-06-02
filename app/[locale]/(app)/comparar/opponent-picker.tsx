"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

type Opponent = {
  id: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
};

export function OpponentPicker({
  opponents,
  currentOpponentId,
  currentUserId,
}: {
  opponents: Opponent[];
  currentOpponentId: string | null;
  currentUserId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  void currentUserId;

  function pick(id: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("vs", id);
    router.push(`/comparar?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <span className="text-sm text-[var(--color-muted-foreground)]">Comparar contra:</span>
      <Select value={currentOpponentId ?? undefined} onValueChange={pick}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder="Selecciona un participante" />
        </SelectTrigger>
        <SelectContent>
          {opponents.map((o) => {
            const display = o.nickname || o.email.split("@")[0];
            return (
              <SelectItem key={o.id} value={o.id}>
                <span className="flex items-center gap-2">
                  <Avatar className="size-5">
                    {o.avatarUrl ? <AvatarImage src={o.avatarUrl} alt="" /> : null}
                    <AvatarFallback className="text-[0.6rem]">
                      {initials(display)}
                    </AvatarFallback>
                  </Avatar>
                  {display}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
