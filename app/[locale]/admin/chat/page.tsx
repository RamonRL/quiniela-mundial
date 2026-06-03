import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages, leagues, profiles } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { formatDateTime, initials } from "@/lib/utils";
import { banUser, deleteMessage } from "@/app/[locale]/(app)/chat/actions";
import { Trash2, UserX } from "lucide-react";

export const metadata = { title: "Moderación · Admin" };

export default async function AdminChatPage() {
  const rows = await db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      leagueId: chatMessages.leagueId,
      leagueName: leagues.name,
      leagueIsPublic: leagues.isPublic,
      createdAt: chatMessages.createdAt,
      deletedAt: chatMessages.deletedAt,
      userId: chatMessages.userId,
      authorEmail: profiles.email,
      authorNickname: profiles.nickname,
      authorAvatar: profiles.avatarUrl,
    })
    .from(chatMessages)
    .leftJoin(profiles, eq(chatMessages.userId, profiles.id))
    .leftJoin(leagues, eq(chatMessages.leagueId, leagues.id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Moderación de chat"
        description="Modera mensajes y autores."
      />
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
          Sin mensajes todavía.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((m) => {
            const display = m.authorNickname ?? m.authorEmail?.split("@")[0] ?? "—";
            const deleted = m.deletedAt != null;
            const leagueLabel = m.leagueName
              ? m.leagueIsPublic
                ? `Pública · ${m.leagueName}`
                : m.leagueName
              : `Liga #${m.leagueId}`;
            return (
              <li
                key={m.id}
                className="flex items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
              >
                <Avatar className="size-8">
                  {m.authorAvatar ? <AvatarImage src={m.authorAvatar} alt="" /> : null}
                  <AvatarFallback>{initials(display)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{display}</span>
                    <Badge variant="outline" className="text-[0.6rem]">
                      {leagueLabel}
                    </Badge>
                    {deleted ? (
                      <Badge variant="danger" className="text-[0.6rem]">
                        Eliminado
                      </Badge>
                    ) : null}
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {formatDateTime(m.createdAt)}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-sm ${
                      deleted ? "italic text-[var(--color-muted-foreground)] line-through" : ""
                    }`}
                  >
                    {m.body}
                  </p>
                </div>
                {!deleted ? (
                  <div className="flex shrink-0 gap-1">
                    <form
                      action={async (fd) => {
                        "use server";
                        fd.set("id", m.id.toString());
                        await deleteMessage(fd);
                      }}
                    >
                      <Button type="submit" variant="ghost" size="icon" aria-label="Eliminar">
                        <Trash2 className="size-4" />
                      </Button>
                    </form>
                    <form
                      action={async (fd) => {
                        "use server";
                        fd.set("userId", m.userId);
                        await banUser(fd);
                      }}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        aria-label="Banear autor"
                      >
                        <UserX className="size-4" />
                      </Button>
                    </form>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
