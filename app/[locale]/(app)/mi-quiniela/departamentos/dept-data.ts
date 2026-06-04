import type { DepartmentRankingEntry } from "@/lib/leaderboard";

/**
 * Tipos + builder de las cards de departamento. Módulo NEUTRO (sin
 * "use client") para que tanto el manager (cliente, página de admin) como
 * /mi-quiniela (server component, tab del miembro) puedan construir las
 * mismas cards sin duplicar la lógica.
 */

export type DeptBasic = {
  id: number;
  name: string;
  emoji: string | null;
  color: string | null;
};

export type DeptCardMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  points: number;
};

export type DeptCardData = DeptBasic & {
  avgPoints: number;
  totalPoints: number;
  activeMembers: number;
  totalMembers: number;
  /** Miembros del dept ordenados por puntos desc. */
  members: DeptCardMember[];
};

export type MemberRowData = {
  userId: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  departmentId: number | null;
  /** ISO string — para ordenar; se formatea en cliente. */
  joinedAt: string;
  points: number;
};

export function buildDeptCards(
  departments: DeptBasic[],
  rankings: DepartmentRankingEntry[],
  members: MemberRowData[],
): DeptCardData[] {
  const byDept = new Map(rankings.map((r) => [r.departmentId, r]));
  return departments.map((d) => {
    const r = byDept.get(d.id);
    const deptMembers = members
      .filter((m) => m.departmentId === d.id)
      .map((m) => ({
        userId: m.userId,
        name: m.nickname || m.email.split("@")[0],
        avatarUrl: m.avatarUrl,
        points: m.points,
      }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
    return {
      id: d.id,
      name: d.name,
      emoji: d.emoji,
      color: d.color,
      avgPoints: r?.avgPoints ?? 0,
      totalPoints: r?.totalPoints ?? 0,
      activeMembers: r?.activeMembers ?? 0,
      totalMembers: deptMembers.length,
      members: deptMembers,
    };
  });
}
