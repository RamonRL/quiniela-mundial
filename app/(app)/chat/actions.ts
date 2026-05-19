"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { chatMessages, leagues, profiles } from "@/lib/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { currentLeagueId, isMemberOf } from "@/lib/leagues";
import { notifyNewChatMessage } from "@/lib/telegram/events";

export type FormState = { ok: boolean; error?: string };

const schema = z.object({
  body: z.string().trim().min(1).max(1000),
});

export async function sendMessage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser();
  if (me.bannedAt) return { ok: false, error: "Tu cuenta está suspendida." };
  const parsed = schema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { ok: false, error: "Mensaje vacío o demasiado largo." };

  const leagueId = await currentLeagueId(me);
  if (leagueId == null) return { ok: false, error: "Sin liga activa." };
  const member = await isMemberOf(me.id, leagueId);
  if (!member) return { ok: false, error: "No perteneces a esta liga." };

  await db.insert(chatMessages).values({
    leagueId,
    userId: me.id,
    body: parsed.data.body,
  });

  // Alerta Telegram fire-and-forget — usa la liga (nombre + isPublic) y
  // el autor para construir el mensaje. Cae como notificación silent
  // para no saturar (ver lib/telegram/events.ts).
  void (async () => {
    const [league] = await db
      .select({ name: leagues.name, isPublic: leagues.isPublic })
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1);
    if (!league) return;
    await notifyNewChatMessage({
      leagueName: league.name,
      isPublic: league.isPublic,
      authorEmail: me.email,
      authorNickname: me.nickname,
      body: parsed.data.body,
    });
  })();

  revalidatePath("/chat");
  return { ok: true };
}

export async function deleteMessage(formData: FormData) {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db
    .update(chatMessages)
    .set({ deletedAt: new Date(), deletedBy: me.id })
    .where(eq(chatMessages.id, id));
  revalidatePath("/chat");
  revalidatePath("/admin/chat");
}

export async function banUser(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("userId"));
  await db.update(profiles).set({ bannedAt: new Date() }).where(eq(profiles.id, userId));
  void me;
  revalidatePath("/admin/usuarios");
  revalidatePath("/chat");
}
