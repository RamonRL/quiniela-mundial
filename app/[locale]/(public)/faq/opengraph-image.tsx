import { brandedOg } from "@/lib/og-assets";

export const runtime = "nodejs";
export const alt = "Preguntas frecuentes · Quiniela Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function FaqOpenGraph() {
  return brandedOg({
    eyebrow: "Quiniela Mundial · FAQ",
    title: ["Preguntas", "frecuentes"],
    subtitle:
      "Cómo funciona la quiniela, cómo unirte con código, cuántas privadas puedes crear y todo lo demás.",
    bottomChip: "Cómo se juega",
  });
}
