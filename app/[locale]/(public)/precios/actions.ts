"use server";

import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { commercialLeads } from "@/lib/db/schema";
import { notifyNewCommercialLead } from "@/lib/telegram/events";

export type CommercialLeadFormState = {
  ok: boolean;
  error?: string;
  message?: string;
};

const leadSchema = z.object({
  name: z.string().trim().min(2, "Pon tu nombre.").max(120),
  company: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Email no válido."),
  expectedMembers: z
    .union([z.coerce.number().int().min(1).max(10000), z.literal(NaN), z.undefined()])
    .optional(),
  message: z.string().trim().max(1500).optional(),
  website: z.string().optional(), // honeypot
});

/**
 * Recibe un lead comercial desde /precios o /contacto. Guarda en
 * `commercial_leads` y dispara una alerta Telegram via `after()` para
 * que no se pierda si la función serverless se apaga antes de que el
 * fetch a la API de Telegram termine.
 *
 * Trampa anti-bot: si el campo honeypot `website` viene relleno,
 * fingimos éxito sin guardar nada — el bot se cree que ganó.
 */
export async function submitCommercialLead(
  _prev: CommercialLeadFormState,
  formData: FormData,
): Promise<CommercialLeadFormState> {
  const raw = {
    name: formData.get("name") ?? "",
    company: formData.get("company") ?? "",
    email: formData.get("email") ?? "",
    expectedMembers: formData.get("expectedMembers") || undefined,
    message: formData.get("message") ?? "",
    website: formData.get("website") ?? "",
  };

  // Honeypot — silencioso para no dar feedback al bot.
  if (typeof raw.website === "string" && raw.website.trim().length > 0) {
    return { ok: true, message: "Gracias, te respondo pronto." };
  }

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revisa los campos.",
    };
  }

  const expectedMembers =
    typeof parsed.data.expectedMembers === "number" &&
    Number.isFinite(parsed.data.expectedMembers)
      ? parsed.data.expectedMembers
      : null;

  const [inserted] = await db
    .insert(commercialLeads)
    .values({
      name: parsed.data.name,
      company: parsed.data.company || null,
      email: parsed.data.email,
      expectedMembers,
      message: parsed.data.message || null,
    })
    .returning({ id: commercialLeads.id });

  after(() =>
    notifyNewCommercialLead({
      id: inserted.id,
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company || null,
      expectedMembers,
      message: parsed.data.message || null,
    }),
  );

  return {
    ok: true,
    message: "Recibido. Te respondo en menos de 24 h.",
  };
}
