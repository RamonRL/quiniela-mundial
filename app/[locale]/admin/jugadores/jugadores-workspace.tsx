"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FileSpreadsheet, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerForm } from "./player-form";
import { ImportForm } from "./import-form";

type TeamLite = { id: number; code: string; name: string; flagUrl: string | null };
type PlayerLite = {
  id: number;
  teamId: number;
  name: string;
  position: string | null;
  jerseyNumber: number | null;
  photoUrl: string | null;
};

type Props = {
  teams: TeamLite[];
  currentTeamId: number | null;
  players: PlayerLite[];
};

export function JugadoresWorkspace({ teams, currentTeamId, players }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<PlayerLite | undefined>(undefined);
  const [open, setOpen] = useState(false);

  function changeTeam(teamId: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("team", teamId);
    router.push(`/admin/jugadores?${next.toString()}`);
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sin selecciones cargadas</CardTitle>
          <CardDescription>
            Antes de gestionar plantillas, crea las selecciones desde{" "}
            <code className="font-mono">/admin/selecciones</code>.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const team = teams.find((t) => t.id === currentTeamId) ?? teams[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={team.id.toString()} onValueChange={changeTeam}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>
                {t.code} · {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline">
          {players.length} {players.length === 1 ? "jugador" : "jugadores"}
        </Badge>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="import">
            <FileSpreadsheet className="size-4" /> Importar en bulk
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditing(undefined);
                  setOpen(true);
                }}
              >
                <Plus />
                Añadir jugador
              </Button>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-12">Foto</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="w-32">Posición</TableHead>
                    <TableHead className="w-12 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">
                        {p.jerseyNumber ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span className="grid size-8 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                          {p.photoUrl ? (
                            <Image src={p.photoUrl} alt={p.name} width={32} height={32} />
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-xs text-[var(--color-muted-foreground)]">
                        {p.position ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(p);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {players.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-12 text-center text-sm text-[var(--color-muted-foreground)]"
                      >
                        Sin jugadores en {team.name}. Añádelos uno a uno o usa la pestaña de
                        importar.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="import">
          <ImportForm teamId={team.id} teamName={team.name} />
        </TabsContent>
      </Tabs>

      <PlayerForm
        open={open}
        onOpenChange={setOpen}
        teamId={team.id}
        player={editing}
      />
    </div>
  );
}
