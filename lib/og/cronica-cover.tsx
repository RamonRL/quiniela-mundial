/**
 * Portada "marcador de retransmisión" para las crónicas. Mismo lenguaje
 * visual que el OG del partido (`partido/[id]/opengraph-image.tsx`) y el
 * HeroCard del dashboard: estadio oscuro, banderas circulares, marcador
 * gigante en Big Shoulders con glow arena.
 *
 * Reutiliza fuentes/assets/banderas de `lib/og-assets`. Render compartido
 * por el script `scripts/gen-cronica-cover.ts` (que escribe el PNG a disco
 * para subirlo como cover) y, si se quiere, por un futuro
 * `noticias/[slug]/opengraph-image.tsx`.
 */
import React from "react";
import { ImageResponse } from "next/og";
import { OG_BG, OG_COLORS, flagDataUrl, ogAssets, ogFonts } from "@/lib/og-assets";

export type CronicaCoverData = {
  homeName: string;
  awayName: string;
  homeCode: string | null;
  awayCode: string | null;
  homeScore: number;
  awayScore: number;
  /** Si hubo penaltis, se muestra "Pen. A-B" bajo el marcador. */
  wentToPens?: boolean;
  homePen?: number | null;
  awayPen?: number | null;
  /** Etiqueta ya formateada en mayúsculas: "GRUPO A", "OCTAVOS", "FINAL"… */
  stageLabel: string;
  /** "12 JUN 2026" — opcional. */
  dateLabel?: string | null;
  venue?: string | null;
  /** Realza sutilmente al ganador (bandera algo mayor, rival atenuado). */
  winner?: "home" | "away" | null;
};

const RED = OG_COLORS.accentRgb;

export async function renderCronicaCover(
  data: CronicaCoverData,
): Promise<ImageResponse> {
  const [fonts, assets] = await Promise.all([ogFonts(), ogAssets()]);
  const [homeFlag, awayFlag] = await Promise.all([
    flagDataUrl(data.homeCode),
    flagDataUrl(data.awayCode),
  ]);

  const homeWon = data.winner === "home";
  const awayWon = data.winner === "away";

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
        {/* Spotlight de estadio: glow arena arriba-izq + verde abajo-der */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -200,
            left: -160,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: `radial-gradient(circle, rgba(${RED},0.22) 0%, rgba(${RED},0) 70%)`,
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: -220,
            right: -180,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(70,160,90,0.16) 0%, rgba(70,160,90,0) 70%)",
          }}
        />

        {/* Top: eyebrow + logo FWC26 */}
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
              color: OG_COLORS.accent,
            }}
          >
            <div style={{ display: "flex", height: 3, width: 50, background: OG_COLORS.accent }} />
            <div style={{ display: "flex" }}>Mundial 2026 · {data.stageLabel}</div>
          </div>
          <img
            src={assets.fwc26DataUrl}
            alt=""
            width={70}
            height={70}
            style={{ width: 70, height: 70 }}
          />
        </div>

        {/* Showcase: bandera — marcador — bandera */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 64px 0 64px",
          }}
        >
          <Side name={data.homeName} flag={homeFlag} won={homeWon} dim={awayWon} />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                fontFamily: "BigShoulders",
                fontWeight: 900,
                fontSize: 132,
                lineHeight: 1,
                letterSpacing: -2,
                color: OG_COLORS.foreground,
                textShadow: `0 0 2px rgba(${RED},0.6), 0 0 34px rgba(${RED},0.45)`,
              }}
            >
              <div style={{ display: "flex" }}>{data.homeScore}</div>
              <div style={{ display: "flex", color: OG_COLORS.accent, fontSize: 96 }}>–</div>
              <div style={{ display: "flex" }}>{data.awayScore}</div>
            </div>

            {data.wentToPens ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: OG_COLORS.mutedStrong,
                }}
              >
                Pen. {data.homePen ?? 0}-{data.awayPen ?? 0}
              </div>
            ) : null}

            {/* Sello CRÓNICA */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 6,
                padding: "9px 20px",
                borderRadius: 999,
                background: `rgba(${RED}, 0.16)`,
                border: `1px solid ${OG_COLORS.accent}`,
                color: OG_COLORS.accent,
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: 5,
                textTransform: "uppercase",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: OG_COLORS.accent,
                }}
              />
              Crónica
            </div>
          </div>

          <Side name={data.awayName} flag={awayFlag} won={awayWon} dim={homeWon} />
        </div>

        {/* Bottom: marca + sede/fecha */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 70px 46px 70px",
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
          {data.venue || data.dateLabel ? (
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
              {[data.dateLabel, data.venue].filter(Boolean).join(" · ")}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}

function Side({
  name,
  flag,
  won,
  dim,
}: {
  name: string;
  flag: string | null;
  won: boolean;
  dim: boolean;
}) {
  const flagSize = won ? 218 : 196;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 22,
        flex: 1,
        opacity: dim ? 0.72 : 1,
      }}
    >
      {flag ? (
        <img
          src={flag}
          alt=""
          width={flagSize}
          height={flagSize}
          style={{
            width: flagSize,
            height: flagSize,
            borderRadius: 9999,
            boxShadow: won
              ? `0 20px 44px rgba(0,0,0,0.5), 0 0 0 4px rgba(${RED},0.55)`
              : "0 20px 44px rgba(0,0,0,0.5)",
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: flagSize,
            height: flagSize,
            borderRadius: 9999,
            background: "rgba(245, 239, 230, 0.08)",
            fontFamily: "BigShoulders",
            fontWeight: 900,
            fontSize: 56,
            color: "rgba(245, 239, 230, 0.4)",
          }}
        >
          ?
        </div>
      )}
      <div
        style={{
          display: "flex",
          fontFamily: "BigShoulders",
          fontWeight: 900,
          fontSize: 54,
          lineHeight: 0.98,
          letterSpacing: -1,
          textTransform: "uppercase",
          textAlign: "center",
          maxWidth: 380,
        }}
      >
        {name}
      </div>
    </div>
  );
}
