import { brandedOg } from "@/lib/og-assets";

export const runtime = "nodejs";
export const alt = "Calendario completo del Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CalendarioOpenGraph() {
  return brandedOg({
    eyebrow: "Mundial 2026 · Calendario",
    title: ["104 partidos", "39 días"],
    subtitle:
      "Programación oficial completa: fechas, horarios y sedes de todos los partidos del Mundial.",
    bottomChip: "11 jun – 19 jul",
  });
}
