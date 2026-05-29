"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List as ListIcon,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { DeleteButton } from "@/components/admin/delete-button";
import { formatDateTime, initials, cn } from "@/lib/utils";
import { deleteLeague } from "@/lib/league-actions";
import { InviteLinkCopy } from "./invite-link-copy";

export type PreviewMember = {
  id: string;
  nickname: string | null;
  email: string;
  avatarUrl: string | null;
};

export type LeagueRow = {
  id: number;
  slug: string;
  name: string;
  inviteToken: string;
  joinCode: string | null;
  isPublic: boolean;
  logoUrl: string | null;
  tier: string;
  memberLimit: number | null;
  /** ISO string */
  createdAt: string;
  creator: { nickname: string | null; email: string } | null;
  members: number;
  previewMembers: PreviewMember[];
};

type Mode = "cards" | "list";
const PAGE_SIZES = [10, 25, 50] as const;
type PageSize = (typeof PAGE_SIZES)[number];

export function LeaguesView({ leagues }: { leagues: LeagueRow[] }) {
  const [mode, setMode] = useState<Mode>("cards");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);

  // La pública siempre va primero, fuera de la paginación. El resto se
  // pagina por createdAt desc (ya viene ordenado del server: más recientes
  // arriba).
  const publicLeague = useMemo(() => leagues.find((l) => l.isPublic) ?? null, [leagues]);
  const privateLeagues = useMemo(() => leagues.filter((l) => !l.isPublic), [leagues]);

  const totalPages = Math.max(1, Math.ceil(privateLeagues.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pagedPrivate = privateLeagues.slice(start, start + pageSize);
  const visible = publicLeague ? [publicLeague, ...pagedPrivate] : pagedPrivate;

  const onPageSize = (v: string) => {
    setPageSize(Number(v) as PageSize);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* ─── Toolbar: toggle de vista + paginación ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5">
          <ModeButton
            active={mode === "cards"}
            onClick={() => setMode("cards")}
            icon={<LayoutGrid className="size-3.5" />}
            label="Cuadros"
          />
          <ModeButton
            active={mode === "list"}
            onClick={() => setMode("list")}
            icon={<ListIcon className="size-3.5" />}
            label="Lista"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Por página
            </span>
            <Select value={String(pageSize)} onValueChange={onPageSize}>
              <SelectTrigger className="h-8 w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ClientPagination
            currentPage={safePage}
            totalPages={totalPages}
            onChange={setPage}
          />

          <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {privateLeagues.length} privadas · 1 pública
          </span>
        </div>
      </div>

      {/* ─── Vista activa ─── */}
      {mode === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((l) => (
            <LeagueCard key={l.id} league={l} />
          ))}
        </div>
      ) : (
        <LeagueListTable leagues={visible} />
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] transition",
        active
          ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ──────────────────────── Tier badge ────────────────────────

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  "team-50": "Pase 50",
  "team-100": "Pase 100",
  "team-250": "Pase 250",
};

function TierBadge({ tier, isPublic }: { tier: string; isPublic: boolean }) {
  if (isPublic) return null;
  const label = TIER_LABEL[tier] ?? tier;
  const isPaid = tier !== "free";
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[0.55rem]",
        isPaid &&
          "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_10%,transparent)] text-[var(--color-arena)]",
      )}
    >
      {label}
    </Badge>
  );
}

// ──────────────────────── Logo + avatares ────────────────────────

function LeagueLogo({
  logoUrl,
  name,
  size = 44,
  isPublic = false,
}: {
  logoUrl: string | null;
  name: string;
  size?: number;
  isPublic?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-lg border",
        isPublic
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_8%,var(--color-surface))]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)]",
      )}
      style={{ width: size, height: size }}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        <span
          className={cn(
            "font-display tabular tracking-tight",
            isPublic ? "text-[var(--color-arena)]" : "text-[var(--color-muted-foreground)]",
          )}
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}

function MemberStack({
  members,
  totalCount,
}: {
  members: PreviewMember[];
  totalCount: number;
}) {
  if (members.length === 0) {
    return (
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        Sin miembros aún
      </p>
    );
  }
  const extra = Math.max(0, totalCount - members.length);
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {members.map((m) => {
          const display = m.nickname || m.email.split("@")[0];
          return (
            <Avatar
              key={m.id}
              className="size-7 border-2 border-[var(--color-surface)]"
              title={display}
            >
              {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt="" /> : null}
              <AvatarFallback className="text-[0.55rem]">{initials(display)}</AvatarFallback>
            </Avatar>
          );
        })}
        {extra > 0 ? (
          <span className="grid size-7 place-items-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-surface-2)] font-mono text-[0.55rem] font-semibold text-[var(--color-muted-foreground)]">
            +{extra}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ──────────────────────── Vista cuadros ────────────────────────

function LeagueCard({ league }: { league: LeagueRow }) {
  return (
    <article
      className={cn(
        "rounded-xl border bg-[var(--color-surface)] p-5",
        league.isPublic
          ? "border-[var(--color-arena)]/40 bg-[color-mix(in_oklch,var(--color-arena)_4%,var(--color-surface))]"
          : "border-[var(--color-border)]",
      )}
    >
      <header className="flex items-start gap-3 pb-3">
        <LeagueLogo
          logoUrl={league.logoUrl}
          name={league.name}
          isPublic={league.isPublic}
          size={48}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {league.isPublic ? (
              <Badge variant="success" className="text-[0.55rem]">
                Pública
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[0.55rem]">
                Privada
              </Badge>
            )}
            <TierBadge tier={league.tier} isPublic={league.isPublic} />
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {league.slug}
            </span>
            {league.joinCode ? (
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
                · {league.joinCode}
              </span>
            ) : null}
          </div>
          <h2 className="truncate font-display text-2xl tracking-tight">{league.name}</h2>
        </div>
        {league.isPublic ? null : (
          <DeleteButton
            action={deleteLeague}
            id={league.id}
            confirmMessage={`¿Eliminar "${league.name}"? Sus ${league.members} miembros se moverán a la liga principal.`}
          />
        )}
      </header>

      <div className="space-y-3 border-t border-[var(--color-border)] pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            <Users className="size-3.5" />
            {league.memberLimit != null
              ? `${league.members} / ${league.memberLimit}`
              : `${league.members} miembros`}
          </span>
          <MemberStack members={league.previewMembers} totalCount={league.members} />
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-muted-foreground)]">
          <span>
            Creada{" "}
            {formatDateTime(new Date(league.createdAt), { day: "2-digit", month: "short" })}
          </span>
          {league.creator ? (
            <span className="truncate">
              por {league.creator.nickname || league.creator.email.split("@")[0]}
            </span>
          ) : null}
        </div>
        {!league.isPublic ? <InviteLinkCopy token={league.inviteToken} /> : null}
        <Link
          href={`/admin/ligas/${league.id}`}
          className="mt-1 flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs font-medium transition hover:border-[var(--color-arena)]/40"
        >
          Gestionar miembros
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}

// ──────────────────────── Vista lista ────────────────────────

function LeagueListTable({ leagues }: { leagues: LeagueRow[] }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="w-24">Tipo</TableHead>
            <TableHead className="w-24">Plan</TableHead>
            <TableHead className="w-24">Código</TableHead>
            <TableHead>Creador</TableHead>
            <TableHead className="w-24 text-right">Miembros</TableHead>
            <TableHead className="w-16 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leagues.map((l) => (
            <TableRow
              key={l.id}
              className={cn(
                l.isPublic
                  ? "bg-[color-mix(in_oklch,var(--color-arena)_4%,transparent)]"
                  : undefined,
              )}
            >
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <LeagueLogo
                    logoUrl={l.logoUrl}
                    name={l.name}
                    isPublic={l.isPublic}
                    size={32}
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/admin/ligas/${l.id}`}
                      className="group inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:text-[var(--color-arena)] hover:underline"
                    >
                      {l.name}
                      <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                    <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {l.slug}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {l.isPublic ? (
                  <Badge variant="success" className="text-[0.55rem]">
                    Pública
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[0.55rem]">
                    Privada
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <TierBadge tier={l.tier} isPublic={l.isPublic} />
              </TableCell>
              <TableCell>
                {l.joinCode ? (
                  <span className="font-mono tabular text-sm text-[var(--color-arena)]">
                    {l.joinCode}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {l.creator ? (
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {l.creator.nickname || l.creator.email.split("@")[0]}
                    </p>
                    <p className="truncate font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {l.creator.email}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    Sistema
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right font-display tabular text-base">
                {l.memberLimit != null ? `${l.members} / ${l.memberLimit}` : l.members}
              </TableCell>
              <TableCell className="text-right">
                {l.isPublic ? null : (
                  <DeleteButton
                    action={deleteLeague}
                    id={l.id}
                    confirmMessage={`¿Eliminar "${l.name}"? Sus ${l.members} miembros se moverán a la liga principal.`}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ──────────────────────── Paginación cliente (saltos directos) ────────────────────────

/**
 * Misma estética que `components/admin/pagination.tsx` (usado en /admin/usuarios)
 * pero client-side, para encajar con el estado de modo/pageSize que vive aquí.
 * Botones de primera/anterior · números con elipsis · siguiente/última.
 */
function ClientPagination({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = pageWindow(currentPage, totalPages);
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  return (
    <div className="flex items-center gap-1">
      <PageButton onClick={() => onChange(1)} disabled={isFirst} aria-label="Primera página">
        <ChevronsLeft className="size-3.5" />
      </PageButton>
      <PageButton
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={isFirst}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-3.5" />
      </PageButton>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span
            key={`gap-${idx}`}
            className="px-1 font-mono text-[0.6rem] text-[var(--color-muted-foreground)]"
          >
            …
          </span>
        ) : (
          <PageButton
            key={p}
            onClick={() => onChange(p)}
            active={p === currentPage}
            aria-label={`Página ${p}`}
            aria-current={p === currentPage ? "page" : undefined}
          >
            <span className="px-0.5 font-mono tabular text-xs">{p}</span>
          </PageButton>
        ),
      )}
      <PageButton
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={isLast}
        aria-label="Página siguiente"
      >
        <ChevronRight className="size-3.5" />
      </PageButton>
      <PageButton onClick={() => onChange(totalPages)} disabled={isLast} aria-label="Última página">
        <ChevronsRight className="size-3.5" />
      </PageButton>
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  active,
  children,
  ...aria
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
} & React.AriaAttributes) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-1.5 transition",
        active
          ? "border-[var(--color-arena)] bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
          : disabled
            ? "border-[var(--color-border)] text-[var(--color-muted-foreground)]/50 opacity-50"
            : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:border-[var(--color-arena)]/50 hover:bg-[var(--color-surface-2)]",
      )}
      {...aria}
    >
      {children}
    </button>
  );
}

/**
 * Ventana de páginas con elipsis (idéntica a la del Pagination server).
 *   total ≤ 7  → todas.
 *   total > 7  → 1, ±2 vecinas, total — con `...` en los huecos.
 */
function pageWindow(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "...")[] = [];
  const window = new Set<number>([1, total, current - 1, current, current + 1]);
  if (current <= 3) {
    window.add(2);
    window.add(3);
    window.add(4);
  }
  if (current >= total - 2) {
    window.add(total - 1);
    window.add(total - 2);
    window.add(total - 3);
  }
  const sorted = Array.from(window)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    out.push(sorted[i]);
    const next = sorted[i + 1];
    if (next != null && next - sorted[i] > 1) out.push("...");
  }
  return out;
}
