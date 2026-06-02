import { brandedOg } from "@/lib/og-assets";

export const runtime = "nodejs";
export const alt = "Bracket eliminatorio del Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function BracketOpenGraph() {
  return brandedOg({
    eyebrow: "Mundial 2026 · Eliminación directa",
    title: ["Bracket", "del torneo"],
    subtitle:
      "El cuadro FIFA: dieciseisavos, octavos, cuartos, semifinales y final el 19 de julio en Nueva York.",
    bottomChip: "32 → 1",
  });
}
