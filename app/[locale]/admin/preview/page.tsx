import { asc, eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { groups, matches, players, teams } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { localizeTeams } from "@/lib/team-names";
import { getDateContext } from "@/lib/timezone-server";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { HeroCard, type HeroData, type HeroMatch, type HeroScorer } from "@/components/dashboard/hero-card";

export const metadata = { title: "Preview · Admin" };
export const dynamic = "force-dynamic";

const POS_RANK: Record<string, number> = { DEL: 0, MED: 1, DEF: 2, POR: 3 };

export default async function PreviewPage() {
  await requireAdmin();
  const locale = await getLocale();
  const { timeZone } = await getDateContext();
  const now = Date.now();
  const at = (min: number) => new Date(now + min * 60000).toISOString();
  const dateOf = (min: number) =>
    formatDateTime(new Date(now + min * 60000), {
      timeZone, locale, weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
    });

  // ── Datos reales ──
  const [teamRows, groupRows, gm, playerRows] = await Promise.all([
    db.select().from(teams),
    db.select({ id: groups.id, code: groups.code }).from(groups),
    db
      .select({ id: matches.id, code: matches.code, gid: matches.groupId, h: matches.homeTeamId, a: matches.awayTeamId, venue: matches.venue })
      .from(matches)
      .where(eq(matches.stage, "group"))
      .orderBy(asc(matches.scheduledAt)),
    db.select({ teamId: players.teamId, name: players.name, jersey: players.jerseyNumber, pos: players.position }).from(players),
  ]);

  const team = new Map(localizeTeams(teamRows, locale).map((t) => [t.id, { code: t.code, name: t.name }]));
  const teamByCode = new Map(localizeTeams(teamRows, locale).map((t) => [t.code, { code: t.code, name: t.name }]));
  const groupCode = new Map(groupRows.map((g) => [g.id, g.code]));

  // Goleadores plausibles: jugadores reales del equipo, priorizando delanteros.
  const byTeam = new Map<number, { name: string; jersey: number | null; pos: string | null }[]>();
  for (const p of playerRows) {
    const arr = byTeam.get(p.teamId) ?? [];
    arr.push({ name: p.name, jersey: p.jersey, pos: p.pos });
    byTeam.set(p.teamId, arr);
  }
  for (const arr of byTeam.values()) {
    arr.sort((a, b) => (POS_RANK[a.pos ?? ""] ?? 4) - (POS_RANK[b.pos ?? ""] ?? 4) || (a.jersey ?? 99) - (b.jersey ?? 99));
  }
  const scorer = (teamId: number | null, idx: number, minute: number): HeroScorer => ({
    name: (teamId != null ? byTeam.get(teamId)?.[idx]?.name : null) ?? "Goleador",
    teamCode: (teamId != null ? team.get(teamId)?.code : null) ?? "—",
    minute, isOwnGoal: false, isPenalty: false,
  });

  type Row = (typeof gm)[number];
  const mk = (r: Row, o: Omit<Partial<HeroMatch>, "venue"> & { withVenue?: boolean } = {}): HeroMatch => ({
    code: r.code,
    group: r.gid != null ? groupCode.get(r.gid) ?? null : null,
    home: r.h != null ? team.get(r.h) ?? null : null,
    away: r.a != null ? team.get(r.a) ?? null : null,
    status: o.status ?? "upcoming",
    homeScore: o.homeScore,
    awayScore: o.awayScore,
    minute: o.minute,
    kickoffISO: o.kickoffISO,
    dateLabel: o.dateLabel,
    venue: o.withVenue ? r.venue?.split("·")[0]?.trim() ?? null : null,
    scorers: o.scorers,
    prediction: o.prediction,
    note: o.note,
    stage: o.stage,
    href: o.href ?? (r.id != null ? `/partido/${r.id}` : undefined),
  });

  // Localiza un partido real por la pareja de selecciones (en cualquier orden).
  const codeOf = (id: number | null | undefined) => (id != null ? team.get(id)?.code : undefined);
  const M = (x: string, y: string): Row => {
    const r = gm.find((m) => {
      const hc = codeOf(m.h);
      const ac = codeOf(m.a);
      return (hc === x && ac === y) || (hc === y && ac === x);
    });
    if (!r) throw new Error(`Partido no encontrado en la BD: ${x}-${y}`);
    return r;
  };

  const last3 = gm.slice(-3); // [M72, M69, M70] por scheduledAt
  const koFeatured: HeroMatch = {
    code: "M89", stage: "r16", status: "upcoming",
    home: teamByCode.get("BIH") ?? null, away: teamByCode.get("CZE") ?? null,
    kickoffISO: at(300), dateLabel: dateOf(300), venue: "AT&T Stadium",
    prediction: { hasResult: false, href: "/predicciones" },
  };

  const scenarios: { title: string; desc: string; data: HeroData }[] = [
    {
      title: "A · Antes del primer partido (apertura real)",
      desc: "El partido que abre el Mundial y los dos siguientes, con datos reales. Aviso (en rojo) de que falta el pronóstico.",
      data: {
        featuredKind: "next",
        featured: [mk(gm[0], { kickoffISO: at(2880), dateLabel: dateOf(2880), withVenue: true, prediction: { hasResult: false, href: "/predicciones" } })],
        context: [mk(gm[1], { dateLabel: dateOf(3060) }), mk(gm[2], { dateLabel: dateOf(4440) })],
      },
    },
    {
      title: "B · Caso normal (mitad de torneo)",
      desc: "Anterior con marcador, el siguiente con cuenta atrás (pronóstico ya puesto) y el posterior.",
      data: {
        featuredKind: "next",
        featured: [mk(gm[19], { kickoffISO: at(150), dateLabel: dateOf(150), withVenue: true, prediction: { hasResult: true, href: "/predicciones" } })],
        context: [mk(gm[18], { status: "finished", homeScore: 2, awayScore: 1 }), mk(gm[20], { dateLabel: dateOf(1500) })],
      },
    },
    {
      title: "C · Última jornada de grupos (solo queda 1)",
      desc: "El de después aún es TBD: la tira retrocede a los dos anteriores con marcador, y el último por jugar es el protagonista.",
      data: {
        featuredKind: "next",
        featured: [mk(last3[2], { kickoffISO: at(90), dateLabel: dateOf(90), withVenue: true, prediction: { hasResult: false, href: "/predicciones" } })],
        context: [mk(last3[0], { status: "finished", homeScore: 1, awayScore: 1 }), mk(last3[1], { status: "finished", homeScore: 0, awayScore: 2 })],
      },
    },
    {
      title: "D · Un partido en juego",
      desc: "El directo manda: marcador en vivo con minuto y goleador real ocupa el cuerpo. El siguiente queda en la tira con mini-contador.",
      data: {
        featuredKind: "live",
        featured: [mk(gm[10], { status: "live", homeScore: 1, awayScore: 0, minute: 34, scorers: [scorer(gm[10].h, 0, 22)] })],
        context: [mk(gm[11], { kickoffISO: at(120) }), mk(gm[12], { dateLabel: dateOf(1560) })],
      },
    },
    {
      title: "E · El siguiente y el posterior, a la misma hora",
      desc: "Dos partidos reales que arrancan a la vez: el siguiente es protagonista y el simultáneo sale en la tira con '· a la vez'.",
      data: {
        featuredKind: "next",
        featured: [mk(gm[48], { kickoffISO: at(200), dateLabel: dateOf(200), withVenue: true, prediction: { hasResult: true, href: "/predicciones" } })],
        context: [mk(gm[47], { status: "finished", homeScore: 3, awayScore: 1 }), mk(gm[49], { dateLabel: "A la misma hora", note: "· a la vez" })],
      },
    },
    {
      title: "F · Dos partidos en juego a la vez (con goleadores en ambos)",
      desc: "El cuerpo se parte en dos marcadores en vivo, ambos con goleadores reales — así se ve el stackeo en móvil. El siguiente queda en la tira.",
      data: {
        featuredKind: "live",
        featured: [
          mk(gm[48], { status: "live", homeScore: 1, awayScore: 1, minute: 27, scorers: [scorer(gm[48].h, 0, 11), scorer(gm[48].a, 0, 19)] }),
          mk(gm[49], { status: "live", homeScore: 2, awayScore: 0, minute: 27, scorers: [scorer(gm[49].h, 0, 6), scorer(gm[49].h, 1, 22)] }),
        ],
        context: [mk(gm[50], { kickoffISO: at(75) })],
      },
    },
    {
      title: "G · Nombres largos + fase final (octavos)",
      desc: "Selecciones reales con nombres largos (Bosnia y Herzegovina, República Checa…) para ver el salto de línea, y la etiqueta de RONDA (Octavos) en vez del grupo.",
      data: {
        featuredKind: "next",
        featured: [koFeatured],
        context: [
          { code: "M88", stage: "r16", status: "finished", home: teamByCode.get("KOR") ?? null, away: teamByCode.get("CIV") ?? null, homeScore: 2, awayScore: 1 },
          { code: "M90", stage: "r16", status: "upcoming", home: teamByCode.get("USA") ?? null, away: teamByCode.get("KSA") ?? null, dateLabel: "Mañana · 18:00" },
        ],
      },
    },
    {
      title: "H · Dos en directo + los dos siguientes también a la misma hora",
      desc: "Jornada 3: la pareja de un grupo en vivo (Suiza-Canadá + Bosnia-Qatar) y, en la tira, la pareja del siguiente grupo, ambos a la misma hora con mini-contador.",
      data: {
        featuredKind: "live",
        featured: [
          mk(M("SUI", "CAN"), { status: "live", homeScore: 1, awayScore: 0, minute: 38, scorers: [scorer(M("SUI", "CAN").h, 0, 12)] }),
          mk(M("BIH", "QAT"), { status: "live", homeScore: 0, awayScore: 0, minute: 38 }),
        ],
        context: [
          mk(M("SCO", "BRA"), { kickoffISO: at(150), note: "· a la vez" }),
          mk(M("MAR", "HAI"), { kickoffISO: at(150), note: "· a la vez" }),
        ],
      },
    },
    {
      title: "I · Los dos próximos a la misma hora, y los dos anteriores también",
      desc: "Jornada 3 sin directo: el siguiente con cuenta atrás, y en la tira su pareja simultánea (· a la vez) + los dos anteriores, que también se jugaron a la vez.",
      data: {
        featuredKind: "next",
        featured: [mk(M("SCO", "BRA"), { kickoffISO: at(200), dateLabel: dateOf(200), withVenue: true, prediction: { hasResult: false, href: "/predicciones" } })],
        context: [
          mk(M("MAR", "HAI"), { kickoffISO: at(200), note: "· a la vez" }),
          mk(M("SUI", "CAN"), { status: "finished", homeScore: 2, awayScore: 1 }),
          mk(M("BIH", "QAT"), { status: "finished", homeScore: 0, awayScore: 0 }),
        ],
      },
    },
    {
      title: "J · Los dos últimos de grupos en directo (los previos también a la vez)",
      desc: "Cierre de la fase de grupos: la última pareja en vivo (Jordania-Argentina + Argelia-Austria) y, en la tira, la pareja anterior ya jugada a la vez (RD Congo-Uzbekistán + Colombia-Portugal).",
      data: {
        featuredKind: "live",
        featured: [
          mk(M("JOR", "ARG"), { status: "live", homeScore: 0, awayScore: 2, minute: 55, scorers: [scorer(M("JOR", "ARG").a, 0, 23), scorer(M("JOR", "ARG").a, 1, 41)] }),
          mk(M("ALG", "AUT"), { status: "live", homeScore: 1, awayScore: 1, minute: 55, scorers: [scorer(M("ALG", "AUT").h, 0, 30), scorer(M("ALG", "AUT").a, 0, 48)] }),
        ],
        context: [
          mk(M("COD", "UZB"), { status: "finished", homeScore: 1, awayScore: 1, note: "· a la vez" }),
          mk(M("COL", "POR"), { status: "finished", homeScore: 2, awayScore: 0, note: "· a la vez" }),
        ],
      },
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Preview"
        description="Maquetas en pruebas con datos reales, visibles solo para ti. El resto de usuarios sigue viendo el dashboard normal. Estrecha la ventana para ver el móvil."
      />

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-tight">
          Dashboard · card principal en modo torneo (marcador de retransmisión)
        </h2>
        <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          El protagonista son los partidos en directo si los hay; si no, el siguiente con su cuenta
          atrás. Debajo, la tira de contexto. Emparejamientos, sedes y goleadores son reales.
        </p>

        <div className="space-y-10">
          {scenarios.map((sc) => (
            <div key={sc.title} className="space-y-2">
              <div>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
                  {sc.title}
                </p>
                <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
                  {sc.desc}
                </p>
              </div>
              <HeroCard data={sc.data} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
