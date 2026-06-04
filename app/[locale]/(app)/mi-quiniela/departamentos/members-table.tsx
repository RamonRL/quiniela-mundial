"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initials } from "@/lib/utils";
import { assignMemberToDepartment } from "./actions";

import type { MemberRowData } from "./dept-data";

export type { MemberRowData } from "./dept-data";

const NO_DEPT = "__none__";
const PAGE_SIZE = 10;

type Dept = { id: number; name: string; emoji: string | null };

type SortKey = "name" | "joined" | "points";

/**
 * Tab "Miembros" del panel de departamentos: tabla con búsqueda por
 * nombre/correo, orden por columnas (default: incorporación desc — los nuevos
 * primero), paginación, y cambio manual de departamento por fila.
 */
export function MembersTable({
  leagueId,
  members,
  departments,
}: {
  leagueId: number;
  members: MemberRowData[];
  departments: Dept[];
}) {
  const t = useTranslations("departments");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? members.filter(
          (m) =>
            (m.nickname ?? "").toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q),
        )
      : members;
    const sorted = [...base].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = (a.nickname ?? a.email).localeCompare(b.nickname ?? b.email);
      } else if (sortKey === "points") {
        cmp = a.points - b.points;
      } else {
        cmp = a.joinedAt.localeCompare(b.joinedAt);
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [members, query, sortKey, dir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDir(key === "name" ? "asc" : "desc");
    }
    setPage(1);
  }

  function SortHeader({ k, label, className }: { k: SortKey; label: string; className?: string }) {
    const active = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] transition ${
          active
            ? "text-[var(--color-arena)]"
            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        } ${className ?? ""}`}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-50" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {/* Cabecera de columnas */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <SortHeader k="name" label={t("thMember")} />
          </div>
          <div className="hidden w-24 sm:block">
            <SortHeader k="joined" label={t("thJoined")} />
          </div>
          <div className="w-12 text-right">
            <SortHeader k="points" label={t("thPts")} />
          </div>
          <div className="w-44 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {t("thDept")}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-6 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("noResults")}
          </p>
        ) : (
          items.map((m) => (
            <MemberRow
              key={m.userId}
              leagueId={leagueId}
              member={m}
              departments={departments}
            />
          ))
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="size-4" />
            {t("prev")}
          </Button>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
            {t("pageOf", { page: safePage, total: totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("next")}
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function MemberRow({
  leagueId,
  member,
  departments,
}: {
  leagueId: number;
  member: MemberRowData;
  departments: Dept[];
}) {
  const t = useTranslations("departments");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const display = member.nickname || member.email.split("@")[0];
  const joined = new Date(member.joinedAt).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });

  const onValueChange = (next: string) => {
    const fd = new FormData();
    fd.append("leagueId", String(leagueId));
    fd.append("userId", member.userId);
    fd.append("deptId", next === NO_DEPT ? "" : next);
    startTransition(async () => {
      await assignMemberToDepartment(fd);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-2.5 last:border-b-0">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="size-8 border border-[var(--color-border)]">
          {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-[0.65rem]">{initials(display)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{display}</p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {member.email}
          </p>
        </div>
      </div>
      <div className="hidden w-24 text-xs text-[var(--color-muted-foreground)] sm:block">
        {joined}
      </div>
      <div className="w-12 text-right font-display tabular text-base">{member.points}</div>
      <Select
        value={member.departmentId ? String(member.departmentId) : NO_DEPT}
        onValueChange={onValueChange}
        disabled={pending || departments.length === 0}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t("unassigned")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_DEPT}>
            <span className="text-[var(--color-muted-foreground)]">{t("unassigned")}</span>
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
