import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagueSponsors } from "@/lib/db/schema";

export type SponsorLogo = {
  id: number;
  imageUrl: string;
  storagePath: string;
  alt: string | null;
  linkUrl: string | null;
  orderIndex: number;
};

/** Logos de patrocinadores de una liga, en orden de aparición. */
export async function loadLeagueSponsors(leagueId: number): Promise<SponsorLogo[]> {
  return db
    .select({
      id: leagueSponsors.id,
      imageUrl: leagueSponsors.imageUrl,
      storagePath: leagueSponsors.storagePath,
      alt: leagueSponsors.alt,
      linkUrl: leagueSponsors.linkUrl,
      orderIndex: leagueSponsors.orderIndex,
    })
    .from(leagueSponsors)
    .where(eq(leagueSponsors.leagueId, leagueId))
    .orderBy(asc(leagueSponsors.orderIndex), asc(leagueSponsors.id));
}
