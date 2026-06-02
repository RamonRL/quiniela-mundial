"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { formatTime, initials } from "@/lib/utils";
import { deleteMessage, sendMessage, type FormState } from "./actions";

const initial: FormState = { ok: false };

export type ChatMessage = {
  id: number;
  body: string;
  createdAt: string;
  userId: string;
  deletedAt: string | null;
  author: {
    email: string;
    nickname: string | null;
    avatarUrl: string | null;
  };
};

export function ChatThread({
  leagueId,
  messages,
  currentUserId,
  isAdmin,
}: {
  leagueId: number | null;
  messages: ChatMessage[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState(sendMessage, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  // Mantén la conversación pegada abajo dentro de su contenedor sin
  // disparar scrollIntoView, que arrastra a la página entera al cargar.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div className="flex h-[60dvh] flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <RealtimeRefresher
        channelKey={`chat:league:${leagueId ?? "none"}`}
        subscriptions={[
          {
            table: "chat_messages",
            filter: leagueId != null ? `league_id=eq.${leagueId}` : undefined,
          },
        ]}
      />
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-12 text-center font-editorial text-base italic text-[var(--color-muted-foreground)]">
            Aún sin mensajes. Sé el primero.
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const display = m.author.nickname || m.author.email.split("@")[0];
              const mine = m.userId === currentUserId;
              const deleted = m.deletedAt != null;
              return (
                <li
                  key={m.id}
                  className={`flex gap-3 ${mine ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar className="size-8 shrink-0">
                    {m.author.avatarUrl ? (
                      <AvatarImage src={m.author.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback className="text-xs">{initials(display)}</AvatarFallback>
                  </Avatar>
                  <div
                    className={`group flex max-w-[75%] flex-col ${
                      mine ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{display}</span>
                      <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                        {formatTime(m.createdAt, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div
                      className={`mt-0.5 rounded-2xl px-3.5 py-2 text-sm ${
                        deleted
                          ? "italic text-[var(--color-muted-foreground)] line-through"
                          : mine
                            ? "bg-[var(--color-arena)] text-white"
                            : "bg-[var(--color-surface-2)] text-[var(--color-foreground)]"
                      }`}
                    >
                      {deleted ? "(mensaje eliminado)" : m.body}
                    </div>
                    {isAdmin && !deleted ? (
                      <form
                        action={async (fd) => {
                          fd.set("id", m.id.toString());
                          await deleteMessage(fd);
                        }}
                        className="opacity-0 transition group-hover:opacity-100"
                      >
                        <Button type="submit" variant="ghost" size="sm" className="h-6 px-1.5">
                          <Trash2 className="size-3" /> Eliminar
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <form
        ref={formRef}
        action={action}
        className="flex items-center gap-2 border-t border-[var(--color-border)] p-3"
      >
        <Input
          name="body"
          placeholder="Escribe un mensaje…"
          required
          maxLength={1000}
          disabled={pending}
        />
        <Button type="submit" size="icon" disabled={pending} aria-label="Enviar">
          <Send className="size-4" />
        </Button>
      </form>
      {state.error ? (
        <p className="border-t border-[var(--color-border)] bg-[var(--color-danger)]/10 px-3 py-1.5 text-xs text-[var(--color-danger)]">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
