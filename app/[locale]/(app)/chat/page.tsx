import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages, leagues, profiles } from "@/lib/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { currentLeagueId } from "@/lib/leagues";
import { ChatThread } from "./chat-thread";

export const metadata = { title: "Chat" };

export default async function ChatPage() {
  const me = await requireUser();
  const t = await getTranslations("chat");
  const leagueId = await currentLeagueId(me);
  const [league] = leagueId
    ? await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1)
    : [];

  const messages = leagueId
    ? await db
        .select({
          id: chatMessages.id,
          body: chatMessages.body,
          createdAt: chatMessages.createdAt,
          userId: chatMessages.userId,
          deletedAt: chatMessages.deletedAt,
          authorEmail: profiles.email,
          authorNickname: profiles.nickname,
          authorAvatar: profiles.avatarUrl,
        })
        .from(chatMessages)
        .leftJoin(profiles, eq(chatMessages.userId, profiles.id))
        .where(and(eq(chatMessages.leagueId, leagueId)))
        .orderBy(desc(chatMessages.createdAt))
        .limit(200)
    : [];

  const activeMessages = messages.filter((m) => m.deletedAt == null).length;
  const leagueName = league?.name ?? t("defaultLeague");
  const eyebrow = league?.isPublic ? t("eyebrowPublic") : t("eyebrowPrivate");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={t("threadTitle", { name: leagueName })}
        description={
          activeMessages === 0
            ? t("startConversation")
            : t("messageCount", { n: activeMessages })
        }
      />
      <ChatThread
        leagueId={leagueId}
        currentUserId={me.id}
        isAdmin={me.role === "admin"}
        messages={messages.reverse().map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          userId: m.userId,
          deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
          author: {
            email: m.authorEmail ?? "",
            nickname: m.authorNickname,
            avatarUrl: m.authorAvatar,
          },
        }))}
      />
    </div>
  );
}
