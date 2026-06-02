import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, teams } from "@/lib/db/schema";
import { OG_BG, OG_COLORS, fallbackOg, flagDataUrl, ogAssets, ogFonts } from "@/lib/og-assets";

export const runtime = "nodejs";
export const alt = "Grupo · Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function GroupOpenGraph({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  try {
    return await render(params);
  } catch (err) {
    if ((err as { digest?: string })?.digest === "NEXT_NOT_FOUND") throw err;
    console.error("[og:grupos] render failed", err);
    return await fallbackOg();
  }
}

async function render(params: Promise<{ code: string }>) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.code, code))
    .limit(1);
  if (!group) notFound();

  const groupName = group.name;
  const groupTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.groupId, group.id))
    .orderBy(asc(teams.name));

  // Pre-fetch banderas como data URL para no depender del fetch interno
  // de Satori (peta a veces en serverless).
  const flagsByCode = new Map<string, string | null>();
  await Promise.all(
    groupTeams.map(async (t) => {
      flagsByCode.set(t.code, await flagDataUrl(t.code));
    }),
  );

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

        {/* Top */}
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
            <div style={{ display: "flex" }}>Mundial 2026 · Fase de grupos</div>
          </div>
          <img
            src={assets.fwc26DataUrl}
            alt=""
            width={70}
            height={70}
            style={{ width: 70, height: 70 }}
          />
        </div>

        {/* Group name */}
        <div
          style={{
            display: "flex",
            padding: "16px 70px 0 70px",
            fontFamily: "BigShoulders",
            fontWeight: 900,
            fontSize: 130,
            lineHeight: 0.9,
            letterSpacing: -3,
            textTransform: "uppercase",
            color: OG_COLORS.accent,
          }}
        >
          {groupName}
        </div>

        {/* Teams stacked — más compacto: padding y tamaños reducidos
            para que entren las 4 selecciones sin desbordar. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "16px 70px 0 70px",
            flex: 1,
          }}
        >
          {groupTeams.map((t) => {
            const flag = flagsByCode.get(t.code);
            return (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "6px 14px",
                  borderRadius: 10,
                  background: "rgba(245, 239, 230, 0.04)",
                  border: "1px solid rgba(245, 239, 230, 0.08)",
                }}
              >
                {flag ? (
                  <img
                    src={flag}
                    alt=""
                    width={44}
                    height={44}
                    style={{ width: 44, height: 44, borderRadius: 9999 }}
                  />
                ) : null}
                <div
                  style={{
                    display: "flex",
                    fontFamily: "BigShoulders",
                    fontWeight: 700,
                    fontSize: 34,
                    letterSpacing: -1,
                    textTransform: "uppercase",
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    marginLeft: "auto",
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: 5,
                    textTransform: "uppercase",
                    color: OG_COLORS.muted,
                  }}
                >
                  {t.code}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 70px 50px 70px",
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
            {groupTeams.length} selecciones
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
