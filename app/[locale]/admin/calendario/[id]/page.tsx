import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, Pencil } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, matches, matchdays, teams } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shell/page-header";
import { TeamFlag } from "@/components/brand/team-flag";
import { DeleteButton } from "@/components/admin/delete-button";
import { formatDateTime } from "@/lib/utils";
import { MatchDialog } from "./match-dialog";
import { deleteMatch } from "../actions";

export default async function AdminMatchdayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchdayId = Number(id);
  if (!Number.isFinite(matchdayId)) notFound();
  const [day] = await db
    .select()
    .from(matchdays)
    .where(eq(matchdays.id, matchdayId))
    .limit(1);
  if (!day) notFound();

  const [matchRows, allTeams, allGroups] = await Promise.all([
    db
      .select()
      .from(matches)
      .where(eq(matches.matchdayId, matchdayId))
      .orderBy(asc(matches.scheduledAt)),
    db.select().from(teams).orderBy(asc(teams.name)),
    db.select().from(groups).orderBy(asc(groups.code)),
  ]);

  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="px-0 text-[var(--color-muted-foreground)]">
        <Link href="/admin/calendario">
          <ArrowLeft />
          Volver al calendario
        </Link>
      </Button>
      <PageHeader
        eyebrow={day.stage.toUpperCase()}
        title={day.name}
        description={`Cierre de predicción: ${formatDateTime(day.predictionDeadlineAt)}`}
        actions={<MatchDialog matchdayId={day.id} stage={day.stage} teams={allTeams} groups={allGroups} />}
      />

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Local</TableHead>
              <TableHead className="w-12 text-center">vs</TableHead>
              <TableHead>Visitante</TableHead>
              <TableHead>Sede / Hora</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matchRows.map((m) => {
              const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
              const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.code}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 font-medium">
                      <TeamFlag code={home?.code} size={20} />
                      <span className="truncate">{home?.name ?? "—"}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-[var(--color-muted-foreground)]">
                    vs
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 font-medium">
                      <TeamFlag code={away?.code} size={20} />
                      <span className="truncate">{away?.name ?? "—"}</span>
                    </span>
                  </TableCell>
                  <TableCell className="space-y-0.5 text-xs">
                    <div className="text-[var(--color-foreground)]">
                      {formatDateTime(m.scheduledAt)}
                    </div>
                    <div className="text-[var(--color-muted-foreground)]">{m.venue ?? "—"}</div>
                  </TableCell>
                  <TableCell>
                    {m.status === "finished" ? (
                      <Badge variant="success">
                        {m.homeScore} – {m.awayScore}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Programado</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <MatchDialog
                        matchdayId={day.id}
                        stage={day.stage}
                        teams={allTeams}
                        groups={allGroups}
                        match={{
                          id: m.id,
                          code: m.code,
                          stage: m.stage,
                          groupId: m.groupId,
                          homeTeamId: m.homeTeamId,
                          awayTeamId: m.awayTeamId,
                          scheduledAt: m.scheduledAt,
                          venue: m.venue,
                        }}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label={`Editar ${m.code}`}>
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/admin/partidos/${m.id}`} aria-label="Resultado">
                          <ClipboardCheck className="size-4" />
                        </Link>
                      </Button>
                      <DeleteButton
                        action={deleteMatch}
                        id={m.id}
                        confirmMessage={`¿Eliminar el partido ${m.code}? Se borrarán también goleadores y predicciones.`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {matchRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-sm text-[var(--color-muted-foreground)]"
                >
                  No hay partidos en esta jornada todavía. Añade el primero.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
