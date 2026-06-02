import {
  CircleDot,
  MessageCircle,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, chatMessages, leagues, profiles } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/guards";
import { formatRelative, initials } from "@/lib/utils";
import { SignupsTrendChart } from "./charts";

export const dynamic = "force-dynamic";

type CountsRow = {
  online: number;
  dau: number;
  wau: number;
  mau: number;
  total: number;
  newToday: number;
  newWeek: number;
  countriesRepresented: number;
};

type ChatItem = {
  kind: "chat";
  id: number;
  createdAt: Date;
  body: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userAvatar: string | null;
  leagueName: string | null;
};

type AuditItem = {
  kind: "audit";
  id: number;
  createdAt: Date;
  action: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userAvatar: string | null;
};

type SignupItem = {
  kind: "signup";
  id: string;
  createdAt: Date;
  userId: string;
  userName: string | null;
  userEmail: string;
  userAvatar: string | null;
  countryCode: string | null;
};

type ActivityItem = ChatItem | AuditItem | SignupItem;

export default async function MonitoringOverviewPage() {
  await requireAdmin();

  // Una sola query para los KPIs principales — sobre Supabase desde Vercel
  // cada round-trip son ~100-300 ms, así que 8 aggregates en 1 query baja
  // el TTFB del overview drásticamente.
  const [countsRow] = await db.execute<CountsRow>(sql`
    SELECT
      (SELECT count(*)::int FROM profiles WHERE last_seen_at > now() - interval '5 minutes')   AS online,
      (SELECT count(*)::int FROM profiles WHERE last_seen_at > now() - interval '24 hours')    AS dau,
      (SELECT count(*)::int FROM profiles WHERE last_seen_at > now() - interval '7 days')      AS wau,
      (SELECT count(*)::int FROM profiles WHERE last_seen_at > now() - interval '30 days')     AS mau,
      (SELECT count(*)::int FROM profiles)                                                     AS total,
      (SELECT count(*)::int FROM profiles WHERE created_at > now() - interval '24 hours')      AS "newToday",
      (SELECT count(*)::int FROM profiles WHERE created_at > now() - interval '7 days')        AS "newWeek",
      (SELECT count(DISTINCT country_code)::int FROM profiles WHERE country_code IS NOT NULL)  AS "countriesRepresented"
  `);
  const counts = countsRow as CountsRow;

  // Serie diaria de registros (últimos 30 días). Generamos las 30 fechas
  // explícitamente con generate_series para que los días sin registros
  // salgan como 0 en el gráfico y la barra no "salte" huecos.
  const signupsRows = await db.execute<{ date: string; count: number }>(sql`
    WITH days AS (
      SELECT generate_series(
        (now() at time zone 'Europe/Madrid')::date - interval '29 days',
        (now() at time zone 'Europe/Madrid')::date,
        interval '1 day'
      )::date AS day
    )
    SELECT
      to_char(d.day, 'DD/MM') AS "date",
      COALESCE(count(p.id) FILTER (WHERE (p.created_at at time zone 'Europe/Madrid')::date = d.day), 0)::int AS "count"
    FROM days d
    LEFT JOIN profiles p ON true
    GROUP BY d.day
    ORDER BY d.day
  `);
  const signupTrend = (signupsRows as { date: string; count: number }[]).map((r) => ({
    date: r.date,
    count: Number(r.count),
  }));

  // Actividad reciente: cogemos los últimos N de cada fuente y los mezclamos
  // en JS. Más simple que un UNION ALL paginado y suficiente para 30 ítems.
  const [chats, audits, signups] = await Promise.all([
    db
      .select({
        id: chatMessages.id,
        body: chatMessages.body,
        createdAt: chatMessages.createdAt,
        userId: chatMessages.userId,
        userName: profiles.nickname,
        userEmail: profiles.email,
        userAvatar: profiles.avatarUrl,
        leagueName: leagues.name,
      })
      .from(chatMessages)
      .leftJoin(profiles, sql`${chatMessages.userId} = ${profiles.id}`)
      .leftJoin(leagues, sql`${chatMessages.leagueId} = ${leagues.id}`)
      .orderBy(desc(chatMessages.createdAt))
      .limit(20),
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        createdAt: auditLog.createdAt,
        userId: auditLog.adminId,
        userName: profiles.nickname,
        userEmail: profiles.email,
        userAvatar: profiles.avatarUrl,
      })
      .from(auditLog)
      .leftJoin(profiles, sql`${auditLog.adminId} = ${profiles.id}`)
      .orderBy(desc(auditLog.createdAt))
      .limit(20),
    db
      .select({
        id: profiles.id,
        createdAt: profiles.createdAt,
        userId: profiles.id,
        userName: profiles.nickname,
        userEmail: profiles.email,
        userAvatar: profiles.avatarUrl,
        countryCode: profiles.countryCode,
      })
      .from(profiles)
      .orderBy(desc(profiles.createdAt))
      .limit(20),
  ]);

  const stream: ActivityItem[] = [
    ...chats.map((c): ChatItem => ({ kind: "chat", ...c })),
    ...audits.map((a): AuditItem => ({ kind: "audit", ...a })),
    ...signups.map((s): SignupItem => ({ kind: "signup", ...s })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 30);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<CircleDot className="size-4" />}
          label="Online ahora"
          value={counts.online.toString()}
          hint="últimos 5 min"
          live
        />
        <Stat
          icon={<Users className="size-4" />}
          label="DAU"
          value={counts.dau.toString()}
          hint="últimas 24 h"
        />
        <Stat
          icon={<TrendingUp className="size-4" />}
          label="WAU"
          value={counts.wau.toString()}
          hint="últimos 7 d"
        />
        <Stat
          icon={<UserPlus className="size-4" />}
          label="Total registros"
          value={counts.total.toString()}
          hint={`+${counts.newWeek} esta semana`}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="MAU" value={counts.mau} hint="últimos 30 d" />
        <MiniStat label="Hoy" value={counts.newToday} hint="registros nuevos" />
        <MiniStat
          label="Países"
          value={counts.countriesRepresented}
          hint="con al menos 1 usuario"
        />
      </section>

      {/* Trend chart */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <header className="flex items-center justify-between pb-3">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Registros · últimos 30 días
          </p>
          <Badge variant="outline" className="text-[0.55rem]">
            {signupTrend.reduce((s, r) => s + r.count, 0)} totales
          </Badge>
        </header>
        <SignupsTrendChart data={signupTrend} />
      </section>

      {/* Activity stream */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <header className="flex items-center justify-between pb-3">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Actividad reciente
          </p>
          <Badge variant="outline" className="text-[0.55rem]">
            Recarga manual
          </Badge>
        </header>
        {stream.length === 0 ? (
          <p className="py-6 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Aún no hay actividad.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {stream.map((item) => (
              <ActivityRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  live,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  live?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        live
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_6%,var(--color-surface))]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <div
        className={`flex items-center gap-2 ${
          live ? "text-[var(--color-arena)]" : "text-[var(--color-muted-foreground)]"
        }`}
      >
        {icon}
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.32em]">{label}</span>
      </div>
      <p
        className={`mt-2 font-display tabular text-4xl tracking-tight ${
          live ? "text-[var(--color-arena)] glow-arena" : ""
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-0.5 font-display tabular text-2xl tracking-tight">{value}</p>
      {hint ? (
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const display = item.userName || item.userEmail?.split("@")[0] || "—";
  const icon =
    item.kind === "chat" ? (
      <MessageCircle className="size-3.5 text-[var(--color-arena)]" />
    ) : item.kind === "audit" ? (
      <ShieldCheck className="size-3.5 text-[var(--color-warning)]" />
    ) : (
      <UserPlus className="size-3.5 text-[var(--color-success)]" />
    );

  return (
    <li className="flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-[var(--color-surface-2)]">
      <span className="mt-1.5 shrink-0">{icon}</span>
      <Avatar className="mt-0.5 size-6 shrink-0 border border-[var(--color-border)]">
        {item.userAvatar ? <AvatarImage src={item.userAvatar} alt="" /> : null}
        <AvatarFallback className="text-[0.55rem]">{initials(display)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium">{display}</span>{" "}
          <span className="text-[var(--color-muted-foreground)]">
            {item.kind === "chat"
              ? "envió un mensaje"
              : item.kind === "audit"
                ? "ejecutó "
                : "se registró"}
          </span>
          {item.kind === "audit" ? (
            <span className="font-mono text-xs">{item.action}</span>
          ) : null}
          {item.kind === "chat" && item.leagueName ? (
            <span className="text-[var(--color-muted-foreground)]"> en {item.leagueName}</span>
          ) : null}
          {item.kind === "signup" && item.countryCode ? (
            <span className="text-[var(--color-muted-foreground)]">
              {" "}
              desde {item.countryCode}
            </span>
          ) : null}
        </p>
        {item.kind === "chat" ? (
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">{item.body}</p>
        ) : null}
      </div>
      <span className="shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        {formatRelative(item.createdAt)}
      </span>
    </li>
  );
}

