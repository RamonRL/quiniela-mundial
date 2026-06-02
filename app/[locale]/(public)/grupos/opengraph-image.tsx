import { brandedOg } from "@/lib/og-assets";

export const runtime = "nodejs";
export const alt = "Los 12 grupos del Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function GruposIndexOpenGraph() {
  return brandedOg({
    eyebrow: "Mundial 2026 · Fase de grupos",
    title: ["12 grupos", "48 selecciones"],
    subtitle:
      "Top 2 + los 8 mejores terceros pasan a la fase eliminatoria. Las cuatro selecciones de cada grupo y sus enfrentamientos.",
    bottomChip: "Grupos A — L",
  });
}
