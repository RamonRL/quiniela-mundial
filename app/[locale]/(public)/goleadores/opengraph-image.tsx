import { brandedOg } from "@/lib/og-assets";

export const runtime = "nodejs";
export const alt = "Máximos goleadores del Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function GoleadoresOpenGraph() {
  return brandedOg({
    eyebrow: "Mundial 2026 · Goleadores",
    title: ["Bota", "de Oro"],
    subtitle:
      "La carrera por el máximo goleador del Mundial 2026. Tabla actualizada partido a partido durante el torneo.",
    bottomChip: "Top scorers",
  });
}
