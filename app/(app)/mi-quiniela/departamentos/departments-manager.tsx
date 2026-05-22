"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Edit2, Plus, Trash2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initials } from "@/lib/utils";
import type { DepartmentRankingEntry } from "@/lib/leaderboard";
import {
  assignMemberToDepartment,
  createDepartment,
  deleteDepartment,
  updateDepartment,
} from "./actions";

type Department = {
  id: number;
  name: string;
  emoji: string | null;
  color: string | null;
};

type Member = {
  userId: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  departmentId: number | null;
};

const NO_DEPT = "__none__";

export function DepartmentsManager({
  leagueId,
  departments,
  rankings,
  members,
}: {
  leagueId: number;
  departments: Department[];
  rankings: DepartmentRankingEntry[];
  members: Member[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);

  const rankingsByDept = new Map(rankings.map((r) => [r.departmentId, r]));

  return (
    <div className="space-y-8">
      {/* ─── Sección 1 · Departamentos como cards con media de puntos ─── */}
      <section className="space-y-4">
        <header className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl tracking-tight">Departamentos</h2>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Crear departamento
              </Button>
            </DialogTrigger>
            <CreateDepartmentDialog leagueId={leagueId} onClose={() => setCreateOpen(false)} />
          </Dialog>
        </header>

        {departments.length === 0 ? null : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => {
              const r = rankingsByDept.get(d.id);
              return (
                <Card key={d.id} className="overflow-hidden">
                  <CardHeader
                    className="p-4"
                    style={d.color ? { borderTopColor: d.color, borderTopWidth: 4 } : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {d.emoji ? <span className="text-xl">{d.emoji}</span> : null}
                        <h3 className="font-display text-lg leading-tight tracking-tight">
                          {d.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setEditDept(d)}
                          aria-label="Editar departamento"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <DeleteDeptButton deptId={d.id} name={d.name} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 p-4 pt-0">
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                        Media puntos
                      </span>
                      <span className="font-display text-2xl">
                        {r?.avgPoints ?? 0}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-[var(--color-muted-foreground)]">
                      <span>Activos</span>
                      <span>
                        {r?.activeMembers ?? 0} / {r?.totalMembers ?? 0}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-[var(--color-muted-foreground)]">
                      <span>Total puntos</span>
                      <span>{r?.totalPoints ?? 0}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Sección 2 · Tabla de miembros con dropdown departamento ─── */}
      <section className="space-y-3">
        <header className="flex items-center gap-2">
          <Users className="size-4 text-[var(--color-muted-foreground)]" />
          <h2 className="font-display text-xl tracking-tight">Miembros</h2>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {members.length} en la liga
          </span>
        </header>
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          {members.map((m) => (
            <MemberRow
              key={m.userId}
              leagueId={leagueId}
              member={m}
              departments={departments}
              onChange={() => router.refresh()}
            />
          ))}
        </div>
        {departments.length === 0 ? (
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Crea al menos un departamento para empezar a asignar miembros.
          </p>
        ) : null}
      </section>

      {/* Dialog de editar (nombre + emoji + color) */}
      {editDept ? (
        <EditDepartmentDialog
          dept={editDept}
          onClose={() => setEditDept(null)}
        />
      ) : null}
    </div>
  );
}

function MemberRow({
  leagueId,
  member,
  departments,
  onChange,
}: {
  leagueId: number;
  member: Member;
  departments: Department[];
  onChange: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const display = member.nickname || member.email.split("@")[0];

  const onValueChange = (next: string) => {
    const fd = new FormData();
    fd.append("leagueId", String(leagueId));
    fd.append("userId", member.userId);
    fd.append("deptId", next === NO_DEPT ? "" : next);
    startTransition(async () => {
      await assignMemberToDepartment(fd);
      onChange();
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-8 border border-[var(--color-border)]">
          {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-[0.65rem]">{initials(display)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{display}</p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">{member.email}</p>
        </div>
      </div>
      <Select
        value={member.departmentId ? String(member.departmentId) : NO_DEPT}
        onValueChange={onValueChange}
        disabled={pending || departments.length === 0}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Sin asignar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_DEPT}>
            <span className="text-[var(--color-muted-foreground)]">Sin asignar</span>
          </SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={String(d.id)}>
              {d.emoji ? `${d.emoji} ` : ""}
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CreateDepartmentDialog({
  leagueId,
  onClose,
}: {
  leagueId: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Crear departamento</DialogTitle>
      </DialogHeader>
      <form
        action={(fd: FormData) => {
          setError(null);
          fd.append("leagueId", String(leagueId));
          startTransition(async () => {
            const res = await createDepartment({ ok: false }, fd);
            if (!res.ok) {
              setError(res.error ?? "Error al crear");
              return;
            }
            router.refresh();
            onClose();
          });
        }}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="dept-name">Nombre</Label>
          <Input id="dept-name" name="name" placeholder="Marketing" required maxLength={40} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dept-emoji">Emoji (opcional)</Label>
            <Input id="dept-emoji" name="emoji" placeholder="📊" maxLength={4} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-color">Color (opcional)</Label>
            <Input id="dept-color" name="color" type="color" defaultValue="#ef5043" />
          </div>
        </div>
        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Creando…" : "Crear"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditDepartmentDialog({
  dept,
  onClose,
}: {
  dept: Department;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Si la columna en DB es NULL, el color picker necesita un valor inicial
  // razonable. Usamos el arena por defecto pero el form solo persiste lo
  // que el user envíe — limpiar el campo lo restaura a NULL en la action.
  const initialColor = dept.color ?? "#ef5043";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar departamento</DialogTitle>
        </DialogHeader>
        <form
          action={(fd: FormData) => {
            setError(null);
            fd.append("deptId", String(dept.id));
            startTransition(async () => {
              const res = await updateDepartment({ ok: false }, fd);
              if (!res.ok) {
                setError(res.error ?? "Error");
                return;
              }
              router.refresh();
              onClose();
            });
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">Nombre</Label>
            <Input
              id="dept-name"
              name="name"
              defaultValue={dept.name}
              required
              maxLength={40}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dept-emoji">Emoji</Label>
              <Input
                id="dept-emoji"
                name="emoji"
                defaultValue={dept.emoji ?? ""}
                placeholder="📊"
                maxLength={4}
              />
              <p className="font-editorial text-[0.65rem] italic text-[var(--color-muted-foreground)]">
                Déjalo vacío para quitarlo.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-color">Color</Label>
              <Input
                id="dept-color"
                name="color"
                type="color"
                defaultValue={initialColor}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDeptButton({ deptId, name }: { deptId: number; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const onClick = () => {
    if (!confirm(`¿Borrar "${name}"? Los miembros quedarán sin departamento.`)) return;
    const fd = new FormData();
    fd.append("deptId", String(deptId));
    startTransition(async () => {
      await deleteDepartment(fd);
      router.refresh();
    });
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
      disabled={pending}
      onClick={onClick}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
