import { notFound } from "next/navigation";
import { brandedOg } from "@/lib/og-assets";
import { VENUES } from "@/lib/seo/venues";

export const runtime = "nodejs";
export const alt = "Sede · Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function SedeOpenGraph({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venue = VENUES.find((v) => v.slug === slug);
  if (!venue) notFound();

  const capacityLabel = venue.capacity.toLocaleString("es-ES");
  return brandedOg({
    eyebrow: `Mundial 2026 · ${venue.country}`,
    title: [venue.name, venue.city],
    subtitle: `Capacidad ${capacityLabel} espectadores. Sede oficial del Mundial 2026.`,
    bottomChip: `${capacityLabel} aforo`,
  });
}
