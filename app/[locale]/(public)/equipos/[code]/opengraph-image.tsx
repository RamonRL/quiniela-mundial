import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, players, teams } from "@/lib/db/schema";
import { OG_BG, OG_COLORS, fallbackOg, flagDataUrl, ogAssets, ogFonts } from "@/lib/og-assets";

export const runtime = "nodejs";
export const alt = "Selección · Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TeamOpenGraph({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  try {
    return await render(params);
  } catch (err) {
    if ((err as { digest?: string })?.digest === "NEXT_NOT_FOUND") throw err;
    console.error("[og:equipos] render failed", err);
    return await fallbackOg();
  }
}

async function render(params: Promise<{ code: string }>) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.code, code))
    .limit(1);
  if (!team) notFound();

  const teamName = team.name;
  const [group] = team.groupId
    ? await db.select().from(groups).where(eq(groups.id, team.groupId)).limit(1)
    : [];
  const groupName = group?.name ?? null;
  const flagUrl = (await flagDataUrl(code)) ?? "";
  const squadCount = (
    await db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.teamId, team.id))
  ).length;

  const [fonts, assets] = await Promise.all([ogFonts(), ogAssets()]);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: OG_BG.background,
          color: OG_COLORS.foreground,
          fontFamily: "DMSans",
          position: "relative",
        }}
      >
        {/* Glow */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -180,
            right: -180,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background:
              `radial-gradient(circle, rgba(${OG_COLORS.accentRgb},0.22) 0%, rgba(${OG_COLORS.accentRgb},0) 70%)`,
          }}
        />

        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "50px 70px 0 70px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: OG_COLORS.arena,
            }}
          >
            <div style={{ display: "flex", height: 3, width: 50, background: OG_COLORS.arena }} />
            <div style={{ display: "flex" }}>Mundial 2026 · Selección</div>
          </div>
          <img
            src={assets.fwc26DataUrl}
            alt=""
            width={70}
            height={70}
            style={{ width: 70, height: 70 }}
          />
        </div>

        {/* Body: flag + team info */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            gap: 60,
            padding: "30px 70px 0 70px",
          }}
        >
          {flagUrl ? (
            <img
              src={flagUrl}
              alt=""
              width={300}
              height={300}
              style={{
                width: 300,
                height: 300,
                borderRadius: 9999,
                boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
              }}
            />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: 8,
                textTransform: "uppercase",
                color: OG_COLORS.muted,
              }}
            >
              {code}
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "BigShoulders",
                fontWeight: 900,
                fontSize: 140,
                lineHeight: 0.9,
                letterSpacing: -3,
                textTransform: "uppercase",
              }}
            >
              {teamName}
            </div>
            {groupName ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    padding: "10px 18px",
                    borderRadius: 8,
                    background: `rgba(${OG_COLORS.accentRgb}, 0.18)`,
                    color: OG_COLORS.arena,
                    fontWeight: 700,
                    fontSize: 22,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                  }}
                >
                  {groupName}
                </div>
                {squadCount > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      padding: "10px 18px",
                      borderRadius: 8,
                      background: "rgba(245, 239, 230, 0.08)",
                      color: OG_COLORS.mutedStrong,
                      fontWeight: 700,
                      fontSize: 22,
                      letterSpacing: 4,
                      textTransform: "uppercase",
                    }}
                  >
                    {squadCount} jugadores
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 70px 50px 70px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <img
              src={assets.qmMarkDataUrl}
              alt=""
              width={48}
              height={48}
              style={{ width: 48, height: 48 }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "BigShoulders",
                fontWeight: 900,
                fontSize: 28,
                letterSpacing: -1,
                textTransform: "uppercase",
              }}
            >
              quinielamundial.es
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: OG_COLORS.muted,
            }}
          >
            Calendario · Plantilla · Estadísticas
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
