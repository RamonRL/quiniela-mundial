import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, teams } from "@/lib/db/schema";
import { OG_BG, OG_COLORS, fallbackOg, flagDataUrl, ogAssets, ogFonts } from "@/lib/og-assets";

export const runtime = "nodejs";
export const alt = "Partido · Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STAGE_LABEL: Record<string, string> = {
  group: "Fase de grupos",
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinales",
  third: "Tercer puesto",
  final: "Final",
};

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(d);
}

export default async function MatchOpenGraph({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    return await render(params);
  } catch (err) {
    // notFound() lanza un error con digest "NEXT_NOT_FOUND" que Next debe
    // manejar arriba para devolver 404. No lo tragamos.
    if ((err as { digest?: string })?.digest === "NEXT_NOT_FOUND") throw err;
    console.error("[og:partido] render failed", err);
    return await fallbackOg();
  }
}

async function render(params: Promise<{ id: string }>) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) notFound();

  const [home, away] = await Promise.all([
    match.homeTeamId
      ? db.select().from(teams).where(eq(teams.id, match.homeTeamId)).limit(1)
      : Promise.resolve([]),
    match.awayTeamId
      ? db.select().from(teams).where(eq(teams.id, match.awayTeamId)).limit(1)
      : Promise.resolve([]),
  ]);
  const homeTeam = home[0] ?? null;
  const awayTeam = away[0] ?? null;

  const stageLabel = STAGE_LABEL[match.stage] ?? match.stage;
  const dateLabel = formatDate(match.scheduledAt);
  const venue = match.venue ?? null;

  const homeName = homeTeam?.name ?? "TBD";
  const awayName = awayTeam?.name ?? "TBD";
  const [homeFlag, awayFlag] = await Promise.all([
    homeTeam ? flagDataUrl(homeTeam.code) : Promise.resolve(null),
    awayTeam ? flagDataUrl(awayTeam.code) : Promise.resolve(null),
  ]);

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
            <div style={{ display: "flex" }}>Mundial 2026 · {stageLabel}</div>
          </div>
          <img
            src={assets.fwc26DataUrl}
            alt=""
            width={70}
            height={70}
            style={{ width: 70, height: 70 }}
          />
        </div>

        {/* Match showcase */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 70px 0 70px",
          }}
        >
          <Side name={homeName} flag={homeFlag} />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "BigShoulders",
                fontWeight: 900,
                fontSize: 90,
                letterSpacing: -2,
                color: OG_COLORS.arena,
              }}
            >
              VS
            </div>
            {dateLabel ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: OG_COLORS.muted,
                  textAlign: "center",
                }}
              >
                {dateLabel}
              </div>
            ) : null}
          </div>

          <Side name={awayName} flag={awayFlag} />
        </div>

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 70px 45px 70px",
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
          {venue ? (
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
              {venue}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

function Side({ name, flag }: { name: string; flag: string | null }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 22,
        flex: 1,
      }}
    >
      {flag ? (
        <img
          src={flag}
          alt=""
          width={220}
          height={220}
          style={{
            width: 220,
            height: 220,
            borderRadius: 9999,
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 220,
            height: 220,
            borderRadius: 9999,
            background: "rgba(245, 239, 230, 0.08)",
            fontFamily: "BigShoulders",
            fontWeight: 900,
            fontSize: 60,
            color: "rgba(245, 239, 230, 0.4)",
          }}
        >
          TBD
        </div>
      )}
      <div
        style={{
          display: "flex",
          fontFamily: "BigShoulders",
          fontWeight: 900,
          fontSize: 60,
          lineHeight: 1,
          letterSpacing: -1,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {name}
      </div>
    </div>
  );
}
